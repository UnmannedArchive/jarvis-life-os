'use client';

import { motion } from 'framer-motion';

interface XPBarProps {
  percentage: number;
  current: number;
  required: number;
  label?: string;
  color?: string;
  height?: number;
}

export default function XPBar({
  percentage,
  current,
  required,
  label,
  color = '#00ff88',
  height = 8,
}: XPBarProps) {
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-muted">
            {label}
          </span>
          <span className="text-[11px] font-[family-name:var(--font-orbitron)] text-hud-green">
            {current} / {required}
          </span>
        </div>
      )}
      <div
        className="w-full bg-white/5 border border-white/10 overflow-hidden"
        style={{ height, borderRadius: 2 }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full relative"
          style={{
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 10px ${color}66, 0 0 20px ${color}33`,
            borderRadius: 2,
          }}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-2"
            style={{
              background: `linear-gradient(90deg, transparent, ${color})`,
              boxShadow: `0 0 8px ${color}`,
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
