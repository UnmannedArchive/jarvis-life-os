// ---------------------------------------------------------------------------
// WHOOP × calendar optimization engine.
//   buildDaySignals — map recovery (by day) + strain (by day) + calendar load
//                     into one DaySignal per local day, sorted ascending.
//   optimizeWeek    — turn the week of signals into actionable guidance: which
//                     day to push (peak recovery), where a heavy calendar lands
//                     on low recovery (mismatch), high-strain streaks, and
//                     chronic under-recovery. Pure + testable.
// ---------------------------------------------------------------------------

import type { WhoopRecovery, WhoopCycle } from './types';

export interface DaySignal {
  date: string; // YYYY-MM-DD (local)
  recovery: number | null;
  strain: number | null;
  load: number; // number of calendar items that day
}

export type RecommendationKind = 'peak' | 'mismatch' | 'strain' | 'rest';

export interface Recommendation {
  kind: RecommendationKind;
  text: string;
  date?: string;
}

export interface OptimizationReport {
  peakDay: DaySignal | null;
  lowDay: DaySignal | null;
  recommendations: Recommendation[];
}

// WHOOP recovery bands + thresholds.
const GREEN = 67;
const LOW_RECOVERY = 34;
const HIGH_STRAIN = 14;
const HIGH_LOAD = 3;

function toLocalDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Friendly weekday label, parsed as a local date (no UTC-midnight drift). */
function friendly(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long' });
}

export function buildDaySignals(
  recovery: WhoopRecovery[],
  cycles: WhoopCycle[],
  loadByDay: Record<string, number>,
): DaySignal[] {
  const byDay: Record<string, DaySignal> = {};
  const ensure = (date: string): DaySignal =>
    (byDay[date] ??= { date, recovery: null, strain: null, load: loadByDay[date] ?? 0 });

  // Records arrive most-recent-first, so the first one seen for a day wins.
  for (const r of recovery) {
    const s = ensure(toLocalDayKey(r.createdAt));
    if (s.recovery === null) s.recovery = r.recoveryScore;
  }
  for (const c of cycles) {
    const s = ensure(toLocalDayKey(c.start));
    if (s.strain === null) s.strain = c.strain;
  }
  for (const date of Object.keys(loadByDay)) ensure(date);

  return Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date));
}

export function optimizeWeek(signals: DaySignal[]): OptimizationReport {
  if (signals.length === 0) return { peakDay: null, lowDay: null, recommendations: [] };

  const withRec = signals.filter((s) => s.recovery !== null);
  const peakDay = withRec.length
    ? withRec.reduce((a, b) => (b.recovery! > a.recovery! ? b : a))
    : null;
  const lowDay = withRec.length
    ? withRec.reduce((a, b) => (b.recovery! < a.recovery! ? b : a))
    : null;

  const recommendations: Recommendation[] = [];

  if (peakDay && peakDay.recovery! >= GREEN) {
    recommendations.push({
      kind: 'peak',
      date: peakDay.date,
      text: `Your recovery peaks ${friendly(peakDay.date)} at ${peakDay.recovery}% — block your most demanding work then.`,
    });
  }

  for (const s of signals) {
    if (s.recovery !== null && s.recovery < LOW_RECOVERY && s.load >= HIGH_LOAD) {
      recommendations.push({
        kind: 'mismatch',
        date: s.date,
        text: `${friendly(s.date)} is busy (${s.load} items) but recovery is low (${s.recovery}%) — move deep work or protect your energy.`,
      });
    }
  }

  // Longest run of consecutive (date-sorted) high-strain days.
  let run = 0;
  let maxRun = 0;
  for (const s of signals) {
    if (s.strain !== null && s.strain >= HIGH_STRAIN) {
      run += 1;
      maxRun = Math.max(maxRun, run);
    } else {
      run = 0;
    }
  }
  if (maxRun >= 2) {
    recommendations.push({
      kind: 'strain',
      text: `You've logged high strain ${maxRun} days running — bank a recovery day before you dig a hole.`,
    });
  }

  if (withRec.length >= 3) {
    const avg = withRec.reduce((sum, s) => sum + s.recovery!, 0) / withRec.length;
    if (avg < LOW_RECOVERY) {
      recommendations.push({
        kind: 'rest',
        text: `Recovery has averaged ${Math.round(avg)}% this week — prioritize sleep and lighten the load.`,
      });
    }
  }

  return { peakDay, lowDay, recommendations };
}
