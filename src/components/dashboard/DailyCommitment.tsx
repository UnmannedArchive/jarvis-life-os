'use client';

import { useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { getCommitmentMessage } from '@/lib/psychology';
import { motion } from 'framer-motion';
import { Target, Check } from 'lucide-react';

export default function DailyCommitment() {
  const commitment = useStore((s) => s.dailyCommitment);
  const setCommitment = useStore((s) => s.setDailyCommitment);
  const quests = useStore((s) => s.quests);

  const completed = useMemo(() => quests.filter((q) => q.completed).length, [quests]);

  if (commitment !== null) {
    const { message, color, met } = getCommitmentMessage(commitment, completed);
    return (
      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
        className="mb-3">
        <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border ${
          met ? 'border-success/30 bg-success-dim' : 'border-border bg-bg-card'
        }`}>
          {met ? <Check size={15} className="text-success flex-shrink-0" /> : <Target size={15} className="flex-shrink-0" style={{ color }} />}
          <span className="text-sm" style={{ color: met ? '#3ecf8e' : undefined }}>
            {message}
          </span>
          <span className="ml-auto text-xs text-text-placeholder">{completed}/{commitment}</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3">
      <div className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-bg-card">
        <Target size={14} className="text-text-placeholder flex-shrink-0" />
        <span className="text-sm text-text-tertiary">I&apos;ll complete</span>
        <div className="flex gap-1">
          {[3, 5, 7, 10].map((n) => (
            <button key={n} onClick={() => setCommitment(n)}
              className="px-2 py-0.5 rounded text-xs font-medium border border-border text-text-secondary hover:border-accent hover:text-accent transition-all cursor-pointer">
              {n}
            </button>
          ))}
        </div>
        <span className="text-sm text-text-tertiary">tasks today</span>
      </div>
    </motion.div>
  );
}
