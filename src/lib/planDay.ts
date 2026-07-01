// ---------------------------------------------------------------------------
// planDay — turn a free-text "everything I want to do today" dump into an
// ordered, efficient sequence of tasks.
//
// Primary path: POST to /api/plan-day, which asks the model to parse + order.
// Fallback path: orderTasksHeuristic() runs fully client-side (no API key
// needed) by reusing planAI's task splitting + xpAI's effort estimates, then
// front-loading quick wins and grouping by pillar. This keeps the feature
// usable even when ANTHROPIC_API_KEY isn't configured.
// ---------------------------------------------------------------------------

import { classifyPlannedTasks } from './planAI';
import { PILLAR_CONFIG, Pillar, Difficulty } from './types';

export interface OrderedTask {
  task: string;
  reason: string;
}

/** Call the AI planner. Throws on any non-OK response so callers can fall back. */
export async function planDay(text: string): Promise<OrderedTask[]> {
  const res = await fetch('/api/plan-day', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`plan-day failed (${res.status}): ${body || res.statusText}`);
  }
  const data = (await res.json()) as { ordered?: OrderedTask[] };
  if (!data || !Array.isArray(data.ordered) || data.ordered.length === 0) {
    throw new Error('plan-day returned no tasks');
  }
  return data.ordered;
}

// ---------------------------------------------------------------------------
// Local (no-LLM) ordering — the backup when /api/plan-day is unavailable.
//
// It mirrors the same efficiency principles the AI is told to use: dependencies
// first, batch similar/errand work, front-load quick wins, and push low-energy
// admin to the tail. Each task is scored into a "slot" (lower = earlier); a
// stable sort keeps the user's own order within a slot, which naturally
// clusters batched work (e.g. all errands stay contiguous).
// ---------------------------------------------------------------------------

// Errand / location-based tasks — worth batching into one trip.
// Stems match prefixes (no trailing \b) so "grocer" catches "grocery/groceries".
const ERRAND_RE =
  /\b(grocer|store|shop|gym|bank|pharmac|post\s*office|pick\s*up|drop\s*off|errand|costco|target|dry\s*clean|laundr)/i;
// Low-energy admin — fine to leave for later when momentum dips.
const ADMIN_RE =
  /\b(email|e-mail|reply|respond|inbox|pay|invoice|bill|schedule|book|submit|file|text|message|call|rsvp|sign\s*up|renew|cancel)\b/i;
// Explicit time-of-day / sequencing cues the user typed.
const MORNING_RE = /\b(morning|first thing|asap|before anything|early|am)\b/i;
const LATER_RE = /\b(tonight|evening|end of day|later|after dinner|before bed|pm|wind down)\b/i;
const DEPENDS_BEFORE_RE = /\b(before|so i can|so that|in order to|prep|prepare for)\b/i;
const DEPENDS_AFTER_RE = /\b(after|once|following|then|when .* done)\b/i;

interface Slotted {
  title: string;
  pillar: Pillar;
  difficulty: Difficulty;
  index: number;
  slot: number;
  reason: string;
  errand: boolean;
}

/** Score a single task into a time slot (lower = earlier) with a reason. */
function scoreTask(
  title: string,
  pillar: Pillar,
  difficulty: Difficulty,
  index: number,
): Slotted {
  const text = title.toLowerCase();
  const errand = ERRAND_RE.test(text);
  const admin = ADMIN_RE.test(text);
  const deep = difficulty === 'HARD' || difficulty === 'LEGENDARY';
  const quick = difficulty === 'EASY' && !errand && !admin;
  const pillarLabel = PILLAR_CONFIG[pillar]?.label ?? pillar;

  // Base slot by kind of work.
  let slot: number;
  let reason: string;
  if (quick) {
    slot = 10;
    reason = 'Quick win to build momentum';
  } else if (errand) {
    slot = 30; // all errands share this slot → they cluster into one trip
    reason = 'Batch your errands into one trip';
  } else if (deep) {
    slot = 45;
    reason = `Deep-focus ${pillarLabel} block while you're fresh`;
  } else if (admin) {
    slot = 70;
    reason = 'Low-energy admin — save it for later';
  } else {
    slot = 55;
    reason = `Steady ${pillarLabel} work`;
  }

  // Nudge by explicit cues the user typed.
  if (MORNING_RE.test(text)) {
    slot -= 25;
    reason = 'You flagged this for the morning';
  } else if (LATER_RE.test(text)) {
    slot += 35;
    reason = 'You flagged this for later in the day';
  }
  // Dependency cues must dominate effort/energy — a blocker comes first even if
  // it's deep work, and a dependent task waits even if it's quick.
  if (DEPENDS_BEFORE_RE.test(text)) {
    slot -= 40;
    reason = 'Do this first — other tasks depend on it';
  } else if (DEPENDS_AFTER_RE.test(text)) {
    slot += 40;
    reason = 'Comes after the task it depends on';
  }

  return { title, pillar, difficulty, index, slot, reason, errand };
}

/**
 * Local, no-LLM ordering used when the AI endpoint is unavailable.
 * Returns tasks in an efficient sequence with a short reason for each.
 */
export function orderTasksHeuristic(text: string): OrderedTask[] {
  // The shared parser splits on newlines + "and/then" but not commas — yet the
  // planner's whole point is free-text like "gym, finish the deck, grocery run".
  // Normalize comma/semicolon/slash separators to newlines so each becomes a task.
  const normalized = text.replace(/\s*[,;]\s*|\s+\/\s+/g, '\n');
  const parsed = classifyPlannedTasks(normalized);
  if (parsed.length === 0) return [];

  const scored = parsed.map((t, i) => scoreTask(t.title, t.pillar, t.difficulty, i));

  // Stable sort by slot, then original order (keeps batched/errand work together).
  scored.sort((a, b) => a.slot - b.slot || a.index - b.index);

  // Refine errand reasons: only the first in a contiguous cluster says "batch",
  // the rest say "grouped with" so the list doesn't repeat itself.
  let prevWasErrand = false;
  return scored.map((s, position) => {
    let reason = s.reason;
    if (s.errand) {
      reason = prevWasErrand ? 'Grouped with your other errands' : 'Batch your errands into one trip';
    } else if (position === 0 && s.difficulty !== 'EASY') {
      reason = `Start with your ${PILLAR_CONFIG[s.pillar]?.label ?? s.pillar} focus`;
    }
    prevWasErrand = s.errand;
    return { task: s.title, reason };
  });
}
