// ---------------------------------------------------------------------------
// planAI — turn free-form "what I want to do today" text into structured,
// classified tasks ready to be added as quests.
//
// Pure heuristics, no LLM. Pillar classification reuses the same keyword
// dictionary as focusAI; XP/difficulty estimation reuses xpAI.estimateXP.
// ---------------------------------------------------------------------------

import { Pillar, Difficulty, QuestType } from './types';
import { classifyTextPillar, parseIntention, scoreQuestRelevance } from './focusAI';
import { estimateXP } from './xpAI';

export interface PlannedTask {
  /** Stable id used by the UI for select/deselect. */
  id: string;
  /** Cleaned-up task title. */
  title: string;
  /** AI-suggested pillar; can be overridden by the user before saving. */
  pillar: Pillar;
  /** Confidence in the pillar guess (0-1). */
  pillarConfidence: number;
  difficulty: Difficulty;
  xp: number;
  /** XP estimate reasoning (e.g. "~30min effort"). */
  reasoning: string;
  /** Daily (recurring) vs side (one-time). */
  questType: QuestType;
  /** True when this task aligns with the user's stated daily intention. */
  alignedWithFocus: boolean;
  /** 0-1 alignment score (only meaningful when an intention is set). */
  focusRelevance: number;
}

// Recurring/daily intent triggers
const DAILY_PATTERNS = [
  /\b(every\s*day|everyday|daily|each\s*day)\b/i,
  /\b(always|routine|habit)\b/i,
  /\b(morning|evening|nightly)\s+(routine|habit|ritual)\b/i,
];

// Strip leading list markers, bullets, numbered prefixes, checkboxes.
const LIST_MARKER_RE = /^\s*(?:[-*•·▪◦●○■□]+|\d+[.)]?|\[[ xX]?\])\s*/;

// Inline separators that almost certainly split distinct tasks within one line.
// Matches " and ", " then ", " + ", " ; ", " | ", " also ".
// Only applied when the line is fairly long (otherwise "tea and toast" gets split).
const INLINE_SPLIT_RE = /\s+(?:and|then|plus|also|;|\||\+)\s+/i;

const PILLAR_FALLBACK: Pillar = 'work';

function cleanLine(raw: string): string {
  return raw.replace(LIST_MARKER_RE, '').trim();
}

function splitIntoCandidates(input: string): string[] {
  const lines = input
    .split(/\r?\n/)
    .map(cleanLine)
    .filter((l) => l.length > 0);

  const out: string[] = [];
  for (const line of lines) {
    // Long lines with inline conjunctions get split; short lines stay whole.
    if (line.length > 24 && INLINE_SPLIT_RE.test(line)) {
      const parts = line.split(INLINE_SPLIT_RE).map((p) => p.trim()).filter((p) => p.length >= 3);
      out.push(...parts);
    } else {
      out.push(line);
    }
  }
  // Dedupe (case-insensitive) while preserving order.
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of out) {
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

function detectQuestType(text: string): QuestType {
  for (const re of DAILY_PATTERNS) {
    if (re.test(text)) return 'daily';
  }
  return 'side';
}

/** Heuristic: is the text long/aspirational enough to be an "epic"? */
function isLikelyEpic(text: string, xp: number): boolean {
  const longHorizon = /\b(this\s+(?:week|month|quarter)|by\s+\w+|over\s+the\s+next|long[-\s]?term|goal)\b/i.test(text);
  return longHorizon && xp >= 200;
}

/**
 * Capitalize first letter, normalize trailing punctuation. We intentionally
 * keep the user's wording — over-rewriting feels patronizing.
 */
function prettifyTitle(text: string): string {
  let t = text.trim();
  if (t.length === 0) return t;
  // Drop trailing period; keep ! ? for tone.
  t = t.replace(/\.+$/, '');
  // Capitalize first character if it's lowercase.
  if (/^[a-z]/.test(t)) t = t[0].toUpperCase() + t.slice(1);
  return t;
}

export function classifyPlannedTasks(input: string, dailyIntention: string | null = null): PlannedTask[] {
  const candidates = splitIntoCandidates(input);
  if (candidates.length === 0) return [];

  const focusCtx = parseIntention(dailyIntention);
  const tasks: PlannedTask[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const raw = candidates[i];
    const title = prettifyTitle(raw);
    if (title.length < 2) continue;

    // 1. Pillar classification (with focus pillar as a soft prior).
    const { pillar: detectedPillar, confidence } = classifyTextPillar(title);
    let pillar: Pillar;
    let pillarConfidence: number;
    if (detectedPillar) {
      pillar = detectedPillar;
      pillarConfidence = confidence;
    } else if (focusCtx?.primaryPillar) {
      // No keyword match — assume it relates to the day's focus pillar.
      pillar = focusCtx.primaryPillar;
      pillarConfidence = 0.3;
    } else {
      pillar = PILLAR_FALLBACK;
      pillarConfidence = 0.1;
    }

    // 2. Quest type
    let questType = detectQuestType(title);

    // 3. XP / difficulty estimate
    const estimate = estimateXP(title, null, pillar, questType);

    // 4. Optional epic upgrade
    if (questType === 'side' && isLikelyEpic(title, estimate.xp)) {
      questType = 'epic';
    }

    // 5. Focus alignment
    const focusRelevance = focusCtx
      ? scoreQuestRelevance(
          {
            // Stub a quest-shaped object — only fields scoreQuestRelevance reads.
            id: '', user_id: '', title, description: null, pillar,
            difficulty: estimate.difficulty, xp_reward: estimate.xp,
            quest_type: questType, is_recurring: false, recurrence_rule: null,
            due_date: null, completed: false, completed_at: null,
            created_at: '', sort_order: 0,
          },
          focusCtx,
        )
      : 0;

    tasks.push({
      id: `plan-${i}-${title.slice(0, 12).replace(/\W+/g, '_')}`,
      title,
      pillar,
      pillarConfidence,
      difficulty: estimate.difficulty,
      xp: estimate.xp,
      reasoning: estimate.reasoning,
      questType,
      alignedWithFocus: focusRelevance >= 0.3,
      focusRelevance,
    });
  }

  return tasks;
}

/**
 * Re-estimate XP/difficulty for a task after the user manually changes the
 * pillar or quest_type so the numbers stay consistent with the override.
 */
export function reestimatePlannedTask(
  task: PlannedTask,
  override: { pillar?: Pillar; questType?: QuestType },
): PlannedTask {
  const pillar = override.pillar ?? task.pillar;
  const questType = override.questType ?? task.questType;
  const estimate = estimateXP(task.title, null, pillar, questType);
  return {
    ...task,
    pillar,
    questType,
    difficulty: estimate.difficulty,
    xp: estimate.xp,
    reasoning: estimate.reasoning,
  };
}
