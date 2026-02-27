import { Quest, LifePillar, Pillar, PILLAR_CONFIG, ActivityLogEntry } from './types';
import { XPHistoryEntry } from '@/stores/useStore';
import { format, subDays, parseISO, isToday, differenceInDays } from 'date-fns';

export type Rating = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

export interface Insight {
  type: 'strength' | 'weakness' | 'tip';
  text: string;
  pillar?: Pillar;
}

export interface PerformanceReport {
  rating: Rating;
  score: number;
  label: string;
  summary: string;
  insights: Insight[];
  pillarScores: { pillar: Pillar; label: string; score: number; trend: 'up' | 'down' | 'flat' }[];
  todayStats: {
    completed: number;
    total: number;
    xpEarned: number;
    bestPillar: Pillar | null;
    neglectedPillar: Pillar | null;
  };
  weeklyTrend: 'improving' | 'declining' | 'steady';
}

function getDayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

function getCompletionRate(quests: Quest[], days: number): number {
  const cutoff = subDays(new Date(), days);
  const relevant = quests.filter((q) => {
    if (q.quest_type !== 'daily') return false;
    const created = parseISO(q.created_at);
    return created >= cutoff;
  });
  if (relevant.length === 0) return 0;
  const done = relevant.filter((q) => q.completed).length;
  return done / relevant.length;
}

function getXPPerDay(xpHistory: XPHistoryEntry[], days: number): number[] {
  const result: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = getDayKey(subDays(new Date(), i));
    const dayXP = xpHistory
      .filter((e) => e.date === key)
      .reduce((sum, e) => sum + e.xp, 0);
    result.push(dayXP);
  }
  return result;
}

function getTrend(values: number[]): 'up' | 'down' | 'flat' {
  if (values.length < 3) return 'flat';
  const half = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, half).reduce((a, b) => a + b, 0) / half;
  const secondHalf = values.slice(half).reduce((a, b) => a + b, 0) / (values.length - half);
  const diff = secondHalf - firstHalf;
  if (diff > firstHalf * 0.15) return 'up';
  if (diff < -firstHalf * 0.15) return 'down';
  return 'flat';
}

function getPillarActivity(quests: Quest[], pillar: Pillar, days: number): number {
  const cutoff = subDays(new Date(), days);
  return quests.filter((q) =>
    q.pillar === pillar && q.completed && q.completed_at && parseISO(q.completed_at) >= cutoff
  ).length;
}

