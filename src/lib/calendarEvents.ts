// ---------------------------------------------------------------------------
// calendarEvents.ts — unified calendar item model.
//
// Everything the calendar can show (Google/iCal events, task due dates, goal
// milestones, habit schedules) is normalized into CalendarItem and bucketed by
// local day. Recurring iCal events are expanded with the `rrule` package using
// wall-clock ("floating") times: occurrence math runs on raw date components,
// never through the machine timezone, so a 10am class is 10am regardless of
// DST. Single-occurrence moves (RECURRENCE-ID) are not honored — see the
// design doc.
// ---------------------------------------------------------------------------

import { RRule, datetime } from 'rrule';
import { format } from 'date-fns';
import { ICalEvent } from '@/lib/icalParser';
import { Quest, Goal, Pillar } from '@/lib/types';
import { RecurringTask, appliesOn } from '@/lib/recurring';

export type CalendarItemSource = 'gcal' | 'task' | 'goal' | 'habit';

export interface CalendarItem {
  /** Unique per rendered chip, e.g. `task:q1` or `gcal:uid:2026-06-08`. */
  id: string;
  source: CalendarItemSource;
  title: string;
  /** Local-day bucket key, YYYY-MM-DD. */
  date: string;
  /** ISO start/end for timed events only. */
  start?: string;
  end?: string;
  allDay: boolean;
  pillar?: Pillar;
  completed?: boolean;
  location?: string;
  /** Id of the underlying quest/goal/recurring task/iCal uid. */
  refId: string;
}

export function dateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

// --- iCal expansion ---------------------------------------------------------

interface WallClock {
  y: number; mo: number; d: number; h: number; mi: number; s: number;
  hasTime: boolean; utc: boolean;
}

/** Read date components straight from the ISO string — no TZ conversion. */
function parseWallClock(iso: string): WallClock | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2}))?(Z)?/);
  if (!m) return null;
  return {
    y: +m[1], mo: +m[2], d: +m[3],
    h: +(m[4] ?? 0), mi: +(m[5] ?? 0), s: +(m[6] ?? 0),
    hasTime: m[4] !== undefined, utc: m[7] === 'Z',
  };
}

function wallClockToISO(d: Date, hasTime: boolean, utc: boolean): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  if (!hasTime) return day;
  return `${day}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}${utc ? 'Z' : ''}`;
}

/** Bucket key for an item: all-day events keep their literal date; timed local
 *  ("floating") times keep theirs; only UTC-suffixed times go through Date. */
function bucketKeyForStart(iso: string, allDay: boolean): string {
  const wc = parseWallClock(iso);
  if (!wc) return iso.slice(0, 10);
  if (allDay || !wc.utc) return iso.slice(0, 10);
  return dateKey(new Date(iso));
}

function icalItem(ev: ICalEvent, start: string, end: string, idSuffix = ''): CalendarItem {
  return {
    id: `gcal:${ev.uid}${idSuffix}`,
    source: 'gcal',
    title: ev.summary,
    date: bucketKeyForStart(start, ev.allDay),
    start: ev.allDay ? undefined : start,
    end: ev.allDay ? undefined : end,
    allDay: ev.allDay,
    location: ev.location ?? undefined,
    refId: ev.uid,
  };
}

/**
 * Expand one iCal event into concrete occurrences within [rangeStart, rangeEnd].
 * Non-recurring events yield zero or one item; recurring events one per
 * occurrence, minus EXDATEs. An unparseable RRULE degrades to the single
 * original occurrence rather than dropping the event.
 */
