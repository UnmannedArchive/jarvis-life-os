'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  noPadding?: boolean;
  glow?: boolean;
}

export default function HUDPanel({ children, className = '', delay = 0, noPadding = false, glow = false }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: delay * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`glass-card rounded-2xl ${noPadding ? '' : 'p-5'} ${glow ? 'shadow-[0_0_30px_rgba(200,200,200,0.08)]' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}
