import { buildWeeklyStats } from '../weeklyReview';
import type { WeeklyReviewInputs } from '../weeklyReview';

// Window: NOW is Wed 2026-07-01 local; the 7-day window is Jun 25 – Jul 1.
const NOW = new Date(2026, 6, 1, 12, 0, 0);

const emptyInputs: WeeklyReviewInputs = {
  checkinHistory: [],
  quests: [],
  xpHistory: [],
  focusSessions: [],
  journalEntries: [],
  ideas: [],
  daySignals: [],
};

function iso(y: number, m: number, d: number, h = 10): string {
  return new Date(y, m - 1, d, h).toISOString();
}

describe('buildWeeklyStats', () => {
  it('reports an empty week without dividing by zero', () => {
    const stats = buildWeeklyStats(emptyInputs, NOW);

    expect(stats.windowStart).toBe('2026-06-25');
    expect(stats.windowEnd).toBe('2026-07-01');
    expect(stats.checkins).toEqual({ count: 0, avgMood: null, avgEnergy: null, avgSleep: null });
    expect(stats.quests.completed).toBe(0);
    expect(stats.xp.total).toBe(0);
    expect(stats.whoop.avgRecovery).toBeNull();
  });

  it('averages check-ins inside the window and ignores older ones', () => {
    const stats = buildWeeklyStats(
      {
        ...emptyInputs,
        checkinHistory: [
          { date: '2026-06-30', sleep: 4, energy: 5, mood: 3 },
          { date: '2026-06-26', sleep: 2, energy: 3, mood: 5 },
          { date: '2026-06-10', sleep: 1, energy: 1, mood: 1 }, // outside window
        ],
      },
      NOW,
    );

    expect(stats.checkins.count).toBe(2);
    expect(stats.checkins.avgSleep).toBe(3);
    expect(stats.checkins.avgEnergy).toBe(4);
    expect(stats.checkins.avgMood).toBe(4);
  });

  it('counts completed quests in the window and finds the dominant pillar', () => {
    const quest = (completed_at: string | null, pillar: string) =>
      ({ completed: !!completed_at, completed_at, pillar, title: 't' }) as WeeklyReviewInputs['quests'][number];

    const stats = buildWeeklyStats(
      {
        ...emptyInputs,
        quests: [
          quest(iso(2026, 6, 29), 'work'),
          quest(iso(2026, 6, 30), 'work'),
          quest(iso(2026, 6, 30), 'body'),
          quest(iso(2026, 5, 1), 'mind'), // outside window
          quest(null, 'spirit'), // not completed
        ],
      },
      NOW,
    );

    expect(stats.quests.completed).toBe(3);
    expect(stats.quests.topPillar).toBe('work');
  });

  it('totals XP by day and finds the best day', () => {
    const stats = buildWeeklyStats(
      {
        ...emptyInputs,
        xpHistory: [
          { date: '2026-06-28', xp: 50, pillar: 'work' },
          { date: '2026-06-28', xp: 30, pillar: 'body' },
          { date: '2026-06-30', xp: 20, pillar: 'work' },
          { date: '2026-06-01', xp: 999, pillar: 'mind' }, // outside window
        ],
      },
      NOW,
    );

    expect(stats.xp.total).toBe(100);
    expect(stats.xp.bestDay).toEqual({ date: '2026-06-28', xp: 80 });
  });

  it('sums focus time and WHOOP signals inside the window', () => {
    const stats = buildWeeklyStats(
      {
        ...emptyInputs,
        focusSessions: [
          { startedAt: iso(2026, 6, 29), actualMinutes: 50, distractionCount: 2, completedAt: iso(2026, 6, 29, 11) },
          { startedAt: iso(2026, 6, 1), actualMinutes: 25, distractionCount: 0, completedAt: iso(2026, 6, 1, 11) }, // outside
        ],
        journalEntries: [{ date: iso(2026, 6, 27) }],
        ideas: [{ created_at: iso(2026, 6, 26) }, { created_at: iso(2026, 4, 1) }],
        daySignals: [
          { date: '2026-06-28', recovery: 80, strain: 15, load: 2 },
          { date: '2026-06-29', recovery: 60, strain: 14, load: 1 },
          { date: '2026-06-01', recovery: 10, strain: 5, load: 0 }, // outside window
        ],
      },
      NOW,
    );

    expect(stats.focus).toEqual({ sessions: 1, minutes: 50, distractions: 2 });
    expect(stats.journal.entries).toBe(1);
    expect(stats.ideas.captured).toBe(1);
    expect(stats.whoop.avgRecovery).toBe(70);
    expect(stats.whoop.peakDay).toBe('2026-06-28');
    expect(stats.whoop.highStrainDays).toBe(2);
  });
});
