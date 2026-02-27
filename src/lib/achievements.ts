import { Quest, LifePillar, Goal } from './types';
import { SubTask } from '@/stores/useStore';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'streak' | 'xp' | 'tasks' | 'goals' | 'balance' | 'special';
  condition: (ctx: AchievementContext) => boolean;
}

export interface AchievementContext {
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  tasksCompleted: number;
  dailyTasksCompleted: number;
  totalDailyTasks: number;
  goalsCompleted: number;
  goalsCreated: number;
  pillars: LifePillar[];
  quests: Quest[];
  subTasks: SubTask[];
  checkedIn: boolean;
  level: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_blood',
    title: 'First Blood',
    description: 'Complete your very first task',
    icon: 'Zap',
    category: 'tasks',
    condition: (ctx) => ctx.tasksCompleted >= 1,
  },
  {
    id: 'on_a_roll',
    title: 'On a Roll',
    description: 'Complete 10 tasks',
    icon: 'Target',
    category: 'tasks',
    condition: (ctx) => ctx.tasksCompleted >= 10,
  },
  {
    id: 'centurion',
    title: 'Centurion',
    description: 'Complete 100 tasks',
    icon: 'Hash',
    category: 'tasks',
    condition: (ctx) => ctx.tasksCompleted >= 100,
  },
  {
    id: 'task_machine',
    title: 'Task Machine',
    description: 'Complete 500 tasks',
    icon: 'Cpu',
    category: 'tasks',
    condition: (ctx) => ctx.tasksCompleted >= 500,
  },
  {
    id: 'perfect_day',
    title: 'Perfect Day',
    description: 'Complete all daily tasks in one day',
    icon: 'Sparkles',
    category: 'special',
    condition: (ctx) => ctx.totalDailyTasks > 0 && ctx.dailyTasksCompleted === ctx.totalDailyTasks,
  },
  {
    id: 'streak_3',
    title: 'Warming Up',
    description: 'Reach a 3-day streak',
    icon: 'Flame',
    category: 'streak',
    condition: (ctx) => ctx.longestStreak >= 3,
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Reach a 7-day streak',
    icon: 'Calendar',
    category: 'streak',
    condition: (ctx) => ctx.longestStreak >= 7,
  },
  {
    id: 'streak_14',
    title: 'Fortnight',
    description: 'Reach a 14-day streak',
    icon: 'Swords',
    category: 'streak',
    condition: (ctx) => ctx.longestStreak >= 14,
  },
  {
    id: 'streak_30',
    title: 'Monthly Master',
    description: 'Reach a 30-day streak',
    icon: 'Crown',
    category: 'streak',
    condition: (ctx) => ctx.longestStreak >= 30,
  },
  {
    id: 'streak_100',
    title: 'Unstoppable',
    description: 'Reach a 100-day streak',
    icon: 'Trophy',
    category: 'streak',
    condition: (ctx) => ctx.longestStreak >= 100,
  },
  {
    id: 'xp_1k',
    title: 'XP Hunter',
    description: 'Earn 1,000 total XP',
    icon: 'Star',
    category: 'xp',
    condition: (ctx) => ctx.totalXP >= 1000,
  },
  {
    id: 'xp_5k',
    title: 'XP Seeker',
    description: 'Earn 5,000 total XP',
    icon: 'Stars',
    category: 'xp',
    condition: (ctx) => ctx.totalXP >= 5000,
  },
  {
    id: 'xp_10k',
    title: 'XP Legend',
    description: 'Earn 10,000 total XP',
    icon: 'Orbit',
    category: 'xp',
    condition: (ctx) => ctx.totalXP >= 10000,
  },
  {
    id: 'xp_50k',
    title: 'XP Mythic',
    description: 'Earn 50,000 total XP',
    icon: 'Gem',
    category: 'xp',
    condition: (ctx) => ctx.totalXP >= 50000,
  },
  {
    id: 'level_5',
    title: 'Apprentice',
    description: 'Reach Level 5',
    icon: 'TrendingUp',
    category: 'xp',
    condition: (ctx) => ctx.level >= 5,
  },
  {
    id: 'level_10',
    title: 'Veteran',
    description: 'Reach Level 10',
    icon: 'Award',
    category: 'xp',
    condition: (ctx) => ctx.level >= 10,
  },
  {
    id: 'goal_setter',
    title: 'Dreamer',
    description: 'Create your first goal',
    icon: 'Crosshair',
    category: 'goals',
    condition: (ctx) => ctx.goalsCreated >= 1,
  },
  {
    id: 'goal_crusher',
    title: 'Goal Crusher',
    description: 'Complete a goal',
    icon: 'Medal',
    category: 'goals',
    condition: (ctx) => ctx.goalsCompleted >= 1,
  },
  {
    id: 'five_goals',
    title: 'Ambitious',
    description: 'Complete 5 goals',
    icon: 'Rocket',
    category: 'goals',
    condition: (ctx) => ctx.goalsCompleted >= 5,
  },
  {
    id: 'balanced',
    title: 'Balanced Life',
    description: 'All 6 pillars at level 2+',
    icon: 'Scale',
    category: 'balance',
    condition: (ctx) => ctx.pillars.length >= 6 && ctx.pillars.every((p) => p.level >= 2),
  },
  {
    id: 'specialist',
    title: 'Specialist',
    description: 'Any pillar at level 5',
    icon: 'Microscope',
    category: 'balance',
    condition: (ctx) => ctx.pillars.some((p) => p.level >= 5),
  },
  {
    id: 'grandmaster',
    title: 'Grandmaster',
    description: 'All 6 pillars at level 5+',
    icon: 'Landmark',
    category: 'balance',
    condition: (ctx) => ctx.pillars.length >= 6 && ctx.pillars.every((p) => p.level >= 5),
  },
];

