'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface HUDPanelProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  noPadding?: boolean;
}

export default function HUDPanel({ children, className = '', delay = 0, noPadding = false }: HUDPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.05 }}
      className={`hud-panel hud-panel-inner ${noPadding ? '' : 'p-4'} ${className}`}
    >
      {children}
    </motion.div>
  );
}
