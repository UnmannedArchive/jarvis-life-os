'use client';

import { Difficulty } from '@/lib/types';

const CONFIG: Record<Difficulty, { label: string; color: string }> = {
  EASY: { label: 'Easy', color: '#34d399' },
  MED: { label: 'Med', color: '#c0c0c0' },
  HARD: { label: 'Hard', color: '#fbbf24' },
  LEGENDARY: { label: 'Legend', color: '#f87171' },
};

export default function DifficultyBadge({ difficulty }: { difficulty: Difficulty; size?: 'sm' | 'md' }) {
  const c = CONFIG[difficulty];
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: `${c.color}12`, color: c.color }}>
      {c.label}
    </span>
  );
}
