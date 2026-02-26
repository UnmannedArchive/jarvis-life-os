import { Difficulty, DIFFICULTY_CONFIG, Pillar, Quest, LifePillar } from './types';

export function getBaseXP(difficulty: Difficulty): number {
  return DIFFICULTY_CONFIG[difficulty].xp;
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.75;
  if (streak >= 7) return 1.5;
  if (streak >= 3) return 1.25;
  return 1.0;
}

export function getComboMultiplier(pillarsActiveToday: Set<Pillar>): number {
  return pillarsActiveToday.size >= 3 ? 1.25 : 1.0;
}

export function getMorningMultiplier(): number {
  const hour = new Date().getHours();
  return hour < 10 ? 1.1 : 1.0;
}

export function calculateQuestXP(
  difficulty: Difficulty,
  streak: number,
  pillarsActiveToday: Set<Pillar>,
  isMorning: boolean = false,
): number {
  const base = getBaseXP(difficulty);
  let multiplier = getStreakMultiplier(streak);
  multiplier *= getComboMultiplier(pillarsActiveToday);
  if (isMorning) multiplier *= 1.1;
  return Math.round(base * multiplier);
}

export function getPerfectDayBonus(totalDailyXP: number): number {
  return Math.round(totalDailyXP * 0.5);
}

export function isPerfectDay(dailyQuests: Quest[]): boolean {
  if (dailyQuests.length === 0) return false;
  return dailyQuests.every((q) => q.completed);
}

const LEVEL_THRESHOLDS = [0, 200, 500, 900, 1400, 2000, 2800, 3800, 5000, 6500];

export function getLevelFromXP(totalXP: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      if (i >= LEVEL_THRESHOLDS.length - 1) {
        const excessXP = totalXP - LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
        return LEVEL_THRESHOLDS.length + Math.floor(excessXP / 2000);
      }
      return i + 1;
    }
  }
  return 1;
}

export function getXPForLevel(level: number): number {
  if (level <= 0) return 0;
  if (level <= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[level - 1];
  return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (level - LEVEL_THRESHOLDS.length) * 2000;
}

export function getXPProgress(totalXP: number): { current: number; required: number; percentage: number } {
  const level = getLevelFromXP(totalXP);
  const currentLevelXP = getXPForLevel(level);
  const nextLevelXP = getXPForLevel(level + 1);
  const current = totalXP - currentLevelXP;
  const required = nextLevelXP - currentLevelXP;
  const percentage = required > 0 ? Math.min((current / required) * 100, 100) : 0;
  return { current, required, percentage };
}

export function getCharacterClass(pillars: LifePillar[]): string {
  const totalXP = pillars.reduce((sum, p) => sum + p.current_xp, 0);
  if (totalXP < 500) return 'RECRUIT';

  const pillarXP: Record<string, number> = {};
  for (const p of pillars) {
    pillarXP[p.pillar] = p.current_xp;
  }

  const maxXP = Math.max(...Object.values(pillarXP));
  const avgXP = totalXP / pillars.length;

  if (maxXP < avgXP * 1.3) return 'POLYMATH';

  const dominantPillar = pillars.reduce((a, b) => (a.current_xp > b.current_xp ? a : b)).pillar;

  const classMap: Record<string, string> = {
    mind: 'SCHOLAR',
    body: 'WARRIOR',
    work: 'ENGINEER',
    wealth: 'STRATEGIST',
    spirit: 'MONK',
    social: 'DIPLOMAT',
  };

  return classMap[dominantPillar] || 'RECRUIT';
}

export function getStreakShieldActive(streak: number): boolean {
  return streak >= 7;
}

export function getStreakMilestoneReached(streak: number): number | null {
  const milestones = [3, 7, 14, 30, 60, 100];
  if (milestones.includes(streak)) return streak;
  return null;
}

export function getStreakMilestoneXP(milestone: number): number {
  const rewards: Record<number, number> = {
    3: 50,
    7: 100,
    14: 200,
    30: 500,
    60: 1000,
    100: 2000,
  };
  return rewards[milestone] || 0;
}
