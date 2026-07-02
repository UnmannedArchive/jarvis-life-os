/**
 * Life OS constants — XP values, pillars, achievements, journal prompts, etc.
 * Aligned with improvement plan; pillar ids match lib/types Pillar.
 */

import type { Pillar } from './types';

// ─── PILLAR DEFINITIONS ────────────────────────────────────────────

export const DEFAULT_PILLARS: { id: Pillar; name: string; color: string; icon: string; rank: number }[] = [
  { id: 'mind', name: 'Mind', color: '#8B5CF6', icon: 'Brain', rank: 1 },
  { id: 'body', name: 'Body', color: '#EF4444', icon: 'Heart', rank: 2 },
  { id: 'work', name: 'Work', color: '#F59E0B', icon: 'Briefcase', rank: 3 },
  { id: 'wealth', name: 'Wealth', color: '#10B981', icon: 'TrendingUp', rank: 4 },
  { id: 'spirit', name: 'Spirit', color: '#06B6D4', icon: 'Sparkles', rank: 5 },
  { id: 'social', name: 'Social', color: '#EC4899', icon: 'Users', rank: 6 },
];

export const PILLAR_COLOR_MAP: Record<string, string> = {
  mind: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  body: 'bg-red-500/20 text-red-400 border-red-500/30',
  work: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  wealth: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  spirit: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  social: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
};

// ─── XP ENGINE ─────────────────────────────────────────────────────

export const XP_VALUES = {
  task_complete_base: 25,
  task_priority_multiplier: { low: 1, medium: 1.5, high: 2, critical: 3 },
  task_time_bonus: { 5: 0, 15: 5, 30: 10, 60: 20, 120: 40 },
  checkin: 15,
  journal: 20,
  focus_per_minute: 2,
  focus_no_distraction_bonus: 25,
  goal_create: 10,
  goal_milestone: 50,
  goal_complete: 100,
  idea_save: 5,
  login_bonus_base: 10,
  login_streak_multiplier: 5,
  epic_completion_multiplier: 1.5,
  onboarding_step: 25,
} as const;

// ─── LEVEL THRESHOLDS ──────────────────────────────────────────────

export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 850, 1300, 1850, 2500, 3300, 4200,
  5200, 6400, 7800, 9400, 11200, 13200, 15500, 18000, 20800, 24000,
  27500, 31500, 36000, 41000, 46500, 52500, 59000, 66000, 74000, 83000,
] as const;

export const CLASS_TITLES: Record<number, string> = {
  1: 'Novice',
  5: 'Apprentice',
  10: 'Journeyman',
  15: 'Expert',
  20: 'Master',
  25: 'Legend',
  30: 'Transcendent',
};

// ─── ACHIEVEMENT DEFINITIONS ───────────────────────────────────────

