// Weekly review aggregation: fuse the last 7 local days of check-ins, quests,
// XP, focus, journal/ideas, and WHOOP-by-day signals into one stats object.
// Pure + testable; the Gemini narrative on top lives in /api/weekly-review.

import { format, subDays } from 'date-fns';
import type { Pillar } from './types';
import type { DaySignal } from './whoop/optimize';

export interface WeeklyReviewInputs {
  checkinHistory: { date: string; sleep: number; energy: number; mood: number }[];
  quests: { completed: boolean; completed_at: string | null; pillar: Pillar | string; title: string }[];
  xpHistory: { date: string; xp: number; pillar: Pillar | string | null }[];
  focusSessions: { startedAt: string; actualMinutes: number; distractionCount: number; completedAt: string | null }[];
  journalEntries: { date: string }[];
  ideas: { created_at: string }[];
  daySignals: DaySignal[];
}

export interface WeeklyStats {
  windowStart: string; // yyyy-MM-dd, inclusive
  windowEnd: string;
  checkins: { count: number; avgMood: number | null; avgEnergy: number | null; avgSleep: number | null };
  quests: { completed: number; topPillar: string | null };
  xp: { total: number; bestDay: { date: string; xp: number } | null };
  focus: { sessions: number; minutes: number; distractions: number };
  journal: { entries: number };
  ideas: { captured: number };
  whoop: { avgRecovery: number | null; peakDay: string | null; highStrainDays: number };
}

const HIGH_STRAIN = 14; // matches optimizeWeek's threshold

const dayKey = (isoOrDate: string | Date): string => format(new Date(isoOrDate), 'yyyy-MM-dd');

export function buildWeeklyStats(inputs: WeeklyReviewInputs, now: Date): WeeklyStats {
  const windowStart = format(subDays(now, 6), 'yyyy-MM-dd');
  const windowEnd = format(now, 'yyyy-MM-dd');
  const inWindow = (key: string) => key >= windowStart && key <= windowEnd;

  // Check-ins (dates already local yyyy-MM-dd)
  const checkins = inputs.checkinHistory.filter((c) => inWindow(c.date));
  const avg = (xs: number[]) =>
    xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;

  // Completed quests
  const done = inputs.quests.filter((q) => q.completed_at && inWindow(dayKey(q.completed_at)));
  const byPillar = new Map<string, number>();
  for (const q of done) byPillar.set(String(q.pillar), (byPillar.get(String(q.pillar)) ?? 0) + 1);
  const topPillar = [...byPillar.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // XP by day
  const xpByDay = new Map<string, number>();
  let xpTotal = 0;
  for (const e of inputs.xpHistory) {
    if (!inWindow(e.date)) continue;
    xpTotal += e.xp;
    xpByDay.set(e.date, (xpByDay.get(e.date) ?? 0) + e.xp);
  }
  const bestDay = [...xpByDay.entries()].sort((a, b) => b[1] - a[1])[0];

  // Focus
  const focus = inputs.focusSessions.filter((s) => inWindow(dayKey(s.startedAt)));

  // WHOOP signals (already one per local day)
  const signals = inputs.daySignals.filter((s) => inWindow(s.date));
  const recoveries = signals.filter((s) => s.recovery !== null);
  const peak = recoveries.length
    ? recoveries.reduce((a, b) => (b.recovery! > a.recovery! ? b : a))
    : null;

  return {
    windowStart,
    windowEnd,
    checkins: {
      count: checkins.length,
      avgMood: avg(checkins.map((c) => c.mood)),
      avgEnergy: avg(checkins.map((c) => c.energy)),
      avgSleep: avg(checkins.map((c) => c.sleep)),
    },
    quests: { completed: done.length, topPillar },
    xp: { total: xpTotal, bestDay: bestDay ? { date: bestDay[0], xp: bestDay[1] } : null },
    focus: {
      sessions: focus.length,
      minutes: focus.reduce((a, s) => a + s.actualMinutes, 0),
      distractions: focus.reduce((a, s) => a + s.distractionCount, 0),
    },
    journal: { entries: inputs.journalEntries.filter((j) => inWindow(dayKey(j.date))).length },
    ideas: { captured: inputs.ideas.filter((i) => inWindow(dayKey(i.created_at))).length },
    whoop: {
      avgRecovery: recoveries.length
        ? Math.round(recoveries.reduce((a, s) => a + s.recovery!, 0) / recoveries.length)
        : null,
      peakDay: peak?.date ?? null,
      highStrainDays: signals.filter((s) => s.strain !== null && s.strain >= HIGH_STRAIN).length,
    },
  };
}