export function expandICalEvent(ev: ICalEvent, rangeStart: Date, rangeEnd: Date): CalendarItem[] {
  const startWC = parseWallClock(ev.start);
  if (!startWC) return [];

  const inRange = (key: string) =>
    key >= dateKey(rangeStart) && key <= dateKey(rangeEnd);

  const singleOccurrence = (): CalendarItem[] => {
    const key = bucketKeyForStart(ev.start, ev.allDay);
    return inRange(key) ? [icalItem(ev, ev.start, ev.end)] : [];
  };

  if (!ev.recurrence) return singleOccurrence();

  let rule: RRule;
  try {
    const opts = RRule.parseString(ev.recurrence);
    opts.dtstart = datetime(startWC.y, startWC.mo, startWC.d, startWC.h, startWC.mi, startWC.s);
    rule = new RRule(opts);
  } catch {
    return singleOccurrence();
  }

  const durationMs =
    (parseWallClock(ev.end) && ev.end >= ev.start)
      ? datetimeMs(parseWallClock(ev.end)!) - datetimeMs(startWC)
      : 0;

  const windowStart = datetime(
    rangeStart.getFullYear(), rangeStart.getMonth() + 1, rangeStart.getDate(), 0, 0, 0
  );
  const windowEnd = datetime(
    rangeEnd.getFullYear(), rangeEnd.getMonth() + 1, rangeEnd.getDate(), 23, 59, 59
  );

  const exdateSet = new Set(ev.exdates);
  const items: CalendarItem[] = [];
  for (const occ of rule.between(windowStart, windowEnd, true)) {
    const occStart = wallClockToISO(occ, startWC.hasTime, startWC.utc);
    if (exdateSet.has(occStart)) continue;
    const occEnd = durationMs
      ? wallClockToISO(new Date(occ.getTime() + durationMs), startWC.hasTime, startWC.utc)
      : occStart;
    items.push(icalItem(ev, occStart, occEnd, `:${occStart.slice(0, 10)}`));
  }
  return items;
}

function datetimeMs(wc: WallClock): number {
  return Date.UTC(wc.y, wc.mo - 1, wc.d, wc.h, wc.mi, wc.s);
}

// --- Life OS sources --------------------------------------------------------

export function taskItems(quests: Quest[], rangeStart: Date, rangeEnd: Date): CalendarItem[] {
  const lo = dateKey(rangeStart);
  const hi = dateKey(rangeEnd);
  return quests
    .filter((q) => q.due_date && q.due_date >= lo && q.due_date <= hi)
    .map((q) => ({
      id: `task:${q.id}`,
      source: 'task' as const,
      title: q.title,
      date: q.due_date!,
      allDay: true,
      pillar: q.pillar,
      completed: q.completed,
      refId: q.id,
    }));
}

export function goalItems(goals: Goal[], rangeStart: Date, rangeEnd: Date): CalendarItem[] {
  const lo = dateKey(rangeStart);
  const hi = dateKey(rangeEnd);
  return goals
    .filter((g) => g.status !== 'abandoned' && g.target_date && g.target_date >= lo && g.target_date <= hi)
    .map((g) => ({
      id: `goal:${g.id}`,
      source: 'goal' as const,
      title: g.title,
      date: g.target_date!,
      allDay: true,
      pillar: g.pillar,
      completed: g.status === 'completed',
      refId: g.id,
    }));
}

export function habitItems(habits: RecurringTask[], rangeStart: Date, rangeEnd: Date): CalendarItem[] {
  const items: CalendarItem[] = [];
  const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
  while (cursor <= rangeEnd) {
    for (const habit of habits) {
      if (appliesOn(habit, cursor)) {
        const key = dateKey(cursor);
        items.push({
          id: `habit:${habit.id}:${key}`,
          source: 'habit',
          title: habit.name,
          date: key,
          allDay: true,
          refId: habit.id,
        });
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return items;
}

// --- Bucketing ---------------------------------------------------------------

/** Group items by day; within a day all-day items come first, then by start. */
export function bucketByDay(items: CalendarItem[]): Record<string, CalendarItem[]> {
  const buckets: Record<string, CalendarItem[]> = {};
  for (const item of items) {
    (buckets[item.date] ??= []).push(item);
  }
  for (const key of Object.keys(buckets)) {
    buckets[key].sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return (a.start ?? '').localeCompare(b.start ?? '');
    });
  }
  return buckets;
}
