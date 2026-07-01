import { format, subDays, startOfDay } from 'date-fns';

export const HEATMAP_WEEKS = 12;
export const HEATMAP_DAYS = HEATMAP_WEEKS * 7;

/**
 * Date key in local midnight (yyyy-MM-dd) for consistent matching with xpHistory.
 */
export function toDateKey(d: Date): string {
  return format(startOfDay(d), 'yyyy-MM-dd');
}

export interface HeatmapCell {
  date: string;
  dayOfWeek: number;
  label: string;
}

/**
 * Generates an array of heatmap cells from (today - HEATMAP_DAYS) through today.
 * Each date is normalized to midnight local time.
 * @param todayRef - Optional date to use as "today" (default: new Date()). Used for testing.
 */
export function buildHeatmapGrid(todayRef?: Date): HeatmapCell[] {
  const today = startOfDay(todayRef ?? new Date());
  const cells: HeatmapCell[] = [];
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const d = subDays(today, i);
    cells.push({
      date: toDateKey(d),
      dayOfWeek: d.getDay(),
      label: format(d, 'MMM d'),
    });
  }
  return cells;
}