export function getUnlockedAchievements(ctx: AchievementContext): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.condition(ctx));
}

export function getLockedAchievements(ctx: AchievementContext): Achievement[] {
  return ACHIEVEMENTS.filter((a) => !a.condition(ctx));
}

export function getAchievementProgress(achievement: Achievement, ctx: AchievementContext): number {
  switch (achievement.id) {
    case 'first_blood': return Math.min(ctx.tasksCompleted / 1, 1);
    case 'on_a_roll': return Math.min(ctx.tasksCompleted / 10, 1);
    case 'centurion': return Math.min(ctx.tasksCompleted / 100, 1);
    case 'task_machine': return Math.min(ctx.tasksCompleted / 500, 1);
    case 'streak_3': return Math.min(ctx.longestStreak / 3, 1);
    case 'streak_7': return Math.min(ctx.longestStreak / 7, 1);
    case 'streak_14': return Math.min(ctx.longestStreak / 14, 1);
    case 'streak_30': return Math.min(ctx.longestStreak / 30, 1);
    case 'streak_100': return Math.min(ctx.longestStreak / 100, 1);
    case 'xp_1k': return Math.min(ctx.totalXP / 1000, 1);
    case 'xp_5k': return Math.min(ctx.totalXP / 5000, 1);
    case 'xp_10k': return Math.min(ctx.totalXP / 10000, 1);
    case 'xp_50k': return Math.min(ctx.totalXP / 50000, 1);
    case 'level_5': return Math.min(ctx.level / 5, 1);
    case 'level_10': return Math.min(ctx.level / 10, 1);
    case 'goal_setter': return Math.min(ctx.goalsCreated / 1, 1);
    case 'goal_crusher': return Math.min(ctx.goalsCompleted / 1, 1);
    case 'five_goals': return Math.min(ctx.goalsCompleted / 5, 1);
    default: return achievement.condition(ctx) ? 1 : 0;
  }
}
