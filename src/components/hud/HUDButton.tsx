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
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-accent text-white hover:bg-accent-hover active:scale-[0.98] shadow-sm',
    secondary: 'bg-white text-text-secondary border border-border hover:bg-bg-secondary hover:border-border-hover active:scale-[0.98]',
    danger: 'bg-danger-light text-danger hover:bg-danger/10 active:scale-[0.98]',
    ghost: 'text-text-tertiary hover:text-text-secondary hover:bg-bg-secondary active:scale-[0.98]',
  };

  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-5 py-2.5 text-sm',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}
