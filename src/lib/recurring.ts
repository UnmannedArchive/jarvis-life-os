// ---------------------------------------------------------------------------
// recurring.ts — recurring task definitions + weekly schedule logic.
//
// A RecurringTask auto-populates the daily planner on the days it applies,
// so the user never retypes their standing routines (gym, journaling, etc.).
// Schedule is expressed as the set of weekdays it fires on; helpers translate
// common patterns ("every day except Sat", "weekdays") to/from that set.
// ---------------------------------------------------------------------------

export interface RecurringTask {
  id: string;
  name: string;
  /** Days of the week it applies to. 0 = Sunday … 6 = Saturday. */
  days: number[];
}

/** Full weekday labels, indexed 0 = Sun … 6 = Sat. */
export const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
/** Single-letter labels for compact day toggles (Sun-first). */
export const DOW_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export const EVERY_DAY: number[] = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS: number[] = [1, 2, 3, 4, 5];
export const WEEKENDS: number[] = [0, 6];

/** Does this recurring task fire on the given date? */
export function appliesOn(task: RecurringTask, date: Date): boolean {
  return task.days.includes(date.getDay());
}

/** Normalize a day list: unique, sorted Sun→Sat. */
export function normalizeDays(days: number[]): number[] {
  return Array.from(new Set(days)).filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
}

/**
 * Human-readable schedule summary, e.g. "Every day", "Weekdays",
 * "Every day except Sat", or "Mon, Wed, Fri".
 */
export function describeSchedule(days: number[]): string {
  const set = new Set(normalizeDays(days));
  if (set.size === 0) return 'Never';
  if (set.size === 7) return 'Every day';
  if (set.size === 5 && WEEKDAYS.every((d) => set.has(d))) return 'Weekdays';
  if (set.size === 2 && WEEKENDS.every((d) => set.has(d))) return 'Weekends';
  if (set.size === 6) {
    const missing = EVERY_DAY.find((d) => !set.has(d))!;
    return `Every day except ${DOW_LABELS[missing]}`;
  }
  return EVERY_DAY.filter((d) => set.has(d))
    .map((d) => DOW_LABELS[d])
    .join(', ');
}
