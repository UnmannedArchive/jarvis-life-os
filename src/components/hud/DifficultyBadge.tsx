'use client';

import { Difficulty } from '@/lib/types';

const CONFIG: Record<Difficulty, { label: string; bg: string; text: string }> = {
  EASY: { label: 'Easy', bg: '#ebfbee', text: '#2b8a3e' },
  MED: { label: 'Medium', bg: '#e7f5ff', text: '#1864ab' },
  HARD: { label: 'Hard', bg: '#fff9db', text: '#e67700' },
  LEGENDARY: { label: 'Legendary', bg: '#fff5f5', text: '#c92a2a' },
};

export default function DifficultyBadge({ difficulty }: { difficulty: Difficulty; size?: 'sm' | 'md' }) {
  const c = CONFIG[difficulty];
  return (
    <span
      className="text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}
