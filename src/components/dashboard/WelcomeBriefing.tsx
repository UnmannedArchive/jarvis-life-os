'use client';

import { useStore } from '@/stores/useStore';
import { getGreeting, getContextualInsight } from '@/lib/priority';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDLabel from '@/components/hud/HUDLabel';
import DailyCheckin from './DailyCheckin';
import { motion } from 'framer-motion';

export default function WelcomeBriefing() {
  const user = useStore((s) => s.user);
  const pillars = useStore((s) => s.pillars);
  const todayCheckin = useStore((s) => s.todayCheckin);

  if (!user) return null;

  const { greeting } = getGreeting(user.display_name);
  const insight = getContextualInsight(pillars, user.current_streak, 3);

  return (
    <HUDPanel delay={1}>
      <HUDLabel text="Mission Briefing" />
      <motion.h1
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-2xl md:text-3xl font-[family-name:var(--font-orbitron)] font-bold text-hud-text glow-text mb-2 leading-tight"
      >
        {greeting}
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-sm text-hud-text-muted mb-4"
      >
        {insight}
      </motion.p>

      {!todayCheckin && <DailyCheckin />}
    </HUDPanel>
  );
}
