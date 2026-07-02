import { aggregateSessions } from '../aggregate';
import type { UsageSession } from '../types';

// Helper: build an ISO local timestamp for 2026-06-04 at h:m:s.
const at = (h: number, m: number, s = 0) =>
  new Date(2026, 5, 4, h, m, s).toISOString();

describe('aggregateSessions', () => {
  const sessions: UsageSession[] = [
    { app: 'Cursor', title: 'a.ts', start: at(9, 0), end: at(9, 30), seconds: 1800 },
    { app: 'Cursor', title: 'b.ts', start: at(9, 30), end: at(9, 45), seconds: 900 },
    { app: 'YouTube', title: 'vid', start: at(14, 0), end: at(14, 20), seconds: 1200 },
  ];

  it('sums seconds per app', () => {
    const agg = aggregateSessions(sessions, '2026-06-04');
    const cursor = agg.byApp.find((a) => a.app === 'Cursor');
    expect(cursor?.seconds).toBe(2700);
    expect(agg.totalSeconds).toBe(3900);
  });

  it('sorts apps by seconds descending', () => {
    const agg = aggregateSessions(sessions, '2026-06-04');
    expect(agg.byApp[0].app).toBe('Cursor');
  });

  it('buckets time into the correct local hours', () => {
    const agg = aggregateSessions(sessions, '2026-06-04');
    const nine = agg.byHour.find((h) => h.hour === 9);
    const two = agg.byHour.find((h) => h.hour === 14);
    expect(nine?.byApp.find((a) => a.app === 'Cursor')?.seconds).toBe(2700);
    expect(two?.byApp.find((a) => a.app === 'YouTube')?.seconds).toBe(1200);
  });

  it('splits a session that crosses an hour boundary', () => {
    const crossing: UsageSession[] = [
      { app: 'Cursor', title: 'x', start: at(9, 50), end: at(10, 10), seconds: 1200 },
    ];
    const agg = aggregateSessions(crossing, '2026-06-04');
    const nine = agg.byHour.find((h) => h.hour === 9)?.byApp[0].seconds ?? 0;
    const ten = agg.byHour.find((h) => h.hour === 10)?.byApp[0].seconds ?? 0;
    expect(nine).toBe(600);
    expect(ten).toBe(600);
  });

  it('ignores sessions on other dates', () => {
    const other: UsageSession[] = [
      { app: 'Cursor', title: 'x', start: new Date(2026, 5, 3, 9, 0).toISOString(), end: new Date(2026, 5, 3, 9, 10).toISOString(), seconds: 600 },
    ];
    expect(aggregateSessions(other, '2026-06-04').byApp).toHaveLength(0);
  });
});
