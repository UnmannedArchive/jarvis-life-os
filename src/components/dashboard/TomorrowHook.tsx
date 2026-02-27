'use client';

import { useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { getTomorrowHook } from '@/lib/psychology';
import HUDPanel from '@/components/hud/HUDPanel';
import { ArrowRight } from 'lucide-react';

export default function TomorrowHook() {
  const user = useStore((s) => s.user);
  const pillars = useStore((s) => s.pillars);
  const quests = useStore((s) => s.quests);

  const hook = useMemo(() => {
    const completed = quests.filter((q) => q.completed).length;
    return getTomorrowHook(
      user?.current_streak || 0,
      pillars.map((p) => ({ pillar: p.pillar, level: p.level })),
      completed,
    );
  }, [user, pillars, quests]);

  return (
    <HUDPanel delay={5} className="mt-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent-dim flex items-center justify-center flex-shrink-0">
          <ArrowRight size={14} className="text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-text-tertiary font-medium uppercase tracking-wider">Tomorrow</div>
          <div className="text-sm font-semibold text-text-primary">{hook.hook}</div>
          <div className="text-xs text-text-tertiary mt-0.5">{hook.subtext}</div>
        </div>
      </div>
    </HUDPanel>
  );
}