export type AchievementDef = {
  key: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  requirement: number;
  check: (state: { quests: { completed_at: string | null }[]; ideas: unknown[]; journalEntries: { createdAt?: string; date?: string }[]; user: { longest_streak: number }; checkinHistory?: { length: number }; focusSessions?: { actualMinutes?: number; completedAt: string | null }[]; goals?: { status: string }[] }) => number;
};

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  { key: 'first_blood', title: 'First Blood', description: 'Complete your first task', icon: '⚔️', rarity: 'common', xpReward: 25, requirement: 1, check: (s) => s.quests.filter((q) => q.completed_at).length },
  { key: 'getting_started', title: 'Getting Started', description: 'Complete your first check-in', icon: '☀️', rarity: 'common', xpReward: 15, requirement: 1, check: (s) => (s as { checkinHistory?: unknown[] }).checkinHistory?.length ?? 0 },
  { key: 'idea_machine', title: 'Idea Machine', description: 'Save 10 ideas', icon: '💡', rarity: 'common', xpReward: 30, requirement: 10, check: (s) => s.ideas.length },
  { key: 'journal_starter', title: 'Dear Diary', description: 'Write your first journal entry', icon: '📝', rarity: 'common', xpReward: 20, requirement: 1, check: (s) => s.journalEntries.length },
  { key: 'focus_5', title: 'Laser Focus', description: 'Complete 5 focus sessions', icon: '🎯', rarity: 'common', xpReward: 40, requirement: 5, check: (s) => (s as { focusSessions?: { completedAt: string | null }[] }).focusSessions?.filter((f) => f.completedAt).length ?? 0 },
  { key: 'tasks_10', title: 'Task Slayer', description: 'Complete 10 tasks', icon: '🗡️', rarity: 'common', xpReward: 50, requirement: 10, check: (s) => s.quests.filter((q) => q.completed_at).length },
  { key: 'streak_7', title: 'Week Warrior', description: '7-day streak', icon: '🔥', rarity: 'rare', xpReward: 100, requirement: 7, check: (s) => s.user.longest_streak },
  { key: 'streak_30', title: 'Monthly Monster', description: '30-day streak', icon: '🌋', rarity: 'rare', xpReward: 300, requirement: 30, check: (s) => s.user.longest_streak },
  { key: 'tasks_50', title: 'Half Century', description: 'Complete 50 tasks', icon: '🏆', rarity: 'rare', xpReward: 150, requirement: 50, check: (s) => s.quests.filter((q) => q.completed_at).length },
  { key: 'all_pillars', title: 'Renaissance', description: 'Complete tasks in all 6 pillars', icon: '🌈', rarity: 'rare', xpReward: 200, requirement: 6, check: (s) => new Set(s.quests.filter((q) => q.completed_at).map((q) => (q as unknown as { pillar: string }).pillar)).size },
  { key: 'journal_30', title: 'Thoughtful', description: 'Journal for 30 days', icon: '🧠', rarity: 'rare', xpReward: 200, requirement: 30, check: (s) => new Set(s.journalEntries.map((j) => (j.createdAt ?? j.date ?? '').toString().split('T')[0])).size },
  { key: 'focus_hours_10', title: 'Deep Worker', description: '10 hours of focus time', icon: '⏳', rarity: 'rare', xpReward: 250, requirement: 600, check: (s) => (s as { focusSessions?: { actualMinutes?: number }[] }).focusSessions?.reduce((sum, f) => sum + (f.actualMinutes ?? 0), 0) ?? 0 },
  { key: 'streak_100', title: 'Centurion', description: '100-day streak', icon: '👑', rarity: 'epic', xpReward: 500, requirement: 100, check: (s) => s.user.longest_streak },
  { key: 'tasks_200', title: 'Legendary Grinder', description: 'Complete 200 tasks', icon: '⚡', rarity: 'epic', xpReward: 400, requirement: 200, check: (s) => s.quests.filter((q) => q.completed_at).length },
  { key: 'level_20', title: 'Master Class', description: 'Reach level 20', icon: '🎖️', rarity: 'epic', xpReward: 500, requirement: 20, check: () => 1 },
  { key: 'goals_10', title: 'Goal Crusher', description: 'Complete 10 goals', icon: '🏅', rarity: 'epic', xpReward: 400, requirement: 10, check: (s) => (s as { goals?: { status: string }[] }).goals?.filter((g) => g.status === 'completed').length ?? 0 },
  { key: 'focus_hours_50', title: 'Flow State Master', description: '50 hours of focus time', icon: '🧘', rarity: 'epic', xpReward: 600, requirement: 3000, check: (s) => (s as { focusSessions?: { actualMinutes?: number }[] }).focusSessions?.reduce((sum, f) => sum + (f.actualMinutes ?? 0), 0) ?? 0 },
  { key: 'streak_365', title: 'Year of Discipline', description: '365-day streak', icon: '💎', rarity: 'legendary', xpReward: 2000, requirement: 365, check: (s) => s.user.longest_streak },
  { key: 'tasks_1000', title: 'The Thousand', description: 'Complete 1000 tasks', icon: '🌟', rarity: 'legendary', xpReward: 1500, requirement: 1000, check: (s) => s.quests.filter((q) => q.completed_at).length },
  { key: 'level_30', title: 'Transcendent', description: 'Reach level 30', icon: '✨', rarity: 'legendary', xpReward: 3000, requirement: 30, check: () => 1 },
  { key: 'perfect_week', title: 'Perfect Week', description: 'Complete all daily tasks for 7 straight days', icon: '🏆', rarity: 'legendary', xpReward: 500, requirement: 7, check: () => 0 },
];

export const RARITY_STYLES = {
  common: { border: 'border-zinc-500/30', bg: 'bg-zinc-500/10', glow: '', label: 'Common', color: 'text-zinc-400' },
  rare: { border: 'border-blue-500/40', bg: 'bg-blue-500/10', glow: 'shadow-blue-500/20 shadow-lg', label: 'Rare', color: 'text-blue-400' },
  epic: { border: 'border-purple-500/50', bg: 'bg-purple-500/10', glow: 'shadow-purple-500/30 shadow-lg', label: 'Epic', color: 'text-purple-400' },
  legendary: { border: 'border-amber-400/60', bg: 'bg-amber-400/10', glow: 'shadow-amber-400/40 shadow-xl', label: 'Legendary', color: 'text-amber-400' },
} as const;

// ─── JOURNAL PROMPTS ───────────────────────────────────────────────

