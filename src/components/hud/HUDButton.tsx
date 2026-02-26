'use client';

import { ReactNode } from 'react';

interface HUDButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

const variantStyles = {
  primary: {
    border: 'rgba(0,255,136,0.4)',
    bg: 'rgba(0,255,136,0.08)',
    color: '#00ff88',
    hoverBg: 'rgba(0,255,136,0.15)',
    shadow: 'rgba(0,255,136,0.3)',
  },
  secondary: {
    border: 'rgba(0,229,255,0.4)',
    bg: 'rgba(0,229,255,0.08)',
    color: '#00e5ff',
    hoverBg: 'rgba(0,229,255,0.15)',
    shadow: 'rgba(0,229,255,0.3)',
  },
  danger: {
    border: 'rgba(255,110,64,0.4)',
    bg: 'rgba(255,110,64,0.08)',
    color: '#ff6e40',
    hoverBg: 'rgba(255,110,64,0.15)',
    shadow: 'rgba(255,110,64,0.3)',
  },
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-[10px]',
  md: 'px-4 py-2 text-[11px]',
  lg: 'px-6 py-3 text-[12px]',
};

export default function HUDButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  type = 'button',
}: HUDButtonProps) {
  const style = variantStyles[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase
        border transition-all duration-200 cursor-pointer
        disabled:opacity-30 disabled:cursor-not-allowed
        hover:scale-[1.02] active:scale-[0.98]
        ${sizeStyles[size]}
        ${className}
      `}
      style={{
        borderColor: style.border,
        backgroundColor: style.bg,
        color: style.color,
        textShadow: `0 0 8px ${style.shadow}`,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = style.hoverBg;
          e.currentTarget.style.boxShadow = `0 0 15px ${style.shadow}, inset 0 0 15px ${style.shadow}`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = style.bg;
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {children}
    </button>
  );
}
