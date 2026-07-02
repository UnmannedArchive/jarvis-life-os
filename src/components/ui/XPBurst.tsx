'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface XPBurstProps {
  amount: number;
  onComplete?: () => void;
  className?: string;
}

const PARTICLES = 10;

export default function XPBurst({ amount, onComplete, className = '' }: XPBurstProps) {
  // Random offsets are rolled once per mount, not per render — a re-render
  // mid-animation must not retarget the particles.
  const [offsets] = useState(() =>
    Array.from({ length: PARTICLES }, () => ({
      x: (Math.random() - 0.5) * 40,
      y: -Math.random() * 40 - 20,
    }))
  );

  return (
    <div className={`absolute pointer-events-none ${className}`}>
      {offsets.map((offset, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-amber-400"
          style={{ left: '50%', top: '50%', marginLeft: -4, marginTop: -4 }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: offset.x,
            y: offset.y,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}
      <motion.span
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-bold text-amber-400 whitespace-nowrap"
        initial={{ y: 0, opacity: 1 }}
        animate={{ y: -30, opacity: 0 }}
        transition={{ duration: 0.8, delay: 0.1 }}
        onAnimationComplete={onComplete}
      >
        +{amount} XP
      </motion.span>
    </div>
  );
}
