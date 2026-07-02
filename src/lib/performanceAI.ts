import { Quest, LifePillar, DailyCheckin, Pillar, PILLAR_CONFIG, ActivityLogEntry } from './types';
import { XPHistoryEntry } from '@/stores/useStore';
import { format, subDays, parseISO, differenceInDays } from 'date-fns';
import { getFocusPlan, FocusPlan } from './focusAI';
import { parseCheckinFlags, getWellbeingPenalty } from './checkinFlags';

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
  /** Focus alignment for the day's stated intention (null when none set). */
  focus: {
    intention: string;
    alignment: number; // 0-100
    label: FocusPlan['alignmentLabel'];
    completedRelevant: number;
    relevantTotal: number;
  } | null;
}

// ---------------------------------------------------------------------------
// Scoring methodology — evidence-based weights
//
// 1. COMPLETION RATE (30%)
//    Goal-setting theory (Locke & Latham, 2002) identifies progress toward
//    specific goals as the strongest predictor of motivation and performance.
//
// 2. CONSISTENCY (25%)
//    Habit research (Lally et al., 2010, European Journal of Social Psychology)
//    found automaticity plateaus around 66 days of consistent daily behavior.
//    Active days per week is the best short-term consistency proxy.
//
// 3. LIFE BALANCE (20%)
//    Seligman's PERMA model and research on role balance (Marks & MacDermid,
//    1996) show that balanced engagement across life domains predicts higher
//    well-being and sustained performance vs. hyper-focus on one area.
//    Measured via coefficient of variation across pillar activity.
//
// 4. VOLUME / EFFORT (15%)
//    Weekly throughput — raw count of completed tasks normalized against a
//    reasonable baseline (2 tasks/day = 14/week). Captures engagement level.
//
// 5. WELLBEING (10%)
//    Sleep quality, energy, and mood are established modulators of cognitive
//    performance (Walker, 2017 "Why We Sleep"; Boksem & Tops, 2008 on
//    mental fatigue). Alcohol the prior night impairs sleep architecture
//    (Ebrahim et al., 2013, Alcoholism: Clinical and Experimental Research)
//    and next-day executive function (Howland et al., 2010). Applied as a
//    modifier rather than a standalone score.
//
// STREAK BONUS (up to +8 points, logarithmic diminishing returns)
//    Streaks are a *consequence* of good performance, not a cause. Treated
//    as a bonus multiplier. Logarithmic scaling reflects that the motivational
//    benefit of a streak plateaus after ~30 days (habit is largely formed).
// ---------------------------------------------------------------------------

const WEIGHTS = {
  completion: 0.30,
  consistency: 0.25,
  balance: 0.20,
  volume: 0.15,
  wellbeing: 0.10,
};

function getDayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
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
  if (firstHalf === 0 && secondHalf === 0) return 'flat';
  const diff = secondHalf - firstHalf;
  const base = Math.max(firstHalf, 1);
  if (diff > base * 0.15) return 'up';
  if (diff < -base * 0.15) return 'down';
  return 'flat';
}

function getPillarActivity(quests: Quest[], pillar: Pillar, days: number): number {
  const cutoff = subDays(new Date(), days);
  return quests.filter((q) =>
    q.pillar === pillar && q.completed && q.completed_at && parseISO(q.completed_at) >= cutoff
  ).length;
}

// Coefficient of variation — lower = more balanced (0 = perfect balance)
function getBalanceScore(activities: number[]): number {
  const total = activities.reduce((a, b) => a + b, 0);
  if (total === 0) return 50;
  const mean = total / activities.length;
  const variance = activities.reduce((s, v) => s + (v - mean) ** 2, 0) / activities.length;
  const cv = Math.sqrt(variance) / mean;
  // CV of 0 = perfectly balanced (100), CV of 1+ = very imbalanced (0)
  return Math.max(0, Math.min(100, (1 - cv) * 100));
}

