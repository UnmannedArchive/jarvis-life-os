'use client';

import { useStore } from '@/stores/useStore';
import { getGreeting, getContextualInsight } from '@/lib/priority';
import HUDPanel from '@/components/hud/HUDPanel';
import DailyCheckin from './DailyCheckin';

export default function WelcomeBriefing() {
  const user = useStore((s) => s.user);
  const pillars = useStore((s) => s.pillars);
  const todayCheckin = useStore((s) => s.todayCheckin);

  if (!user) return null;

  const { greeting } = getGreeting(user.display_name);
  const insight = getContextualInsight(pillars, user.current_streak, 0);

  return (
    <HUDPanel delay={0}>
      <h1 className="text-2xl font-bold text-text-primary mb-1">{greeting}</h1>
      <p className="text-sm text-text-tertiary mb-4">{insight}</p>
      {!todayCheckin && <DailyCheckin />}
    </HUDPanel>
  );
}
