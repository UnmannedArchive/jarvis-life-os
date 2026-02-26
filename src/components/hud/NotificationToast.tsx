'use client';

import { useStore } from '@/stores/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Flame, Star, ArrowUpRight } from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  level_up: <Trophy size={16} />,
  streak_milestone: <Flame size={16} />,
  perfect_day: <Star size={16} />,
  class_change: <ArrowUpRight size={16} />,
};

export default function NotificationToast() {
  const notifications = useStore((s) => s.notifications);
  const dismissNotification = useStore((s) => s.dismissNotification);
  const visible = notifications.filter((n) => Date.now() - n.timestamp < 6000).slice(0, 3);

  return (
    <div className="fixed top-16 right-4 z-[90] flex flex-col gap-2 w-80">
      <AnimatePresence>
        {visible.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60 }}
            className="bg-white rounded-xl border border-border shadow-lg p-3.5"
          >
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${n.color}18`, color: n.color }}
              >
                {ICON_MAP[n.type] || <Star size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text-primary">{n.title}</div>
                <div className="text-xs text-text-tertiary mt-0.5">{n.description}</div>
              </div>
              <button onClick={() => dismissNotification(n.id)} className="text-text-placeholder hover:text-text-secondary cursor-pointer">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
