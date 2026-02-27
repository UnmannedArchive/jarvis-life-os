'use client';

import { useStore } from '@/stores/useStore';
import { getGreeting, getContextualInsight } from '@/lib/priority';
import DailyCheckin from './DailyCheckin';
import { motion } from 'framer-motion';

export default function WelcomeBriefing() {
  const user = useStore((s) => s.user);
  const pillars = useStore((s) => s.pillars);
  const todayCheckin = useStore((s) => s.todayCheckin);

  if (!user) return null;

  const { greeting } = getGreeting(user.display_name);
  const insight = getContextualInsight(pillars, user.current_streak, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl p-6 mb-4 glass-card">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-accent/[0.04] to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-purple/[0.03] to-transparent rounded-full translate-y-1/2 -translate-x-1/4" />
      <div className="relative z-10">
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-1 tracking-tight">{greeting}</h1>
        <p className="text-sm text-text-tertiary mb-4">{insight}</p>
        {!todayCheckin && <DailyCheckin />}
      </div>
    </motion.div>
  );
}
