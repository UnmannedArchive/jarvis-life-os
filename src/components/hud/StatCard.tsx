'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  sublabel?: string;
  color?: string;
  delay?: number;
}

export default function StatCard({
  icon,
  label,
  value,
  sublabel,
  color = '#00ff88',
  delay = 0,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay * 0.05 }}
      className="hud-panel hud-panel-inner p-3 flex items-center gap-3 min-w-0"
    >
      <div
        className="flex-shrink-0 w-8 h-8 flex items-center justify-center border"
        style={{
          borderColor: `${color}33`,
          backgroundColor: `${color}11`,
          color,
        }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-muted truncate">
          {label}
        </div>
        <div
          className="text-lg font-[family-name:var(--font-orbitron)] leading-tight"
          style={{ color, textShadow: `0 0 8px ${color}66` }}
        >
          {value}
        </div>
        {sublabel && (
          <div className="text-[10px] text-hud-text-dim truncate">{sublabel}</div>
        )}
      </div>
    </motion.div>
  );
}
