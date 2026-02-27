export type Pillar = 'mind' | 'body' | 'work' | 'wealth' | 'spirit' | 'social';

export type Difficulty = 'EASY' | 'MED' | 'HARD' | 'LEGENDARY';

export type QuestType = 'daily' | 'side' | 'epic';

export type CharacterClass =
  | 'RECRUIT'
  | 'SCHOLAR'
  | 'WARRIOR'
  | 'ENGINEER'
  | 'STRATEGIST'
  | 'MONK'
  | 'DIPLOMAT'
  | 'POLYMATH';

export type MissionGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface User {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  character_class: CharacterClass;
  avatar_url: string | null;
}

export interface LifePillar {
  id: string;
  user_id: string;
  pillar: Pillar;
  current_xp: number;
  level: number;
  streak: number;
  last_activity_date: string | null;
}

export interface Quest {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  pillar: Pillar;
  difficulty: Difficulty;
  xp_reward: number;
  quest_type: QuestType;
  is_recurring: boolean;
  recurrence_rule: string | null;
  due_date: string | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  sort_order: number;
}

export interface DailyCheckin {
  id: string;
  user_id: string;
  date: string;
  sleep_quality: number | null;
  energy_level: number | null;
  mood: number | null;
  notes: string | null;
  created_at: string;
}

export interface ActivityLogEntry {
  id: string;
  user_id: string;
  action: string;
  description: string;
  xp_earned: number;
  pillar: Pillar | null;
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  pillar: Pillar;
  target_date: string | null;
  progress_pct: number;
  status: 'active' | 'completed' | 'abandoned';
  xp_reward: number;
  created_at: string;
}

export const PILLAR_CONFIG: Record<Pillar, { label: string; icon: string; color: string }> = {
  mind: { label: 'Mind', icon: 'Brain', color: '#b0b0b0' },
  body: { label: 'Body', icon: 'Dumbbell', color: '#ff6e40' },
  work: { label: 'Work', icon: 'Briefcase', color: '#00ff88' },
  wealth: { label: 'Wealth', icon: 'TrendingUp', color: '#ffd740' },
  spirit: { label: 'Spirit', icon: 'Sparkles', color: '#999999' },
  social: { label: 'Social', icon: 'Users', color: '#ff4081' },
};

export const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; color: string; xp: number }> = {
  EASY: { label: 'EASY', color: '#00ff88', xp: 50 },
  MED: { label: 'MED', color: '#b0b0b0', xp: 100 },
  HARD: { label: 'HARD', color: '#ffd740', xp: 150 },
  LEGENDARY: { label: 'LEGENDARY', color: '#ff6e40', xp: 300 },
};
