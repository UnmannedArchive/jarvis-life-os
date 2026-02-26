'use client';

import { useStore } from '@/stores/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';

export default function LevelUpOverlay() {
  const showLevelUp = useStore((s) => s.showLevelUp);

  return (
    <AnimatePresence>
      {showLevelUp && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full bg-accent-light flex items-center justify-center mb-4">
              <Trophy size={28} className="text-accent" />
            </div>
            <div className="text-sm font-medium text-text-tertiary uppercase tracking-wider mb-1">Level Up!</div>
            <div className="text-4xl font-bold text-text-primary">Level {showLevelUp.level}</div>
            {showLevelUp.pillar && (
              <div className="text-sm text-text-tertiary mt-1">{showLevelUp.pillar}</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
