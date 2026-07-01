// ---------------------------------------------------------------------------
// Pure WHOOP → game-system helpers.
//   whoopScoreToLevel — map a 0-100 WHOOP % onto the 1-5 check-in scale, so
//                       WHOOP sleep/recovery can pre-fill the Daily Check-In
//                       (which feeds the 10% wellbeing subscore of Performance).
//   recoveryInsight    — turn recovery into a Performance coach insight: green =
//                       push, chronic-low = protect (a signal, never a penalty).
// ---------------------------------------------------------------------------

import type { Insight } from '../performanceAI';

const GREEN = 67; // WHOOP recovery bands: green ≥67, yellow 34-66, red ≤33
const RED = 33;

/** Map a 0-100 score to a 1-5 level (even quintiles), clamped. */
export function whoopScoreToLevel(pct: number): number {
  return Math.min(5, Math.max(1, Math.ceil(pct / 20)));
}

/** WHOOP recovery band colour: green ≥67, yellow 34-66, red ≤33. */
export function recoveryColor(score: number): string {
  if (score >= GREEN) return '#34d399';
  if (score > RED) return '#fbbf24';
  return '#f87171';
}

/**
 * Coach insight from recovery. `recent` is the most-recent-first list of recent
 * recovery scores. Chronic low (3-day avg < 34) takes precedence over a single
 * green/low day. Returns null on a middling day to avoid noise.
 */
export function recoveryInsight(today: number | null, recent: number[]): Insight | null {
  if (today === null) return null;

  if (recent.length >= 3) {
    const avg = recent.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    if (avg < RED + 1) {
      return {
        type: 'tip',
        pillar: 'body',
        text: `Recovery's averaged ${Math.round(avg)}% over recent days — protect it: lighter load and a real night's rest. A signal, not a penalty.`,
      };
    }
  }

  if (today >= GREEN) {
    return {
      type: 'strength',
      pillar: 'body',
      text: `WHOOP recovery is green (${today}%). Your body can take a hard push — front-load your most demanding work today.`,
    };
  }

  if (today <= RED) {
    return {
      type: 'tip',
      pillar: 'body',
      text: `WHOOP recovery is low (${today}%) today. Keep strain modest and treat it as a recovery day.`,
    };
  }

  return null;
}
