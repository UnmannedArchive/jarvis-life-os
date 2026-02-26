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

  const visible = notifications.filter((n) => Date.now() - n.timestamp < 8000).slice(0, 3);

  return (
    <div className="fixed top-16 right-4 z-[90] flex flex-col gap-2 w-72">
      <AnimatePresence>
        {visible.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 80, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="hud-panel hud-panel-inner p-3 backdrop-blur-sm"
            style={{ borderColor: `${n.color}44`, boxShadow: `0 0 20px ${n.color}22` }}
          >
            <div className="flex items-start gap-2">
              <div
                className="w-8 h-8 flex items-center justify-center flex-shrink-0 border"
                style={{ color: n.color, borderColor: `${n.color}33`, backgroundColor: `${n.color}11` }}
              >
                {ICON_MAP[n.type] || <Star size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase font-bold"
                  style={{ color: n.color, textShadow: `0 0 8px ${n.color}44` }}
                >
                  {n.title}
                </div>
                <div className="text-[11px] text-hud-text-muted mt-0.5">
                  {n.description}
                </div>
              </div>
              <button
                onClick={() => dismissNotification(n.id)}
                className="text-hud-text-dim hover:text-hud-text transition-colors flex-shrink-0 cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
