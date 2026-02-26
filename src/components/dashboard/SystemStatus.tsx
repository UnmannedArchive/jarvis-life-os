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
      {
        label: shieldActive ? 'STREAK SHIELD: ACTIVE' : 'STREAK SHIELD: INACTIVE',
        status: shieldActive ? 'online' as const : 'warning' as const,
      },
      {
        label: todayCheckin ? 'CHECK-IN: COMPLETE' : 'CHECK-IN: AWAITING',
        status: todayCheckin ? 'online' as const : 'pending' as const,
      },
      {
        label: `MISSION GRADE: ${grade}`,
        status: ['S', 'A'].includes(grade) ? 'online' as const
          : ['B', 'C'].includes(grade) ? 'warning' as const
          : 'danger' as const,
      },
      {
        label: 'SYSTEMS ONLINE',
        status: 'online' as const,
      },
    ];
  }, [user, quests, todayCheckin]);

  return (
    <HUDPanel delay={5} className="mt-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 justify-between">
        {statuses.map((s, i) => (
          <StatusIndicator key={i} label={s.label} status={s.status} />
        ))}
      </div>
    </HUDPanel>
  );
}
