'use client';

import { motion } from 'framer-motion';

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  value?: string;
}

export default function ProgressRing({
  percentage,
  size = 80,
  strokeWidth = 3,
  color = '#00ff88',
  label,
  value,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            strokeLinecap="butt"
            style={{
              filter: `drop-shadow(0 0 6px ${color}66)`,
            }}
          />
        </svg>
        {value && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="font-[family-name:var(--font-orbitron)] text-sm"
              style={{ color, textShadow: `0 0 8px ${color}66` }}
            >
              {value}
            </span>
          </div>
        )}
      </div>
      {label && (
        <span className="text-[9px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-muted">
          {label}
        </span>
      )}
    </div>
  );
}
