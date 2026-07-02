import type { UsageSession, RawAggregate, RawAppSeconds, RawHourBucket } from './types';

function localDateStr(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Aggregate sessions whose START falls on `date` into raw per-app and per-hour
 * seconds. Sessions crossing an hour boundary are split across hours.
 */
export function aggregateSessions(sessions: UsageSession[], date: string): RawAggregate {
  const appTotals = new Map<string, number>();
  const hourApp = new Map<number, Map<string, number>>();

  for (const s of sessions) {
    if (localDateStr(s.start) !== date) continue;
    const startMs = new Date(s.start).getTime();
    const endMs = new Date(s.end).getTime();
    if (!(endMs > startMs)) continue;

    let cursor = startMs;
    while (cursor < endMs) {
      const d = new Date(cursor);
      const hour = d.getHours();
      const hourEnd = new Date(d);
      hourEnd.setMinutes(60, 0, 0); // start of next hour
      const sliceEnd = Math.min(endMs, hourEnd.getTime());
      const secs = (sliceEnd - cursor) / 1000;

      appTotals.set(s.app, (appTotals.get(s.app) ?? 0) + secs);
      if (!hourApp.has(hour)) hourApp.set(hour, new Map());
      const m = hourApp.get(hour)!;
      m.set(s.app, (m.get(s.app) ?? 0) + secs);

      cursor = sliceEnd;
    }
  }

  const byApp: RawAppSeconds[] = [...appTotals.entries()]
    .map(([app, seconds]) => ({ app, seconds: Math.round(seconds) }))
    .sort((a, b) => b.seconds - a.seconds);

  const byHour: RawHourBucket[] = [...hourApp.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hour, m]) => ({
      hour,
      byApp: [...m.entries()]
        .map(([app, seconds]) => ({ app, seconds: Math.round(seconds) }))
        .sort((a, b) => b.seconds - a.seconds),
    }));

  const totalSeconds = byApp.reduce((acc, a) => acc + a.seconds, 0);
  return { date, totalSeconds, byApp, byHour };
}
