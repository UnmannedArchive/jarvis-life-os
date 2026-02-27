'use client';

import { useMemo } from 'react';
import { useStore, XPHistoryEntry } from '@/stores/useStore';
import HUDPanel from '@/components/hud/HUDPanel';
import { format, subDays, startOfDay } from 'date-fns';
import { Flame } from 'lucide-react';

export default function StreakCalendar() {
  const xpHistory = useStore((s) => s.xpHistory);
  const user = useStore((s) => s.user);

  const { grid, maxXP } = useMemo(() => {
    const xpByDate: Record<string, number> = {};
    xpHistory.forEach((e: XPHistoryEntry) => {
      xpByDate[e.date] = (xpByDate[e.date] || 0) + e.xp;
    });
    const today = startOfDay(new Date());
    const days = 91;
    const cells = [];
    let max = 0;
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(today, i);
      const key = format(d, 'yyyy-MM-dd');
      const xp = xpByDate[key] || 0;
      if (xp > max) max = xp;
      cells.push({ date: key, xp, dayOfWeek: d.getDay(), label: format(d, 'MMM d') });
    }
    return { grid: cells, maxXP: max };
  }, [xpHistory]);

  const getColor = (xp: number) => {
    if (xp === 0) return 'rgba(255,255,255,0.02)';
    if (maxXP === 0) return 'rgba(255,255,255,0.02)';
    const ratio = xp / maxXP;
    if (ratio > 0.75) return 'rgba(200,200,200,0.7)';
    if (ratio > 0.5) return 'rgba(200,200,200,0.45)';
    if (ratio > 0.25) return 'rgba(200,200,200,0.25)';
    return 'rgba(200,200,200,0.12)';
  };

  const getShadow = (xp: number) => {
    if (xp === 0) return 'none';
    const ratio = maxXP > 0 ? xp / maxXP : 0;
    if (ratio > 0.5) return '0 0 6px rgba(200,200,200,0.2)';
    return 'none';
  };

  const weeks: (typeof grid[0] | null)[][] = [];
  let currentWeek: (typeof grid[0] | null)[] = [];
  const firstDay = grid[0];
  if (firstDay) {
    for (let i = 0; i < firstDay.dayOfWeek; i++) currentWeek.push(null);
  }
  grid.forEach((cell) => {
    if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
    currentWeek.push(cell);
  });
  if (currentWeek.length > 0) weeks.push(currentWeek);

  return (
    <HUDPanel delay={2}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Activity</h2>
        {user && user.current_streak > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <Flame size={13} className="text-warning drop-shadow-[0_0_6px_rgba(251,191,36,0.3)]" />
            <span className="font-bold text-text-primary">{user.current_streak}</span>
            <span className="text-text-placeholder">day streak</span>
          </div>
        )}
      </div>
      <div className="flex gap-[3px] overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((cell, di) =>
              cell ? (
                <div key={cell.date} title={`${cell.label}: ${cell.xp} XP`}
                  className="w-[11px] h-[11px] rounded-[3px] transition-all"
                  style={{ backgroundColor: getColor(cell.xp), boxShadow: getShadow(cell.xp) }} />
              ) : (
                <div key={`empty-${di}`} className="w-[11px] h-[11px]" />
              )
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-2.5 justify-end">
        <span className="text-[10px] text-text-placeholder">Less</span>
        {[0.02, 0.12, 0.25, 0.45, 0.7].map((opacity, i) => (
          <div key={i} className="w-[11px] h-[11px] rounded-[3px]"
            style={{ backgroundColor: i === 0 ? `rgba(255,255,255,${opacity})` : `rgba(200,200,200,${opacity})` }} />
        ))}
        <span className="text-[10px] text-text-placeholder">More</span>
      </div>
    </HUDPanel>
  );
}
