import type { Pillar, Difficulty, QuestType } from './types';
import { DIFFICULTY_CONFIG } from './types';
import { organizeIdea } from './ideasOrganizer';
import { parseCheckinFlags, encodeCheckinFlags } from './checkinFlags';
import type { useStore } from '@/stores/useStore';

export type RouteDecision =
  | {
      type: 'quest';
      questType: QuestType;
      pillar: Pillar;
      difficulty: Difficulty;
      title: string;
      description?: string;
      dueDate?: string;
    }
  | { type: 'idea'; raw: string }
  | { type: 'journal'; text: string; mood?: number }
  | { type: 'intention'; text: string }
  | {
      type: 'checkin_flag';
      drank?: boolean;
      smoked?: boolean;
      mood?: number;
      energy?: number;
      sleep?: number;
      note: string;
    }
  | { type: 'activity'; title: string; pillar?: Pillar; xp?: number };

export interface ClassifyResponse {
  decision: RouteDecision;
  confidence: number;
  rationale: string;
}

export interface DispatchResult {
  destination: string;
  undo: () => void;
}

type Store = ReturnType<typeof useStore.getState>;

const PILLAR_LABELS: Record<Pillar, string> = {
  mind: 'Mind',
  body: 'Body',
  work: 'Work',
  wealth: 'Wealth',
  spirit: 'Spirit',
  social: 'Social',
};

export async function routeInput(text: string): Promise<ClassifyResponse> {
  const res = await fetch('/api/classify-input', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`classify-input failed (${res.status}): ${body || res.statusText}`);
  }
  return (await res.json()) as ClassifyResponse;
}

// Local no-LLM degrade path, mirroring the classifier's own low-confidence
// behavior (<0.5 → idea). Used by SmartInbox when /api/classify-input fails,
// the same way TodayPlanner falls back to orderTasksHeuristic.
export function fallbackRouteDecision(text: string): ClassifyResponse {
  return {
    decision: { type: 'idea', raw: text },
    confidence: 0,
    rationale: 'AI offline — saved locally as an idea',
  };
}

export function dispatchRouteDecision(decision: RouteDecision, store: Store): DispatchResult {
  switch (decision.type) {
    case 'quest': {
      const xpReward = DIFFICULTY_CONFIG[decision.difficulty].xp;
      const before = store.quests.length;
      store.addQuest({
        title: decision.title,
        description: decision.description ?? null,
        pillar: decision.pillar,
        difficulty: decision.difficulty,
        xp_reward: xpReward,
        quest_type: decision.questType,
        is_recurring: false,
        recurrence_rule: null,
        due_date: decision.dueDate ?? null,
      });
      return {
        destination: `${decision.questType === 'daily' ? 'Daily' : decision.questType === 'side' ? 'Side' : 'Epic'} Quest · ${PILLAR_LABELS[decision.pillar]}`,
        undo: () => {
          const after = store.quests;
          const added = after[after.length - 1];
          if (added && store.quests.length > before) {
            store.deleteQuest(added.id);
          }
        },
      };
    }

    case 'idea': {
      const organized = organizeIdea(decision.raw);
      const id = crypto.randomUUID();
      store.addIdea({
        id,
        created_at: new Date().toISOString(),
        source: 'typed',
        ...organized,
      });
      return {
        destination: `Idea · ${organized.category}`,
        undo: () => store.deleteIdea(id),
      };
    }

    case 'journal': {
      const id = crypto.randomUUID();
      store.addJournalEntry({
        id,
        text: decision.text,
        date: new Date().toISOString(),
        analysis: null,
      });
      return {
        destination: 'Journal',
        undo: () => store.deleteJournalEntry(id),
      };
    }

    case 'intention': {
      const previous = store.dailyIntention;
      store.setDailyIntention(decision.text);
      return {
        destination: 'Today’s Focus',
        undo: () => store.setDailyIntention(previous ?? ''),
      };
    }

    case 'checkin_flag': {
      const previous = store.todayCheckin;
      const existingFlags = parseCheckinFlags(previous?.notes);
      const mergedFlags = {
        drank: decision.drank ?? existingFlags.drank,
        smoked: decision.smoked ?? existingFlags.smoked,
        m: existingFlags.m,
      };
      const sleep = decision.sleep ?? previous?.sleep_quality ?? 3;
      const energy = decision.energy ?? previous?.energy_level ?? 3;
      const mood = decision.mood ?? previous?.mood ?? 3;
      store.submitCheckin(sleep, energy, mood, encodeCheckinFlags(mergedFlags));
      return {
        destination: 'Daily Check-in',
        undo: () => {
          // Best-effort: restore the prior checkin (or null) without re-running side-effects.
          store.setTodayCheckin(previous);
        },
      };
    }

    case 'activity': {
      const xp = decision.xp ?? 0;
      const description = decision.pillar
        ? `${decision.title} // ${decision.pillar.toUpperCase()}${xp ? ` // +${xp} XP` : ''}`
        : `${decision.title}${xp ? ` // +${xp} XP` : ''}`;
      store.addLogEntry('activity', description, xp, decision.pillar);
      store.addActivity({
        type: 'xp_gain',
        title: decision.title,
        description: decision.pillar ? PILLAR_LABELS[decision.pillar] : null,
        xp,
        pillar: decision.pillar ?? null,
        metadata: { source: 'smart_inbox' },
      });
      return {
        destination: decision.pillar
          ? `Activity · ${PILLAR_LABELS[decision.pillar]}`
          : 'Activity Log',
        undo: () => {
          // Activity log is append-only; no clean undo. Surface a no-op so the UI affordance
          // still works for the other branches.
        },
      };
    }
  }
}
