'use client';

import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

export default function HUDButton({
  children, onClick, variant = 'primary', size = 'md',
  disabled = false, className = '', type = 'button',
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-hover shadow-[0_0_20px_rgba(200,200,200,0.2)] hover:shadow-[0_0_30px_rgba(200,200,200,0.3)] active:scale-[0.97]',
    secondary: 'bg-bg-elevated text-text-secondary border border-border hover:bg-bg-hover hover:text-text-primary hover:border-border-hover active:scale-[0.97]',
    danger: 'bg-danger-dim text-danger hover:bg-danger/20 active:scale-[0.97]',
    ghost: 'text-text-tertiary hover:text-text-secondary hover:bg-bg-elevated active:scale-[0.97]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </button>
  );
}
