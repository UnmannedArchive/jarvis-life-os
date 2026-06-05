import { buildView, buildRollupText, findUnknownApps } from '../view';
import type { RawAggregate } from '../types';

const raw: RawAggregate = {
  date: '2026-06-04',
  totalSeconds: 3900,
  byApp: [
    { app: 'Cursor', seconds: 2700 },   // focus
    { app: 'YouTube', seconds: 1200 },  // distraction
  ],
  byHour: [
    { hour: 9, byApp: [{ app: 'Cursor', seconds: 2700 }] },
    { hour: 14, byApp: [{ app: 'YouTube', seconds: 1200 }] },
  ],
};

describe('buildView', () => {
  it('tallies category totals and a focus score', () => {
    const v = buildView(raw);
    expect(v.totals.focus).toBe(2700);
    expect(v.totals.distraction).toBe(1200);
    expect(v.focusScore).toBe(69); // 2700 / 3900 = 0.692 -> 69
  });

  it('tags each app row with its category', () => {
    const v = buildView(raw);
    expect(v.byApp.find((a) => a.app === 'Cursor')?.category).toBe('focus');
  });

  it('applies user overrides', () => {
    const v = buildView(raw, { youtube: 'focus' });
    expect(v.totals.focus).toBe(3900);
    expect(v.focusScore).toBe(100);
  });

  it('returns focusScore 0 when there is no activity', () => {
    const empty: RawAggregate = { date: '2026-06-04', totalSeconds: 0, byApp: [], byHour: [] };
    expect(buildView(empty).focusScore).toBe(0);
  });
});

describe('buildRollupText', () => {
  it('produces a compact text line naming apps and durations', () => {
    const text = buildRollupText(buildView(raw));
    expect(text).toContain('Cursor');
    expect(text).toContain('focus score 69%');
  });
});

describe('findUnknownApps', () => {
  it('returns apps not in defaults nor overrides', () => {
    const r: RawAggregate = { date: '2026-06-04', totalSeconds: 60, byApp: [{ app: 'Weird App', seconds: 60 }], byHour: [] };
    expect(findUnknownApps(r)).toEqual(['Weird App']);
  });

  it('excludes apps covered by an override', () => {
    const r: RawAggregate = { date: '2026-06-04', totalSeconds: 60, byApp: [{ app: 'Weird App', seconds: 60 }], byHour: [] };
    expect(findUnknownApps(r, { 'weird app': 'focus' })).toEqual([]);
  });
});