export const JOURNAL_PROMPTS = [
  "What's one thing you're grateful for today?",
  "What would you do differently today?",
  "What's one small win from today?",
  "What's on your mind right now?",
  "What's a challenge you're facing and one step you could take?",
  "Who made a positive impact on your day?",
  "What did you learn today?",
  "What's one thing you're looking forward to?",
  "Describe your energy level and what influenced it.",
  "What's a goal you made progress on today, even slightly?",
  "What's something you've been putting off?",
  "Write about a moment today that stood out.",
  "What would make tomorrow great?",
  "What's a habit you want to build or break?",
  "How did you take care of yourself today?",
  "What are you curious about right now?",
  "Describe your ideal day. How close was today?",
  "What's something you're proud of this week?",
  "What boundary do you need to set?",
  "Free write for 2 minutes — whatever comes to mind.",
] as const;

// ─── AMBIENT SOUNDS (Focus Page) ──────────────────────────────────

export const AMBIENT_SOUNDS = [
  { id: 'rain', name: 'Rain', icon: '🌧️', url: '/sounds/rain.mp3' },
  { id: 'coffee_shop', name: 'Coffee Shop', icon: '☕', url: '/sounds/coffee-shop.mp3' },
  { id: 'white_noise', name: 'White Noise', icon: '📻', url: '/sounds/white-noise.mp3' },
  { id: 'forest', name: 'Forest', icon: '🌲', url: '/sounds/forest.mp3' },
  { id: 'ocean', name: 'Ocean Waves', icon: '🌊', url: '/sounds/ocean.mp3' },
  { id: 'fireplace', name: 'Fireplace', icon: '🔥', url: '/sounds/fireplace.mp3' },
  { id: 'lofi', name: 'Lo-Fi Beats', icon: '🎵', url: '/sounds/lofi.mp3' },
] as const;

// ─── PRIORITY STYLING ──────────────────────────────────────────────

export const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-zinc-400', bg: 'bg-zinc-500/20', border: 'border-zinc-500/30', dot: 'bg-zinc-400' },
  medium: { label: 'Medium', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  high: { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', dot: 'bg-orange-400' },
  critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', dot: 'bg-red-400' },
} as const;

// ─── ACTIVITY TYPE ICONS ───────────────────────────────────────────

export const ACTIVITY_ICONS: Record<string, { icon: string; color: string }> = {
  task_complete: { icon: 'CheckCircle2', color: 'text-emerald-400' },
  task_create: { icon: 'PlusCircle', color: 'text-blue-400' },
  checkin: { icon: 'Sun', color: 'text-amber-400' },
  streak: { icon: 'Flame', color: 'text-orange-400' },
  xp_gain: { icon: 'Zap', color: 'text-yellow-400' },
  achievement: { icon: 'Trophy', color: 'text-purple-400' },
  focus_complete: { icon: 'Timer', color: 'text-cyan-400' },
  focus_start: { icon: 'Play', color: 'text-cyan-300' },
  journal: { icon: 'BookOpen', color: 'text-pink-400' },
  goal_create: { icon: 'Target', color: 'text-emerald-300' },
  goal_complete: { icon: 'Star', color: 'text-amber-400' },
  goal_progress: { icon: 'TrendingUp', color: 'text-emerald-400' },
  login_bonus: { icon: 'Gift', color: 'text-violet-400' },
  level_up: { icon: 'ArrowUpCircle', color: 'text-amber-300' },
  idea_save: { icon: 'Lightbulb', color: 'text-yellow-400' },
  milestone: { icon: 'Flag', color: 'text-emerald-400' },
};

// ─── GRADE CALCULATION ─────────────────────────────────────────────

export function calculateGrade(score: number): { letter: string; color: string } {
  if (score >= 97) return { letter: 'S', color: 'text-amber-300' };
  if (score >= 93) return { letter: 'A+', color: 'text-emerald-400' };
  if (score >= 90) return { letter: 'A', color: 'text-emerald-400' };
  if (score >= 87) return { letter: 'B+', color: 'text-blue-400' };
  if (score >= 83) return { letter: 'B', color: 'text-blue-400' };
  if (score >= 80) return { letter: 'B-', color: 'text-blue-400' };
  if (score >= 77) return { letter: 'C+', color: 'text-yellow-400' };
  if (score >= 73) return { letter: 'C', color: 'text-yellow-400' };
  if (score >= 70) return { letter: 'C-', color: 'text-yellow-400' };
  if (score >= 60) return { letter: 'D', color: 'text-orange-400' };
  return { letter: '—', color: 'text-zinc-500' };
}
