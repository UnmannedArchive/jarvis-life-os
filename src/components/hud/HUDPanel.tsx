'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  noPadding?: boolean;
}

export default function HUDPanel({ children, className = '', delay = 0, noPadding = false }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: delay * 0.04 }}
      className={`bg-white rounded-xl border border-border shadow-sm ${noPadding ? '' : 'p-5'} ${className}`}
    >
      {children}
    </motion.div>
  );
}
