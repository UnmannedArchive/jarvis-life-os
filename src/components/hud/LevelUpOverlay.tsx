'use client';

import { useStore } from '@/stores/useStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function LevelUpOverlay() {
  const showLevelUp = useStore((s) => s.showLevelUp);

  return (
    <AnimatePresence>
      {showLevelUp && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[100] pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(0,255,136,0.15) 0%, transparent 70%)' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none"
          >
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="font-[family-name:var(--font-orbitron)] text-[10px] tracking-[6px] text-hud-cyan mb-2 uppercase"
              >
                System Alert
              </motion.div>
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: [0.8, 1.1, 1] }}
                transition={{ duration: 0.6, times: [0, 0.6, 1] }}
                className="font-[family-name:var(--font-orbitron)] text-4xl md:text-6xl font-bold text-hud-green tracking-[8px] glow-text"
              >
                LEVEL UP
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-3 flex items-center gap-3"
              >
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-hud-green/50" />
                <span className="font-[family-name:var(--font-orbitron)] text-2xl text-hud-green glow-text">
                  {showLevelUp.level}
                </span>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-hud-green/50" />
              </motion.div>
              {showLevelUp.pillar && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="mt-2 text-[10px] font-[family-name:var(--font-orbitron)] tracking-[3px] text-hud-text-muted uppercase"
                >
                  {showLevelUp.pillar} Pillar
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
