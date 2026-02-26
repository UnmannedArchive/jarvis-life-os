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
  color = '#228be6',
  height = 6,
}: XPBarProps) {
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-medium text-text-secondary">{label}</span>
          <span className="text-xs text-text-tertiary">
            {current} / {required}
          </span>
        </div>
      )}
      <div
        className="w-full bg-bg-tertiary rounded-full overflow-hidden"
        style={{ height }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}