export function computePerformance(
  quests: Quest[],
  pillars: LifePillar[],
  xpHistory: XPHistoryEntry[],
  activityLog: ActivityLogEntry[],
  streak: number,
  consecutiveLogins: number,
): PerformanceReport {
  const allPillars: Pillar[] = ['mind', 'body', 'work', 'wealth', 'spirit', 'social'];
  const today = getDayKey(new Date());

  // Today's stats
  const todayQuests = quests.filter((q) => q.quest_type === 'daily');
  const todayCompleted = todayQuests.filter((q) => q.completed).length;
  const todayTotal = todayQuests.length;
  const todayXP = xpHistory
    .filter((e) => e.date === today)
    .reduce((sum, e) => sum + e.xp, 0);

  const todayPillarCounts: Record<string, number> = {};
  for (const q of quests.filter((q) => q.completed && q.completed_at)) {
    const d = getDayKey(parseISO(q.completed_at!));
    if (d === today) {
      todayPillarCounts[q.pillar] = (todayPillarCounts[q.pillar] || 0) + 1;
    }
  }

  const bestPillar = Object.entries(todayPillarCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Pillar || null;

  const activePillarsToday = new Set(Object.keys(todayPillarCounts));
  const neglectedPillar = allPillars.find((p) => !activePillarsToday.has(p) && pillars.find((pl) => pl.pillar === p)) || null;

  // Scoring dimensions (0-100 each)
  // 1. Completion rate (today)
  const completionScore = todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 50;

  // 2. Consistency (7-day XP trend)
  const weekXP = getXPPerDay(xpHistory, 7);
  const activeDays = weekXP.filter((x) => x > 0).length;
  const consistencyScore = (activeDays / 7) * 100;

  // 3. Streak bonus
  const streakScore = Math.min(streak * 8, 100);

  // 4. Pillar balance
  const pillarActivities = allPillars.map((p) => getPillarActivity(quests, p, 7));
  const maxPillarAct = Math.max(...pillarActivities, 1);
  const minPillarAct = Math.min(...pillarActivities);
  const balanceRatio = maxPillarAct > 0 ? minPillarAct / maxPillarAct : 0;
  const balanceScore = balanceRatio * 100;

  // 5. Volume (how much you're doing)
  const weeklyCompleted = quests.filter((q) => {
    if (!q.completed || !q.completed_at) return false;
    return differenceInDays(new Date(), parseISO(q.completed_at)) <= 7;
  }).length;
  const volumeScore = Math.min((weeklyCompleted / 14) * 100, 100);

  // 6. Login consistency
  const loginScore = Math.min(consecutiveLogins * 12, 100);

  // Weighted composite
  const composite =
    completionScore * 0.25 +
    consistencyScore * 0.20 +
    streakScore * 0.15 +
    balanceScore * 0.10 +
    volumeScore * 0.20 +
    loginScore * 0.10;

  const score = Math.round(Math.max(0, Math.min(100, composite)));

  let rating: Rating;
  let label: string;
  if (score >= 90) { rating = 'S'; label = 'Elite'; }
  else if (score >= 75) { rating = 'A'; label = 'Excellent'; }
  else if (score >= 60) { rating = 'B'; label = 'Good'; }
  else if (score >= 40) { rating = 'C'; label = 'Average'; }
  else if (score >= 20) { rating = 'D'; label = 'Needs Work'; }
  else { rating = 'F'; label = 'Getting Started'; }

  // Weekly trend
  const weeklyTrend = getTrend(weekXP) === 'up' ? 'improving' : getTrend(weekXP) === 'down' ? 'declining' : 'steady';

  // Per-pillar scores
  const pillarScores = allPillars.map((p) => {
    const pillarData = pillars.find((pl) => pl.pillar === p);
    const activity7d = getPillarActivity(quests, p, 7);
    const activity3d = getPillarActivity(quests, p, 3);
    const activityPrev = getPillarActivity(quests, p, 7) - activity3d;

    let pScore: number;
    if (activity7d >= 7) pScore = 90;
    else if (activity7d >= 5) pScore = 75;
    else if (activity7d >= 3) pScore = 55;
    else if (activity7d >= 1) pScore = 30;
    else pScore = 5;

    if (pillarData && pillarData.streak > 3) pScore = Math.min(pScore + 10, 100);

    let trend: 'up' | 'down' | 'flat';
    if (activity3d > activityPrev * 0.6) trend = 'up';
    else if (activity3d < activityPrev * 0.3 && activityPrev > 0) trend = 'down';
    else trend = 'flat';

    return {
      pillar: p,
      label: PILLAR_CONFIG[p].label,
      score: pScore,
      trend,
    };
  });

  // Generate insights
  const insights: Insight[] = [];

  // Strengths
  const strongPillars = pillarScores.filter((p) => p.score >= 70);
  if (strongPillars.length > 0) {
    const best = strongPillars.sort((a, b) => b.score - a.score)[0];
    insights.push({
      type: 'strength',
      text: `Your ${best.label} game is strong — ${getPillarActivity(quests, best.pillar, 7)} tasks completed this week.`,
      pillar: best.pillar,
    });
  }

  if (streak >= 3) {
    insights.push({
      type: 'strength',
      text: `${streak}-day streak! Consistency is your superpower right now.`,
    });
  }

  if (completionScore >= 80 && todayTotal > 0) {
    insights.push({
      type: 'strength',
      text: `Crushing it today — ${todayCompleted}/${todayTotal} tasks done.`,
    });
  }

  if (weeklyTrend === 'improving') {
    insights.push({
      type: 'strength',
      text: 'Your XP output is trending upward this week. Keep the momentum.',
    });
  }

  // Weaknesses
  const weakPillars = pillarScores.filter((p) => p.score <= 20);
  for (const wp of weakPillars.slice(0, 2)) {
    insights.push({
      type: 'weakness',
      text: `${wp.label} has been neglected — 0 tasks completed in 7 days.`,
      pillar: wp.pillar,
    });
  }

  const decliningPillars = pillarScores.filter((p) => p.trend === 'down' && p.score > 20);
  for (const dp of decliningPillars.slice(0, 1)) {
    insights.push({
      type: 'weakness',
      text: `${dp.label} activity is declining compared to earlier this week.`,
      pillar: dp.pillar,
    });
  }

  if (completionScore < 40 && todayTotal > 0) {
    insights.push({
      type: 'weakness',
      text: `Only ${todayCompleted}/${todayTotal} daily tasks done. You're falling behind today.`,
    });
  }

  if (streak === 0) {
    insights.push({
      type: 'weakness',
      text: 'No active streak. Complete a task to start building one.',
    });
  }

  if (weeklyTrend === 'declining') {
    insights.push({
      type: 'weakness',
      text: 'Your output has been dropping this week. Time to refocus.',
    });
  }

  if (balanceScore < 30 && weeklyCompleted > 5) {
    insights.push({
      type: 'weakness',
      text: 'Your life pillars are heavily imbalanced. Spread your effort more evenly.',
    });
  }

  // Tips
  if (todayTotal === 0) {
    insights.push({
      type: 'tip',
      text: 'Add some daily tasks to start tracking your performance.',
    });
  }

  if (weakPillars.length > 0 && insights.filter((i) => i.type === 'tip').length === 0) {
    const wp = weakPillars[0];
    insights.push({
      type: 'tip',
      text: `Try adding one small ${wp.label.toLowerCase()} task tomorrow to start building that area.`,
      pillar: wp.pillar,
    });
  }

  if (consecutiveLogins < 3 && insights.filter((i) => i.type === 'tip').length < 2) {
    insights.push({
      type: 'tip',
      text: 'Log in daily to build momentum. Consistency beats intensity.',
    });
  }

  // Summary
  let summary: string;
  if (score >= 85) summary = 'Outstanding performance across the board.';
  else if (score >= 70) summary = 'Strong showing. A few areas could use attention.';
  else if (score >= 50) summary = 'Decent effort but room for growth. Focus on consistency.';
  else if (score >= 30) summary = 'Below your potential. Pick one area to improve this week.';
  else summary = 'Just getting started. Every task completed is progress.';

  return {
    rating,
    score,
    label,
    summary,
    insights,
    pillarScores,
    todayStats: {
      completed: todayCompleted,
      total: todayTotal,
      xpEarned: todayXP,
      bestPillar,
      neglectedPillar,
    },
    weeklyTrend,
  };
}
