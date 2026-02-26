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

export default function StatCard({ icon, label, value, sublabel, color = '#228be6', delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: delay * 0.04 }}
      className="bg-white rounded-xl border border-border p-4 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-text-primary">{value}</div>
      <div className="text-xs text-text-tertiary mt-0.5">{label}</div>
      {sublabel && <div className="text-[11px] text-text-placeholder mt-0.5">{sublabel}</div>}
    </motion.div>
  );
}