// Wellbeing score based on check-in data
// Sleep, energy, mood each on 1-5 scale → normalized to 0-100
// Alcohol penalty: -15 points (Ebrahim et al. 2013 — alcohol reduces
// restorative sleep by ~20-40% and impairs next-day performance)
// Cannabis penalty: -10 points (Schierenbeck et al. 2008 — THC suppresses REM
// sleep; Crean et al. 2011 — next-day working memory + attention impairment)
// Combined penalties stack since the mechanisms (REM disruption, executive
// function) compound rather than overlap.
function getWellbeingScore(checkin: DailyCheckin | null): number {
  if (!checkin) return 50; // neutral when no data
  const sleep = ((checkin.sleep_quality ?? 3) - 1) / 4; // 0-1
  const energy = ((checkin.energy_level ?? 3) - 1) / 4;
  const mood = ((checkin.mood ?? 3) - 1) / 4;

  // Sleep has the strongest evidence for cognitive performance impact
  // Walker (2017): sleep quality accounts for ~40% of next-day performance variance
  // Boksem & Tops (2008): energy/fatigue accounts for ~35%
  // Mood: ~25% (Isen, 2001 — positive affect and decision making)
  const base = (sleep * 0.40 + energy * 0.35 + mood * 0.25) * 100;

  const flags = parseCheckinFlags(checkin.notes);
  const penalty = getWellbeingPenalty(flags);

  return Math.max(0, Math.min(100, base - penalty));
}

// Streak bonus: logarithmic diminishing returns, max +8 points
function getStreakBonus(streak: number): number {
  if (streak <= 0) return 0;
  // ln(streak + 1) / ln(31) * 8 → streak of 30 ≈ 8 points
  return Math.min(8, (Math.log(streak + 1) / Math.log(31)) * 8);
}

