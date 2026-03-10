'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  noPadding?: boolean;
  glow?: boolean;
}

export default function HUDPanel({ children, className = '', delay = 0, noPadding = false, glow = false }: CardProps) {
  return (
    <div
      className={`glass-card rounded-2xl animate-[fadeInUp_0.35s_ease-out_both] ${noPadding ? '' : 'p-5'} ${glow ? 'shadow-[0_0_30px_rgba(200,200,200,0.08)]' : ''} ${className}`}
      style={{ animationDelay: `${delay * 50}ms` }}
    >
      {children}
    </div>
  );
}
