import { optimizeWeek, buildDaySignals, type DaySignal } from '../optimize';
import type { WhoopRecovery, WhoopCycle } from '../types';

function sig(date: string, recovery: number | null, strain: number | null, load = 0): DaySignal {
  return { date, recovery, strain, load };
}

describe('optimizeWeek', () => {
  it('returns empty result when there are no signals', () => {
    expect(optimizeWeek([])).toEqual({ peakDay: null, lowDay: null, recommendations: [] });
  });

  it('identifies the peak (highest recovery) and low (lowest recovery) days', () => {
    const r = optimizeWeek([
      sig('2026-06-15', 40, 10),
      sig('2026-06-16', 82, 12),
      sig('2026-06-17', 25, 8),
    ]);
    expect(r.peakDay?.date).toBe('2026-06-16');
    expect(r.lowDay?.date).toBe('2026-06-17');
  });

  it('recommends scheduling hard work on a clear green peak day', () => {
    const r = optimizeWeek([sig('2026-06-16', 82, 12), sig('2026-06-15', 55, 9)]);
    const peak = r.recommendations.find((x) => x.kind === 'peak');
    expect(peak).toBeTruthy();
    expect(peak!.date).toBe('2026-06-16');
    expect(peak!.text).toContain('82');
  });

  it('flags a mismatch when a loaded day lands on low recovery', () => {
    const r = optimizeWeek([sig('2026-06-15', 28, 9, 4), sig('2026-06-16', 70, 11, 1)]);
    const mismatch = r.recommendations.find((x) => x.kind === 'mismatch');
    expect(mismatch?.date).toBe('2026-06-15');
    expect(mismatch!.text.toLowerCase()).toMatch(/load|busy|protect|move/);
  });

  it('warns on a streak of consecutive high-strain days', () => {
    const r = optimizeWeek([
      sig('2026-06-15', 60, 16),
      sig('2026-06-16', 55, 15),
      sig('2026-06-17', 58, 14.5),
    ]);
    const strain = r.recommendations.find((x) => x.kind === 'strain');
    expect(strain).toBeTruthy();
    expect(strain!.text.toLowerCase()).toMatch(/strain|recovery day|rest/);
  });

  it('does not warn on a single high-strain day', () => {
    const r = optimizeWeek([sig('2026-06-15', 60, 16), sig('2026-06-16', 55, 8)]);
    expect(r.recommendations.find((x) => x.kind === 'strain')).toBeUndefined();
  });
});

describe('buildDaySignals', () => {
  const recovery: WhoopRecovery[] = [
    { cycleId: 1, sleepId: 's1', createdAt: '2026-06-16T12:00:00Z', recoveryScore: 80, restingHeartRate: 50, hrvMs: 90, spo2: null, skinTempCelsius: null },
    { cycleId: 2, sleepId: 's2', createdAt: '2026-06-15T12:00:00Z', recoveryScore: 40, restingHeartRate: 55, hrvMs: 60, spo2: null, skinTempCelsius: null },
  ];
  const cycles: WhoopCycle[] = [
    { id: 1, start: '2026-06-16T12:00:00Z', end: null, strain: 12, kilojoule: 0, averageHeartRate: 0, maxHeartRate: 0 },
  ];

  it('keys recovery + strain by local day and merges calendar load', () => {
    const signals = buildDaySignals(recovery, cycles, { '2026-06-16': 3 });
    const d16 = signals.find((s) => s.date === '2026-06-16');
    expect(d16).toMatchObject({ recovery: 80, strain: 12, load: 3 });
    const d15 = signals.find((s) => s.date === '2026-06-15');
    expect(d15).toMatchObject({ recovery: 40, load: 0 });
  });

  it('returns signals sorted by date ascending', () => {
    const signals = buildDaySignals(recovery, cycles, {});
    expect(signals.map((s) => s.date)).toEqual([...signals.map((s) => s.date)].sort());
  });
});