export function computePerformance(
  quests: Quest[],
  pillars: LifePillar[],
  xpHistory: XPHistoryEntry[],
  activityLog: ActivityLogEntry[],
  streak: number,
  consecutiveLogins: number,
  checkin?: DailyCheckin | null,
  dailyIntention: string | null = null,
): PerformanceReport {
  const allPillars: Pillar[] = ['mind', 'body', 'work', 'wealth', 'spirit', 'social'];
  const today = getDayKey(new Date());
  const focusPlan = getFocusPlan(dailyIntention, quests, activityLog);

  // --- Today's stats ---
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

  // --- 1. Completion rate (30%) ---
  const completionScore = todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 50;

  // --- 2. Consistency — active days out of last 7 (25%) ---
  const weekXP = getXPPerDay(xpHistory, 7);
  const activeDays = weekXP.filter((x) => x > 0).length;
  const consistencyScore = (activeDays / 7) * 100;

  // --- 3. Life balance — CV across pillar activity in 7 days (20%) ---
  const pillarActivities = allPillars.map((p) => getPillarActivity(quests, p, 7));
  const balanceScore = getBalanceScore(pillarActivities);

  // --- 4. Volume — weekly completed / 14 baseline (15%) ---
  const weeklyCompleted = quests.filter((q) => {
    if (!q.completed || !q.completed_at) return false;
    return differenceInDays(new Date(), parseISO(q.completed_at)) <= 7;
  }).length;
  const volumeScore = Math.min((weeklyCompleted / 14) * 100, 100);

  // --- 5. Wellbeing — sleep/energy/mood/alcohol (10%) ---
  const wellbeingScore = getWellbeingScore(checkin ?? null);

  // --- Composite ---
  // When the user has explicitly stated a daily focus, we (a) blend a focus
  // alignment subscore in and (b) soften the balance penalty — deliberate
  // narrow focus is the *point* of stating an intention, so a low CV across
  // pillars on a focus day shouldn't tank performance.
  let weighted: number;
  if (focusPlan) {
    const focusAlignmentScore = focusPlan.alignmentScore * 100;
    // Soften balance: pull it halfway toward 70 to neutralize unfair penalty.
    const softenedBalance = balanceScore * 0.5 + 70 * 0.5;
    // Reweight: pull a bit from balance + completion into a new "focus" slot.
    weighted =
      completionScore * 0.25 +
      consistencyScore * WEIGHTS.consistency +
      softenedBalance * 0.10 +
      volumeScore * WEIGHTS.volume +
      wellbeingScore * WEIGHTS.wellbeing +
      focusAlignmentScore * 0.15;
  } else {
    weighted =
      completionScore * WEIGHTS.completion +
      consistencyScore * WEIGHTS.consistency +
      balanceScore * WEIGHTS.balance +
      volumeScore * WEIGHTS.volume +
      wellbeingScore * WEIGHTS.wellbeing;
  }

  const streakBonus = getStreakBonus(streak);
  const score = Math.round(Math.max(0, Math.min(100, weighted + streakBonus)));

  let rating: Rating;
  let label: string;
  if (score >= 90) { rating = 'S'; label = 'Elite'; }
  else if (score >= 75) { rating = 'A'; label = 'Excellent'; }
  else if (score >= 60) { rating = 'B'; label = 'Good'; }
  else if (score >= 40) { rating = 'C'; label = 'Average'; }
  else if (score >= 20) { rating = 'D'; label = 'Needs Work'; }
  else { rating = 'F'; label = 'Getting Started'; }

  // --- Weekly trend ---
  const weeklyTrend = getTrend(weekXP) === 'up' ? 'improving' : getTrend(weekXP) === 'down' ? 'declining' : 'steady';

  // --- Per-pillar scores (continuous, not step functions) ---
  const pillarScores = allPillars.map((p) => {
    const pillarData = pillars.find((pl) => pl.pillar === p);
    const activity7d = getPillarActivity(quests, p, 7);
    const activity3d = getPillarActivity(quests, p, 3);
    const activityPrev = activity7d - activity3d;

    // Continuous scale: 1 task/day = 100%, normalized to 7 days
    let pScore = Math.min((activity7d / 7) * 100, 100);

    // Streak bonus for this pillar (up to +10)
    if (pillarData && pillarData.streak > 3) {
      pScore = Math.min(pScore + Math.min(pillarData.streak, 10), 100);
    }

    let trend: 'up' | 'down' | 'flat';
    if (activityPrev === 0 && activity3d === 0) trend = 'flat';
    else if (activityPrev === 0 && activity3d > 0) trend = 'up';
    else if (activity3d > activityPrev * 0.6) trend = 'up';
    else if (activity3d < activityPrev * 0.3 && activityPrev > 0) trend = 'down';
    else trend = 'flat';

    return {
      pillar: p,
      label: PILLAR_CONFIG[p].label,
      score: Math.round(pScore),
      trend,
    };
  });

  // --- Insights ---
  const insights: Insight[] = [];
  const flags = parseCheckinFlags(checkin?.notes);
  const drank = flags.drank;
  const smoked = flags.smoked;

  // Strengths
  const strongPillars = pillarScores.filter((p) => p.score >= 60);
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
      text: `${streak}-day streak! Research shows habits solidify around 66 days — keep building.`,
    });
  }

  if (completionScore >= 80 && todayTotal > 0) {
    insights.push({
      type: 'strength',
      text: `${todayCompleted}/${todayTotal} tasks done today. High completion rates predict long-term goal achievement.`,
    });
  }

  if (weeklyTrend === 'improving') {
    insights.push({
      type: 'strength',
      text: 'Your output is trending upward this week.',
    });
  }

  if (wellbeingScore >= 75 && checkin) {
    insights.push({
      type: 'strength',
      text: 'Good self-care today. High sleep + energy correlates with better task performance.',
    });
  }

  // Weaknesses
  const weakPillars = pillarScores.filter((p) => p.score <= 15);
  for (const wp of weakPillars.slice(0, 2)) {
    insights.push({
      type: 'weakness',
      text: `${wp.label} has had no activity in 7 days. Neglected areas tend to compound.`,
      pillar: wp.pillar,
    });
  }

  const decliningPillars = pillarScores.filter((p) => p.trend === 'down' && p.score > 15);
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

  if (drank && smoked) {
    insights.push({
      type: 'weakness',
      text: 'Alcohol + cannabis last night — REM sleep is heavily disrupted. Expect compounded ~25-40% impact on focus, recall, and decision quality today.',
    });
  } else if (drank) {
    insights.push({
      type: 'weakness',
      text: 'Alcohol last night — expect reduced sleep quality and ~15-30% lower cognitive performance today (Ebrahim et al., 2013).',
    });
  } else if (smoked) {
    insights.push({
      type: 'weakness',
      text: 'Cannabis last night — THC suppresses REM, impairing memory consolidation and next-day attention by ~10-20% (Schierenbeck et al., 2008).',
    });
  }

  if (checkin && (checkin.sleep_quality ?? 3) <= 2) {
    insights.push({
      type: 'weakness',
      text: 'Poor sleep. Research shows even one bad night can reduce focus and decision-making by 20-40%.',
    });
  }

  if (balanceScore < 30 && weeklyCompleted > 5) {
    insights.push({
      type: 'weakness',
      text: 'Your pillars are heavily imbalanced. Balanced effort across life domains predicts higher well-being.',
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
      text: 'Your output has been dropping. Small consistent effort beats sporadic intensity.',
    });
  }

  // Tips
  if (todayTotal === 0) {
    insights.push({
      type: 'tip',
      text: 'Add some daily tasks to start tracking your performance.',
    });
  }

  if ((drank || smoked) && (checkin?.energy_level ?? 3) <= 3) {
    insights.push({
      type: 'tip',
      text: 'On recovery days, tackle easy tasks first. Low-friction wins maintain momentum.',
    });
  }

  if (weakPillars.length > 0 && insights.filter((i) => i.type === 'tip').length === 0) {
    const wp = weakPillars[0];
    insights.push({
      type: 'tip',
      text: `Add one small ${wp.label.toLowerCase()} task tomorrow. Micro-habits are the most reliable way to build new routines.`,
      pillar: wp.pillar,
    });
  }

  if (activeDays < 4 && insights.filter((i) => i.type === 'tip').length < 2) {
    insights.push({
      type: 'tip',
      text: 'Aim for 5+ active days per week. Consistency matters more than intensity.',
    });
  }

  // --- Focus alignment insights ---
  if (focusPlan) {
    const alignmentPct = Math.round(focusPlan.alignmentScore * 100);
    if (focusPlan.alignmentLabel === 'laser') {
      insights.unshift({
        type: 'strength',
        text: `Laser-focused on "${focusPlan.intention}" — ${alignmentPct}% alignment. Stated intent matches actual output, the rarest skill.`,
        pillar: focusPlan.primaryPillar ?? undefined,
      });
    } else if (focusPlan.alignmentLabel === 'on-track') {
      insights.unshift({
        type: 'strength',
        text: `On track with "${focusPlan.intention}" — ${focusPlan.completedRelevant}/${focusPlan.relevantTotal} aligned tasks done.`,
        pillar: focusPlan.primaryPillar ?? undefined,
      });
    } else if (focusPlan.alignmentLabel === 'drifting' || focusPlan.alignmentLabel === 'off') {
      insights.push({
        type: 'weakness',
        text: `Only ${alignmentPct}% of today's effort matches "${focusPlan.intention}". Either reset the plan or restate the focus.`,
      });
    }

    if (focusPlan.driftQuests.length >= 2) {
      insights.push({
        type: 'tip',
        text: `${focusPlan.driftQuests.length} off-focus tasks closed today. Triage tomorrow's list against your intention before you start.`,
      });
    }

    if (focusPlan.relevantTotal === 0) {
      insights.push({
        type: 'tip',
        text: `No tasks queued match "${focusPlan.intention}". Add 1-3 specific actions you can finish — vague intentions evaporate.`,
      });
    }
  }

  // Summary — when focus is set, lean the summary toward focus alignment.
  let summary: string;
  if (focusPlan) {
    const pct = Math.round(focusPlan.alignmentScore * 100);
    if (score >= 75 && pct >= 65) summary = `Tight execution on "${focusPlan.intention}". This is the version of you that ships.`;
    else if (score >= 60) summary = `Solid day, focus alignment at ${pct}%. Tighten the link between intention and tasks.`;
    else if (pct < 40) summary = `Output exists but it's drifting from "${focusPlan.intention}". Realign or restate.`;
    else summary = 'Decent effort but room for growth. Focus on consistency.';
  } else if (score >= 85) summary = 'Outstanding performance across the board.';
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
    focus: focusPlan
      ? {
          intention: focusPlan.intention,
          alignment: Math.round(focusPlan.alignmentScore * 100),
          label: focusPlan.alignmentLabel,
          completedRelevant: focusPlan.completedRelevant,
          relevantTotal: focusPlan.relevantTotal,
        }
      : null,
  };
}
