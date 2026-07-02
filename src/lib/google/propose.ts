// ---------------------------------------------------------------------------
// Turn WHOOP optimization recommendations into concrete calendar event
// proposals the user can one-click add to Google Calendar.
//   proposeCalendarBlocks — report → proposed all-day blocks.
//   buildGoogleEvent      — proposal → Google Calendar v3 all-day event body.
// ---------------------------------------------------------------------------

import type { OptimizationReport } from '@/lib/whoop/optimize';

export interface EventProposal {
  date: string; // YYYY-MM-DD
  title: string;
  description: string;
  kind: 'peak' | 'protect' | 'recovery';
}

export interface GoogleEventBody {
  summary: string;
  description: string;
  start: { date: string };
  end: { date: string };
}

/** YYYY-MM-DD one day later (UTC math avoids timezone drift). */
function nextDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

export function buildGoogleEvent(p: EventProposal): GoogleEventBody {
  return {
    summary: p.title,
    description: p.description,
    start: { date: p.date },
    end: { date: nextDay(p.date) },
  };
}

export function proposeCalendarBlocks(report: OptimizationReport): EventProposal[] {
  const proposals: EventProposal[] = [];

  const peak = report.recommendations.find((r) => r.kind === 'peak');
  if (peak?.date) {
    proposals.push({
      date: peak.date,
      title: 'Deep work block (peak recovery)',
      description: 'WHOOP flags this as your strongest recovery day — protect this time for your most demanding work.',
      kind: 'peak',
    });
  }

  for (const r of report.recommendations) {
    if (r.kind === 'mismatch' && r.date) {
      proposals.push({
        date: r.date,
        title: 'Protect energy — lighten load',
        description: 'Low recovery meets a heavy calendar today. Keep strain modest and move deep work if you can.',
        kind: 'protect',
      });
    }
  }

  const needsRecovery = report.recommendations.some((r) => r.kind === 'rest' || r.kind === 'strain');
  if (needsRecovery && report.lowDay) {
    proposals.push({
      date: report.lowDay.date,
      title: 'Recovery / rest',
      description: 'Recovery has been low — bank a genuine rest day: sleep, light movement, no heroics.',
      kind: 'recovery',
    });
  }

  return proposals;
}
