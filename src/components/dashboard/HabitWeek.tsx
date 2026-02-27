'use client';

import { useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import HUDPanel from '@/components/hud/HUDPanel';
import { PILLAR_CONFIG } from '@/lib/types';
import { format, subDays, startOfDay } from 'date-fns';
import { Check } from 'lucide-react';

export default function HabitWeek() {
  const quests = useStore((s) => s.quests);
  const activityLog = useStore((s) => s.activityLog);

  const dailyHabits = useMemo(() => quests.filter((q) => q.quest_type === 'daily'), [quests]);

  const last7 = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, 6 - i);
      return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE'), isToday: i === 6 };
    });
  }, []);

  const completedSet = useMemo(() => {
    const set = new Set<string>();
    activityLog.forEach((e) => {
      if (e.action === 'quest_completed') {
        const dateStr = e.created_at.split('T')[0];
        const titleMatch = e.description.match(/"([^"]+)"/);
        if (titleMatch) set.add(`${dateStr}:${titleMatch[1]}`);
      }
    });
    quests.filter((q) => q.completed && q.completed_at).forEach((q) => {
      const dateStr = q.completed_at!.split('T')[0];
      set.add(`${dateStr}:${q.title}`);
    });
    return set;
  }, [activityLog, quests]);

  if (dailyHabits.length === 0) return null;

  return (
    <HUDPanel delay={4}>
      <h2 className="text-sm font-semibold text-text-primary mb-3">This Week</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="text-left py-1.5 pr-3 text-text-placeholder font-medium w-32">Habit</th>
              {last7.map((d) => (
                <th key={d.date} className={`text-center py-1.5 px-1 font-medium ${d.isToday ? 'text-accent' : 'text-text-placeholder'}`}>
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dailyHabits.map((habit) => (
              <tr key={habit.id} className="border-t border-border/50">
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: PILLAR_CONFIG[habit.pillar].color }} />
                    <span className="text-text-secondary truncate max-w-[120px]">{habit.title}</span>
                  </div>
                </td>
                {last7.map((d) => {
                  const done = completedSet.has(`${d.date}:${habit.title}`);
                  return (
                    <td key={d.date} className="text-center py-2 px-1">
                      {done ? (
                        <div className="w-5 h-5 rounded bg-accent/20 flex items-center justify-center mx-auto">
                          <Check size={10} className="text-accent" strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded bg-bg-elevated mx-auto" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </HUDPanel>
  );
}
