'use client';

import { useStore } from '@/stores/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

export default function CriticalHitOverlay() {
  const crit = useStore((s) => s.showCriticalHit);

  return (
    <AnimatePresence>
      {crit && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[95] flex items-center justify-center pointer-events-none"
        >
          <div className="absolute inset-0 bg-warning/[0.03]" />
          <motion.div
            initial={{ scale: 0.3, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 1.5, opacity: 0, y: -60 }}
            transition={{ type: 'spring', stiffness: 400, damping: 12 }}
            className="relative flex flex-col items-center"
          >
            <motion.div
              animate={{
                rotate: [0, -8, 8, -4, 4, 0],
                boxShadow: ['0 0 30px rgba(251,191,36,0.2)', '0 0 60px rgba(251,191,36,0.4)', '0 0 30px rgba(251,191,36,0.2)'],
              }}
              transition={{ duration: 0.5 }}
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-warning/20 to-orange/15 border border-warning/20 flex items-center justify-center mb-4"
            >
              <Zap size={44} className="text-warning drop-shadow-[0_0_16px_rgba(251,191,36,0.5)]" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="text-3xl font-black text-warning tracking-tight text-center drop-shadow-[0_0_20px_rgba(251,191,36,0.3)]">CRITICAL HIT!</div>
              <div className="text-xl font-bold text-text-primary mt-1 text-center">+{crit.xp} XP</div>
              <div className="text-xs text-text-tertiary mt-1 text-center max-w-[200px]">2x XP on &ldquo;{crit.task}&rdquo;</div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
