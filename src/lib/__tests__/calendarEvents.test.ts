import {
  expandICalEvent,
  taskItems,
  goalItems,
  habitItems,
  bucketByDay,
  dateKey,
  CalendarItem,
} from '../calendarEvents';
import { ICalEvent } from '../icalParser';
import { Quest, Goal } from '../types';
import { RecurringTask } from '../recurring';

// June 2026: the 1st is a Monday.
const JUNE_START = new Date('2026-06-01T00:00:00');
const JUNE_END = new Date('2026-06-30T23:59:59');

function makeICal(overrides: Partial<ICalEvent>): ICalEvent {
  return {
    uid: 'u1',
    summary: 'Event',
    description: null,
    location: null,
    start: '2026-06-15T10:00:00',
    end: '2026-06-15T11:00:00',
    allDay: false,
    recurrence: null,
    status: null,
    organizer: null,
    created: null,
    exdates: [],
    ...overrides,
  };
}

function makeQuest(overrides: Partial<Quest>): Quest {
  return {
    id: 'q1',
    user_id: 'local',
    title: 'Task',
    description: null,
    pillar: 'work',
    difficulty: 'MED',
    xp_reward: 50,
    quest_type: 'side',
    is_recurring: false,
    recurrence_rule: null,
    due_date: '2026-06-15',
    completed: false,
    completed_at: null,
    created_at: '2026-06-01T00:00:00Z',
    sort_order: 0,
    ...overrides,
  };
}

describe('dateKey', () => {
  it('formats a date as YYYY-MM-DD in local time', () => {
    expect(dateKey(new Date('2026-06-05T23:30:00'))).toBe('2026-06-05');
  });
});

