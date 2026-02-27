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

export default function XPBar({ percentage, current, required, label, color, height = 6 }: XPBarProps) {
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-text-secondary">{label}</span>
          <span className="text-xs text-text-tertiary tabular-nums">{current} / {required}</span>
        </div>
      )}
      <div className="w-full rounded-full overflow-hidden" style={{ height, background: 'rgba(255,255,255,0.04)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full relative"
          style={{
            background: color
              ? `linear-gradient(90deg, ${color}, ${color}cc)`
              : 'linear-gradient(90deg, #c0c0c0, #888888)',
            boxShadow: `0 0 12px ${color || '#c0c0c0'}40`,
          }}
        />
      </div>
    </div>
  );
}
