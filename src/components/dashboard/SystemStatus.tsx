'use client';

import { useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { getMissionGrade } from '@/lib/priority';
import { getStreakShieldActive } from '@/lib/xp';
import HUDPanel from '@/components/hud/HUDPanel';
import StatusIndicator from '@/components/hud/StatusIndicator';

export default function SystemStatus() {
  const user = useStore((s) => s.user);
  const quests = useStore((s) => s.quests);
  const todayCheckin = useStore((s) => s.todayCheckin);

  const statuses = useMemo(() => {
    if (!user) return [];
    const dailyQuests = quests.filter((q) => q.quest_type === 'daily');
    const sideCompleted = quests.filter((q) => q.quest_type === 'side' && q.completed).length;
    const grade = getMissionGrade(dailyQuests, sideCompleted, !!todayCheckin);
    const shieldActive = getStreakShieldActive(user.current_streak);

    return [
      { label: `Streak Shield: ${shieldActive ? 'Active' : 'Inactive'}`, status: shieldActive ? 'online' as const : 'pending' as const },
      { label: `Check-in: ${todayCheckin ? 'Done' : 'Pending'}`, status: todayCheckin ? 'online' as const : 'pending' as const },
      { label: `Daily Grade: ${grade}`, status: ['S', 'A'].includes(grade) ? 'online' as const : ['B', 'C'].includes(grade) ? 'warning' as const : grade === '--' ? 'pending' as const : 'danger' as const },
    ];
  }, [user, quests, todayCheckin]);

  if (statuses.length === 0) return null;

  return (
    <HUDPanel delay={4} className="mt-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {statuses.map((s, i) => (
          <StatusIndicator key={i} label={s.label} status={s.status} />
        ))}
      </div>
    </HUDPanel>
  );
}
