'use client';

import { useStore } from '@/stores/useStore';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity } from 'lucide-react';

export default function TerminalLog() {
  const activityLog = useStore((s) => s.activityLog);

  return (
    <div className="border-t border-border bg-bg-secondary/50">
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border">
        <Activity size={12} className="text-text-tertiary" />
        <span className="text-[11px] font-medium text-text-tertiary">Activity Feed</span>
      </div>
      <div className="h-[64px] overflow-y-auto px-4 py-1">
        <AnimatePresence mode="popLayout">
          {activityLog.length === 0 ? (
            <div className="text-[12px] text-text-placeholder py-2">
              No activity yet. Complete a task to get started.
            </div>
          ) : (
            activityLog.slice(0, 20).map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="text-[12px] text-text-secondary py-0.5 leading-relaxed"
              >
                <span className="text-text-tertiary">
                  {format(parseISO(entry.created_at), 'HH:mm')}
                </span>{' '}
                <span>{entry.description}</span>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