describe('expandICalEvent', () => {
  it('returns a single item for a non-recurring event in range', () => {
    const items = expandICalEvent(makeICal({}), JUNE_START, JUNE_END);
    expect(items).toHaveLength(1);
    expect(items[0].date).toBe('2026-06-15');
    expect(items[0].source).toBe('gcal');
    expect(items[0].title).toBe('Event');
    expect(items[0].allDay).toBe(false);
  });

  it('returns nothing for a non-recurring event outside the range', () => {
    const items = expandICalEvent(
      makeICal({ start: '2026-07-04T10:00:00', end: '2026-07-04T11:00:00' }),
      JUNE_START,
      JUNE_END
    );
    expect(items).toHaveLength(0);
  });

  it('expands FREQ=WEEKLY;BYDAY=MO,WE across June 2026', () => {
    const items = expandICalEvent(
      makeICal({
        start: '2026-06-01T10:00:00',
        end: '2026-06-01T11:00:00',
        recurrence: 'FREQ=WEEKLY;BYDAY=MO,WE',
      }),
      JUNE_START,
      JUNE_END
    );
    // Mondays: 1, 8, 15, 22, 29 — Wednesdays: 3, 10, 17, 24
    expect(items.map((i) => i.date)).toEqual([
      '2026-06-01', '2026-06-03', '2026-06-08', '2026-06-10',
      '2026-06-15', '2026-06-17', '2026-06-22', '2026-06-24', '2026-06-29',
    ]);
  });

  it('preserves event duration on each occurrence', () => {
    const items = expandICalEvent(
      makeICal({
        start: '2026-06-01T10:00:00',
        end: '2026-06-01T11:30:00',
        recurrence: 'FREQ=WEEKLY;BYDAY=MO',
      }),
      JUNE_START,
      JUNE_END
    );
    expect(items[1].start).toBe('2026-06-08T10:00:00');
    expect(items[1].end).toBe('2026-06-08T11:30:00');
  });

  it('respects COUNT', () => {
    const items = expandICalEvent(
      makeICal({
        start: '2026-06-01T10:00:00',
        recurrence: 'FREQ=WEEKLY;BYDAY=MO;COUNT=3',
      }),
      JUNE_START,
      JUNE_END
    );
    expect(items.map((i) => i.date)).toEqual(['2026-06-01', '2026-06-08', '2026-06-15']);
  });

  it('respects UNTIL', () => {
    const items = expandICalEvent(
      makeICal({
        start: '2026-06-01T10:00:00',
        recurrence: 'FREQ=WEEKLY;BYDAY=MO;UNTIL=20260615T000000Z',
      }),
      JUNE_START,
      JUNE_END
    );
    expect(items.map((i) => i.date)).toEqual(['2026-06-01', '2026-06-08']);
  });

  it('skips EXDATE occurrences', () => {
    const items = expandICalEvent(
      makeICal({
        start: '2026-06-01T18:00:00',
        end: '2026-06-01T19:00:00',
        recurrence: 'FREQ=WEEKLY;BYDAY=MO',
        exdates: ['2026-06-08T18:00:00'],
      }),
      JUNE_START,
      JUNE_END
    );
    expect(items.map((i) => i.date)).toEqual([
      '2026-06-01', '2026-06-15', '2026-06-22', '2026-06-29',
    ]);
  });

  it('expands a yearly all-day event (birthday)', () => {
    const items = expandICalEvent(
      makeICal({
        start: '2026-06-20',
        end: '2026-06-21',
        allDay: true,
        recurrence: 'FREQ=YEARLY',
      }),
      JUNE_START,
      JUNE_END
    );
    expect(items).toHaveLength(1);
    expect(items[0].date).toBe('2026-06-20');
    expect(items[0].allDay).toBe(true);
  });

  it('falls back to a single occurrence when the RRULE is unparseable', () => {
    const items = expandICalEvent(
      makeICal({ recurrence: 'FREQ=GIBBERISH;;;' }),
      JUNE_START,
      JUNE_END
    );
    expect(items).toHaveLength(1);
    expect(items[0].date).toBe('2026-06-15');
  });

  it('gives each occurrence a unique id', () => {
    const items = expandICalEvent(
      makeICal({ start: '2026-06-01T10:00:00', recurrence: 'FREQ=WEEKLY;BYDAY=MO' }),
      JUNE_START,
      JUNE_END
    );
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('taskItems', () => {
  it('maps quests with due dates in range', () => {
    const items = taskItems(
      [makeQuest({}), makeQuest({ id: 'q2', due_date: '2026-07-01' }), makeQuest({ id: 'q3', due_date: null })],
      JUNE_START,
      JUNE_END
    );
    expect(items).toHaveLength(1);
    expect(items[0].source).toBe('task');
    expect(items[0].date).toBe('2026-06-15');
    expect(items[0].refId).toBe('q1');
    expect(items[0].pillar).toBe('work');
    expect(items[0].allDay).toBe(true);
  });

  it('carries completion state', () => {
    const items = taskItems(
      [makeQuest({ completed: true, completed_at: '2026-06-15T12:00:00Z' })],
      JUNE_START,
      JUNE_END
    );
    expect(items[0].completed).toBe(true);
  });
});

describe('goalItems', () => {
  it('maps goals with target dates in range, skipping abandoned ones', () => {
    const goal: Goal = {
      id: 'g1', user_id: 'local', title: 'Ship portfolio', description: null,
      pillar: 'work', target_date: '2026-06-25', progress_pct: 40,
      status: 'active', xp_reward: 200, created_at: '2026-06-01T00:00:00Z',
    };
    const abandoned: Goal = { ...goal, id: 'g2', status: 'abandoned' };
    const items = goalItems([goal, abandoned], JUNE_START, JUNE_END);
    expect(items).toHaveLength(1);
    expect(items[0].source).toBe('goal');
    expect(items[0].date).toBe('2026-06-25');
  });
});

describe('habitItems', () => {
  it('places habits on their scheduled weekdays across the range', () => {
    const habit: RecurringTask = { id: 'h1', name: 'Gym', days: [1, 3, 5] }; // Mon/Wed/Fri
    const items = habitItems([habit], new Date('2026-06-01T00:00:00'), new Date('2026-06-07T23:59:59'));
    expect(items.map((i) => i.date)).toEqual(['2026-06-01', '2026-06-03', '2026-06-05']);
    expect(items[0].source).toBe('habit');
  });
});

describe('bucketByDay', () => {
  it('groups by date with all-day items first, then by start time', () => {
    const items: CalendarItem[] = [
      { id: '1', source: 'gcal', title: 'Late', date: '2026-06-15', start: '2026-06-15T15:00:00', end: '2026-06-15T16:00:00', allDay: false, refId: '1' },
      { id: '2', source: 'task', title: 'Due task', date: '2026-06-15', allDay: true, refId: '2' },
      { id: '3', source: 'gcal', title: 'Early', date: '2026-06-15', start: '2026-06-15T09:00:00', end: '2026-06-15T10:00:00', allDay: false, refId: '3' },
      { id: '4', source: 'gcal', title: 'Other day', date: '2026-06-16', start: '2026-06-16T09:00:00', end: '2026-06-16T10:00:00', allDay: false, refId: '4' },
    ];
    const buckets = bucketByDay(items);
    expect(Object.keys(buckets).sort()).toEqual(['2026-06-15', '2026-06-16']);
    expect(buckets['2026-06-15'].map((i) => i.title)).toEqual(['Due task', 'Early', 'Late']);
  });
});
