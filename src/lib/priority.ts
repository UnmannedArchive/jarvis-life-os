import { differenceInDays, isToday, parseISO } from 'date-fns';
import { Quest, LifePillar, DailyCheckin, Pillar } from './types';

const WEIGHTS = {
  urgency: 3,
  streak: 2.5,
  balance: 2,
  energy: 1.5,
  momentum: 1,
};

function getUrgencyScore(quest: Quest): number {
  if (!quest.due_date) return 3;
  const daysUntilDue = differenceInDays(parseISO(quest.due_date), new Date());
  if (daysUntilDue <= 0) return 10;
  if (daysUntilDue <= 1) return 8;
  if (daysUntilDue <= 3) return 6;
  if (daysUntilDue <= 7) return 4;
  return 2;
}

function getStreakRiskScore(quest: Quest, pillars: LifePillar[]): number {
  const pillar = pillars.find((p) => p.pillar === quest.pillar);
  if (!pillar) return 0;
  if (pillar.streak === 0) return 2;
  if (!pillar.last_activity_date) return 5;

  const lastActive = parseISO(pillar.last_activity_date);
  if (!isToday(lastActive)) {
    if (pillar.streak >= 14) return 10;
    if (pillar.streak >= 7) return 8;
    if (pillar.streak >= 3) return 6;
    return 4;
  }
  return 0;
}

function getPillarDeficitScore(quest: Quest, pillars: LifePillar[]): number {
  if (pillars.length === 0) return 5;
  const avgXP = pillars.reduce((s, p) => s + p.current_xp, 0) / pillars.length;
  const pillar = pillars.find((p) => p.pillar === quest.pillar);
  if (!pillar) return 5;
  const deficit = avgXP - pillar.current_xp;
  if (deficit <= 0) return 0;
  const ratio = deficit / Math.max(avgXP, 1);
  return Math.min(Math.round(ratio * 10), 10);
}

function getEnergyMatchScore(quest: Quest, checkin: DailyCheckin | null): number {
  if (!checkin || !checkin.energy_level) return 5;
  const energy = checkin.energy_level;
  const difficultyMap: Record<string, number> = { EASY: 1, MED: 3, HARD: 4, LEGENDARY: 5 };
  const taskDifficulty = difficultyMap[quest.difficulty] || 3;

  if (energy >= 4 && taskDifficulty >= 4) return 8;
  if (energy <= 2 && taskDifficulty <= 2) return 8;
  if (energy >= 4 && taskDifficulty <= 2) return 4;
  if (energy <= 2 && taskDifficulty >= 4) return 2;
  return 5;
}

function getDifficultyFlowScore(quest: Quest, index: number): number {
  const difficultyOrder: Record<string, number> = { EASY: 1, MED: 2, HARD: 3, LEGENDARY: 4 };
  const diff = difficultyOrder[quest.difficulty] || 2;
  const isEvenPosition = index % 2 === 0;
  if (isEvenPosition && diff >= 3) return 4;
  if (!isEvenPosition && diff <= 2) return 4;
  return 2;
}

export function prioritizeQuests(
  quests: Quest[],
  pillars: LifePillar[],
  checkin: DailyCheckin | null,
): Quest[] {
  const scored = quests.map((quest, index) => {
    const score =
      WEIGHTS.urgency * getUrgencyScore(quest) +
      WEIGHTS.streak * getStreakRiskScore(quest, pillars) +
      WEIGHTS.balance * getPillarDeficitScore(quest, pillars) +
      WEIGHTS.energy * getEnergyMatchScore(quest, checkin) +
      WEIGHTS.momentum * getDifficultyFlowScore(quest, index);

    return { quest, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.quest);
}

export function getMissionGrade(
  dailyQuests: Quest[],
  sideQuestsCompleted: number,
  hasCheckedIn: boolean,
): string {
  if (dailyQuests.length === 0) return '--';
  const completed = dailyQuests.filter((q) => q.completed).length;
  const rate = completed / dailyQuests.length;

  if (rate === 1 && sideQuestsCompleted >= 2 && hasCheckedIn) return 'S';
  if (rate >= 0.9 && hasCheckedIn) return 'A';
  if (rate >= 0.7) return 'B';
  if (rate >= 0.5) return 'C';
  if (rate >= 0.25) return 'D';
  return 'F';
}

export function getGreeting(name: string): { greeting: string; timeOfDay: string } {
  const hour = new Date().getHours();
  let timeOfDay: string;
  if (hour < 5) timeOfDay = 'night';
  else if (hour < 12) timeOfDay = 'morning';
  else if (hour < 17) timeOfDay = 'afternoon';
  else if (hour < 21) timeOfDay = 'evening';
  else timeOfDay = 'night';

  const greetingMap: Record<string, string> = {
    morning: 'GOOD MORNING',
    afternoon: 'GOOD AFTERNOON',
    evening: 'GOOD EVENING',
    night: 'GOOD EVENING',
  };

  return {
    greeting: `${greetingMap[timeOfDay]}, ${name.toUpperCase()}.`,
    timeOfDay,
  };
}

export function getContextualInsight(
  pillars: LifePillar[],
  streak: number,
  questsCompletedYesterday: number,
): string {
  const insights: string[] = [];

  if (streak > 0) {
    insights.push(`You're on a ${streak}-day streak. Keep it going.`);
  }

  if (pillars.length > 0) {
    const avgXP = pillars.reduce((s, p) => s + p.current_xp, 0) / pillars.length;
    const weakest = pillars.reduce((a, b) => (a.current_xp < b.current_xp ? a : b));
    if (weakest.current_xp < avgXP * 0.7) {
      const label = weakest.pillar.charAt(0).toUpperCase() + weakest.pillar.slice(1);
      insights.push(`Your ${label} pillar is running low. Time to focus there.`);
    }
  }

  if (questsCompletedYesterday > 0) {
    insights.push(`${questsCompletedYesterday} quests completed yesterday. Solid work.`);
  }

  if (insights.length === 0) {
    insights.push('All systems operational. Ready to begin.');
  }

  return insights[0];
}
