import { proposeCalendarBlocks, buildGoogleEvent, type EventProposal } from '../propose';
import type { OptimizationReport, DaySignal } from '@/lib/whoop/optimize';

function day(date: string, recovery: number): DaySignal {
  return { date, recovery, strain: null, load: 0 };
}

describe('buildGoogleEvent', () => {
  it('builds an all-day event whose end date is the next day (exclusive)', () => {
    const p: EventProposal = { date: '2026-06-18', title: 'Deep work block', description: 'x', kind: 'peak' };
    expect(buildGoogleEvent(p)).toEqual({
      summary: 'Deep work block',
      description: 'x',
      start: { date: '2026-06-18' },
      end: { date: '2026-06-19' },
    });
  });

  it('rolls the month over correctly', () => {
    const p: EventProposal = { date: '2026-06-30', title: 't', description: 'd', kind: 'recovery' };
    expect(buildGoogleEvent(p).end.date).toBe('2026-07-01');
  });
});

describe('proposeCalendarBlocks', () => {
  it('returns nothing for an empty report', () => {
    expect(proposeCalendarBlocks({ peakDay: null, lowDay: null, recommendations: [] })).toEqual([]);
  });

  it('proposes a deep-work block on the peak day', () => {
    const report: OptimizationReport = {
      peakDay: day('2026-06-18', 82),
      lowDay: day('2026-06-15', 55),
      recommendations: [{ kind: 'peak', date: '2026-06-18', text: '…' }],
    };
    const proposals = proposeCalendarBlocks(report);
    const peak = proposals.find((p) => p.kind === 'peak');
    expect(peak?.date).toBe('2026-06-18');
  });

  it('proposes a protect block on each recovery/load mismatch day', () => {
    const report: OptimizationReport = {
      peakDay: null,
      lowDay: null,
      recommendations: [{ kind: 'mismatch', date: '2026-06-16', text: '…' }],
    };
    const proposals = proposeCalendarBlocks(report);
    expect(proposals.find((p) => p.kind === 'protect')?.date).toBe('2026-06-16');
  });

  it('proposes a recovery block on the low day when rest/strain is flagged', () => {
    const report: OptimizationReport = {
      peakDay: day('2026-06-18', 60),
      lowDay: day('2026-06-16', 25),
      recommendations: [{ kind: 'rest', text: '…' }],
    };
    const proposals = proposeCalendarBlocks(report);
    expect(proposals.find((p) => p.kind === 'recovery')?.date).toBe('2026-06-16');
  });
});
