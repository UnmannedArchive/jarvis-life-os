'use client';

import { Difficulty, DIFFICULTY_CONFIG } from '@/lib/types';

interface DifficultyBadgeProps {
  difficulty: Difficulty;
  size?: 'sm' | 'md';
}

export default function DifficultyBadge({ difficulty, size = 'sm' }: DifficultyBadgeProps) {
  const config = DIFFICULTY_CONFIG[difficulty];
  const textSize = size === 'sm' ? 'text-[9px]' : 'text-[10px]';
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';

  return (
    <span
      className={`${textSize} ${padding} font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase border`}
      style={{
        color: config.color,
        borderColor: `${config.color}44`,
        backgroundColor: `${config.color}11`,
        textShadow: `0 0 8px ${config.color}44`,
      }}
    >
      {config.label}
    </span>
  );
}
