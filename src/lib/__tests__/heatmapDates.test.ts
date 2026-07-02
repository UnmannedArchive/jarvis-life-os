import { buildHeatmapGrid, HEATMAP_DAYS, toDateKey } from '../heatmapDates';
import { format, subDays, startOfDay } from 'date-fns';

describe('heatmapDates', () => {
  describe('buildHeatmapGrid', () => {
    it('generates exactly HEATMAP_DAYS cells (84 for 12 weeks)', () => {
      const grid = buildHeatmapGrid();
      expect(grid).toHaveLength(HEATMAP_DAYS);
      expect(HEATMAP_DAYS).toBe(84);
    });

    it('uses 12 weeks (84 days) of cells', () => {
      const todayRef = new Date('2025-03-10T12:00:00');
      const grid = buildHeatmapGrid(todayRef);
      expect(grid).toHaveLength(84);
      const expectedFirst = format(subDays(startOfDay(todayRef), 83), 'yyyy-MM-dd');
      const expectedLast = format(startOfDay(todayRef), 'yyyy-MM-dd');
      expect(grid[0].date).toBe(expectedFirst);
      expect(grid[83].date).toBe(expectedLast);
    });

    it('each cell has date, dayOfWeek, and label', () => {
      const grid = buildHeatmapGrid(new Date('2025-03-10'));
      grid.forEach((cell) => {
        expect(cell).toHaveProperty('date');
        expect(cell).toHaveProperty('dayOfWeek');
        expect(cell).toHaveProperty('label');
        expect(cell.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(cell.dayOfWeek).toBeGreaterThanOrEqual(0);
        expect(cell.dayOfWeek).toBeLessThanOrEqual(6);
        expect(cell.label.length).toBeGreaterThan(0);
      });
    });

    it('dates are consecutive and normalized to midnight', () => {
      const todayRef = startOfDay(new Date('2025-03-10'));
      const grid = buildHeatmapGrid(todayRef);
      for (let i = 0; i < grid.length - 1; i++) {
        const curr = new Date(grid[i].date);
        const next = new Date(grid[i + 1].date);
        const diffDays = Math.round((next.getTime() - curr.getTime()) / 86400000);
        expect(diffDays).toBe(1);
      }
    });

    it('first cell is HEATMAP_DAYS - 1 days ago, last is today', () => {
      const todayRef = new Date('2025-03-10T15:30:00');
      const grid = buildHeatmapGrid(todayRef);
      const expectedStart = format(subDays(startOfDay(todayRef), HEATMAP_DAYS - 1), 'yyyy-MM-dd');
      const expectedEnd = format(startOfDay(todayRef), 'yyyy-MM-dd');
      expect(grid[0].date).toBe(expectedStart);
      expect(grid[grid.length - 1].date).toBe(expectedEnd);
    });
  });

  describe('toDateKey', () => {
    it('returns yyyy-MM-dd for a given date', () => {
      const d = new Date('2025-03-10T18:45:00');
      expect(toDateKey(d)).toBe('2025-03-10');
    });

    it('normalizes to start of day (midnight)', () => {
      const d = new Date('2025-03-10T23:59:59');
      expect(toDateKey(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
