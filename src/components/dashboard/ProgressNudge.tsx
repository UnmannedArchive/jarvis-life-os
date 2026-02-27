'use client';

import { useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, CheckCircle2, Target, Flame } from 'lucide-react';

export default function ProgressNudge() {
  const quests = useStore((s) => s.quests);
  const user = useStore((s) => s.user);
  const todayCheckin = useStore((s) => s.todayCheckin);

  const nudge = useMemo(() => {
    const daily = quests.filter((q) => q.quest_type === 'daily');
    const dailyDone = daily.filter((q) => q.completed).length;
    const dailyTotal = daily.length;
    const remaining = dailyTotal - dailyDone;

    if (dailyTotal > 0 && remaining === 0) {
      return { icon: <CheckCircle2 size={16} />, text: 'Perfect day! All daily tasks complete.', color: '#3ecf8e', type: 'success' };
    }
    if (dailyTotal > 0 && remaining === 1) {
      return { icon: <Zap size={16} />, text: '1 task away from a perfect day!', color: '#c0c0c0', type: 'urgent' };
    }
    if (dailyTotal > 0 && remaining <= 3) {
      return { icon: <Target size={16} />, text: `${remaining} tasks left today. You got this.`, color: '#c0c0c0', type: 'normal' };
    }
    if (!todayCheckin) {
      return { icon: <Flame size={16} />, text: 'Start your day with a check-in.', color: '#f0b429', type: 'reminder' };
    }
    if (user && user.current_streak >= 3) {
      return { icon: <Flame size={16} />, text: `${user.current_streak}-day streak! Don't break it.`, color: '#f0b429', type: 'streak' };
    }
    return null;
  }, [quests, user, todayCheckin]);

  return (
    <AnimatePresence>
      {nudge && (
        <motion.div initial={{ opacity: 0, y: -4, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }} className="mb-3">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-border bg-bg-card">
            <div className="flex-shrink-0" style={{ color: nudge.color }}>{nudge.icon}</div>
            <span className="text-sm text-text-secondary">{nudge.text}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
