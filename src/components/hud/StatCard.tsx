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

export default function StatCard({ icon, label, value, sublabel, color = '#c0c0c0', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: delay * 0.05 }}
      className="glass-card rounded-2xl p-4 group"
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)`, color, boxShadow: `0 0 16px ${color}10` }}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-text-primary tabular-nums">{value}</div>
      <div className="text-xs text-text-tertiary mt-0.5">{label}</div>
      {sublabel && <div className="text-[11px] text-text-placeholder mt-0.5">{sublabel}</div>}
    </motion.div>
  );
}
