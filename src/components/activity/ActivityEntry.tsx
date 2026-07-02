'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  PlusCircle,
  Sun,
  Flame,
  Zap,
  Trophy,
  Timer,
  Play,
  BookOpen,
  Target,
  Star,
  TrendingUp,
  Gift,
  ArrowUpCircle,
  Lightbulb,
  Flag,
  Pin,
  X,
} from 'lucide-react';
import { ACTIVITY_ICONS, PILLAR_COLOR_MAP } from '@/lib/constants';
import type { ActivityFeedEntry } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  CheckCircle2,
  PlusCircle,
  Sun,
  Flame,
  Zap,
  Trophy,
  Timer,
  Play,
  BookOpen,
  Target,
  Star,
  TrendingUp,
  Gift,
  ArrowUpCircle,
  Lightbulb,
  Flag,
};

interface ActivityEntryProps {
  entry: ActivityFeedEntry;
  index: number;
  onPin: (id: string) => void;
  onDismiss: (id: string) => void;
}

export default function ActivityEntry({ entry, index, onPin, onDismiss }: ActivityEntryProps) {
  const [hover, setHover] = useState(false);
  const config = ACTIVITY_ICONS[entry.type] ?? { icon: 'Zap', color: 'text-yellow-400' };
  const Icon = ICON_MAP[config.icon] ?? Zap;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.5) }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="flex gap-3 py-2 group"
    >
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-px flex-1 min-h-[8px] bg-border`} />
        <div className={`w-2.5 h-2.5 rounded-full ${config.color} bg-current opacity-80`} />
      </div>
      <div className="flex-1 min-w-0 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon size={20} className={`flex-shrink-0 ${config.color}`} />
            <span className="text-sm font-medium text-text-primary truncate">{entry.title}</span>
          </div>
          {entry.xp > 0 && (
            <span className="text-xs font-semibold text-amber-400 flex-shrink-0">+{entry.xp} XP</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {entry.pillar && (
            <span className={`text-xs px-1.5 py-0.5 rounded border ${PILLAR_COLOR_MAP[entry.pillar] ?? 'text-zinc-400'}`}>
              {entry.pillar.charAt(0).toUpperCase() + entry.pillar.slice(1)}
            </span>
          )}
          <span className="text-xs text-text-placeholder">
            {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
          </span>
        </div>
        {hover && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-1 mt-1"
          >
            <button
              onClick={() => onPin(entry.id)}
              className="p-1 rounded text-text-placeholder hover:text-amber-400 transition-colors"
              aria-label="Pin"
            >
              <Pin size={12} />
            </button>
            <button
              onClick={() => onDismiss(entry.id)}
              className="p-1 rounded text-text-placeholder hover:text-red-400 transition-colors"
              aria-label="Dismiss"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
