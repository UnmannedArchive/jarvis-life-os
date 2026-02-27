'use client';

import { useStore } from '@/stores/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';

export default function LevelUpOverlay() {
  const showLevelUp = useStore((s) => s.showLevelUp);

  return (
    <AnimatePresence>
      {showLevelUp && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md pointer-events-none">
          <motion.div
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="relative flex flex-col items-center">
            <motion.div
              animate={{ boxShadow: ['0 0 40px rgba(200,200,200,0.2)', '0 0 80px rgba(200,200,200,0.4)', '0 0 40px rgba(200,200,200,0.2)'] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-accent/20 to-purple/20 border border-accent/20 flex items-center justify-center mb-6">
              <Trophy size={40} className="text-accent drop-shadow-[0_0_12px_rgba(200,200,200,0.5)]" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="text-sm font-semibold text-accent uppercase tracking-[0.2em] mb-2">Level Up</motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
              className="text-6xl font-black gradient-text mb-1">{showLevelUp.level}</motion.div>
            {showLevelUp.pillar && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="text-sm text-text-tertiary">{showLevelUp.pillar}</motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
