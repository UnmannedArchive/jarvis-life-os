'use client';

import { useStore } from '@/stores/useStore';
import { format, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'lucide-react';

export default function TerminalLog() {
  const activityLog = useStore((s) => s.activityLog);

  return (
    <div className="w-full border-t border-hud-border bg-hud-bg/90 backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4 py-1 border-b border-hud-border/50">
        <Terminal size={10} className="text-hud-green" />
        <span className="text-[9px] font-[family-name:var(--font-orbitron)] tracking-[3px] uppercase text-hud-green/70">
          System Log
        </span>
        <div className="w-1.5 h-1.5 rounded-full bg-hud-green status-dot ml-auto" />
      </div>
      <div className="h-[72px] overflow-y-auto px-4 py-1">
        <AnimatePresence mode="popLayout">
          {activityLog.length === 0 ? (
            <div className="text-[11px] font-[family-name:var(--font-mono)] text-hud-text-dim py-1">
              [--:--:--] SYSTEM — Awaiting activity data...
            </div>
          ) : (
            activityLog.slice(0, 20).map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[11px] font-[family-name:var(--font-mono)] text-hud-text-muted py-0.5 leading-relaxed"
              >
                <span className="text-hud-green/60">
                  [{format(parseISO(entry.created_at), 'HH:mm:ss')}]
                </span>{' '}
                <span className="text-hud-text">{entry.description}</span>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
