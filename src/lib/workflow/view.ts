import type {
  RawAggregate, WorkflowView, WorkflowCategory,
  CategoryTotals, HourCategorySeconds, AppRow,
} from './types';
import { classifyApp, DEFAULT_CATEGORIES } from './categories';

export function buildView(
  raw: RawAggregate,
  overrides: Record<string, WorkflowCategory> = {},
): WorkflowView {
  const totals: CategoryTotals = { focus: 0, neutral: 0, distraction: 0 };
  const byApp: AppRow[] = raw.byApp.map((a) => {
    const category = classifyApp(a.app, overrides);
    totals[category] += a.seconds;
    return { app: a.app, seconds: a.seconds, category };
  });

  const byHour: HourCategorySeconds[] = raw.byHour.map((h) => {
    const row: HourCategorySeconds = { hour: h.hour, focus: 0, neutral: 0, distraction: 0 };
    for (const a of h.byApp) row[classifyApp(a.app, overrides)] += a.seconds;
    return row;
  });

  const active = totals.focus + totals.neutral + totals.distraction;
  const focusScore = active > 0 ? Math.round((totals.focus / active) * 100) : 0;

  return { date: raw.date, totals, focusScore, byHour, byApp };
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h${m}m` : `${m}m`;
}

/** Compact, text-only rollup we send to Gemini (never images). */
export function buildRollupText(view: WorkflowView): string {
  const apps = view.byApp.slice(0, 12)
    .map((a) => `${a.app} (${a.category}) ${fmtDuration(a.seconds)}`)
    .join('; ');
  const peak = [...view.byHour].sort((a, b) => b.focus - a.focus)[0];
  const peakStr = peak && peak.focus > 0 ? `peak focus hour ~${peak.hour}:00` : 'no clear focus block';
  return `Date ${view.date}. Focus ${fmtDuration(view.totals.focus)}, neutral ${fmtDuration(view.totals.neutral)}, `
    + `distraction ${fmtDuration(view.totals.distraction)}, focus score ${view.focusScore}%. ${peakStr}. Apps: ${apps}.`;
}

/** Apps with no known default and no user override — candidates for AI suggestion. */
export function findUnknownApps(
  raw: RawAggregate,
  overrides: Record<string, WorkflowCategory> = {},
): string[] {
  return raw.byApp
    .filter((a) => {
      const key = a.app.trim().toLowerCase();
      return !overrides[key] && !DEFAULT_CATEGORIES[key];
    })
    .map((a) => a.app);
}
