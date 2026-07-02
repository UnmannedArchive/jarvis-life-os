import { Quest, LifePillar, DailyCheckin, Pillar, PILLAR_CONFIG, ActivityLogEntry } from './types';
import { XPHistoryEntry } from '@/stores/useStore';
import { format, subDays, parseISO } from 'date-fns';
import { getFocusPlan, FocusPlan } from './focusAI';
import { parseCheckinFlags } from './checkinFlags';

export interface CoachMessage {
  id: string;
  type: 'greeting' | 'observation' | 'advice' | 'warning' | 'encouragement' | 'focus';
  text: string;
  pillar?: Pillar;
  /** Optional list of quest titles the coach recommends acting on now. */
  questSuggestions?: { id: string; title: string; pillar: Pillar }[];
}

export interface ActivitySummary {
  todayCompleted: number;
  todayTotal: number;
  weekCompleted: number;
  activeDaysThisWeek: number;
  currentStreak: number;
  topPillarThisWeek: { pillar: Pillar; label: string; count: number } | null;
  neglectedPillars: { pillar: Pillar; label: string }[];
  totalXPThisWeek: number;
  todayXP: number;
  drank: boolean;
  smoked: boolean;
  sleepQuality: number | null;
  energyLevel: number | null;
  mood: number | null;
  recentActivity: { action: string; description: string; time: string }[];
  /** When set, coach guidance pivots around this focus. */
  focus: FocusPlan | null;
}

function getDayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getActivitySummary(
  quests: Quest[],
  pillars: LifePillar[],
  xpHistory: XPHistoryEntry[],
  activityLog: ActivityLogEntry[],
  checkin: DailyCheckin | null,
  streak: number,
  dailyIntention: string | null = null,
): ActivitySummary {
  const today = getDayKey(new Date());
  const allPillars: Pillar[] = ['mind', 'body', 'work', 'wealth', 'spirit', 'social'];
  const focus = getFocusPlan(dailyIntention, quests, activityLog);

  const dailyQuests = quests.filter((q) => q.quest_type === 'daily');
  const todayCompleted = dailyQuests.filter((q) => q.completed).length;
  const todayTotal = dailyQuests.length;

  const weekCutoff = subDays(new Date(), 7);
  const weekCompleted = quests.filter((q) =>
    q.completed && q.completed_at && parseISO(q.completed_at) >= weekCutoff
  ).length;

  const weekXP: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const key = getDayKey(subDays(new Date(), i));
    weekXP.push(xpHistory.filter((e) => e.date === key).reduce((s, e) => s + e.xp, 0));
  }
  const activeDaysThisWeek = weekXP.filter((x) => x > 0).length;
  const totalXPThisWeek = weekXP.reduce((a, b) => a + b, 0);
  const todayXP = xpHistory.filter((e) => e.date === today).reduce((s, e) => s + e.xp, 0);

  const pillarCounts: Record<Pillar, number> = { mind: 0, body: 0, work: 0, wealth: 0, spirit: 0, social: 0 };
  for (const q of quests.filter((q) => q.completed && q.completed_at && parseISO(q.completed_at) >= weekCutoff)) {
    pillarCounts[q.pillar]++;
  }

  const topEntry = Object.entries(pillarCounts).sort((a, b) => b[1] - a[1])[0];
  const topPillarThisWeek = topEntry && topEntry[1] > 0
    ? { pillar: topEntry[0] as Pillar, label: PILLAR_CONFIG[topEntry[0] as Pillar].label, count: topEntry[1] }
    : null;

  const neglectedPillars = allPillars
    .filter((p) => pillarCounts[p] === 0)
    .map((p) => ({ pillar: p, label: PILLAR_CONFIG[p].label }));

  const flags = parseCheckinFlags(checkin?.notes);
  const drank = flags.drank;
  const smoked = flags.smoked;

  const recentActivity = activityLog.slice(0, 8).map((entry) => ({
    action: entry.action,
    description: entry.description,
    time: formatTimeAgo(entry.created_at),
  }));

  return {
    todayCompleted,
    todayTotal,
    weekCompleted,
    activeDaysThisWeek,
    currentStreak: streak,
    topPillarThisWeek,
    neglectedPillars,
    totalXPThisWeek,
    todayXP,
    drank,
    smoked,
    sleepQuality: checkin?.sleep_quality ?? null,
    energyLevel: checkin?.energy_level ?? null,
    mood: checkin?.mood ?? null,
    recentActivity,
    focus,
  };
}

function formatTimeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function generateCoachMessages(summary: ActivitySummary): CoachMessage[] {
  const messages: CoachMessage[] = [];
  const hour = new Date().getHours();
  const focus = summary.focus;

  // -------------------------------------------------------------------------
  // Greeting — pivots around the daily focus when one is set, otherwise falls
  // back to time-of-day + wellbeing heuristics.
  // -------------------------------------------------------------------------
  if (focus) {
    if (hour < 12) {
      const usedSubstance = summary.drank || summary.smoked;
      const substanceLabel = summary.drank && summary.smoked
        ? 'drank and smoked'
        : summary.drank
          ? 'drank'
          : 'smoked';
      messages.push({
        id: 'greet',
        type: 'greeting',
        text: usedSubstance
          ? `Locked in on "${focus.intention}". You ${substanceLabel} last night — keep the bar low and hit one focused win first.`
          : (summary.sleepQuality ?? 3) <= 2
            ? `Today is about "${focus.intention}". Sleep was rough — protect one deep block for it and skip the busywork.`
            : `Today is about "${focus.intention}". Start with the highest-impact task below and shut out the rest.`,
      });
    } else if (hour < 17) {
      if (focus.alignmentLabel === 'laser' || focus.alignmentLabel === 'on-track') {
        messages.push({
          id: 'greet',
          type: 'greeting',
          text: `You're tracking "${focus.intention}" well — ${focus.completedRelevant}/${focus.relevantTotal} aligned tasks done. Don't get pulled off it.`,
        });
      } else if (focus.alignmentLabel === 'partial') {
        messages.push({
          id: 'greet',
          type: 'greeting',
          text: `Half the day's gone. You said today is about "${focus.intention}" — finish one more aligned task before you switch context.`,
        });
      } else {
        messages.push({
          id: 'greet',
          type: 'greeting',
          text: `You said today is about "${focus.intention}", but you're drifting. Pick one of the suggested tasks and put 30 min on it now.`,
        });
      }
    } else {
      if (focus.completedRelevant >= Math.max(1, Math.ceil(focus.relevantTotal / 2))) {
        messages.push({
          id: 'greet',
          type: 'greeting',
          text: `Solid focus day on "${focus.intention}". Review what moved the needle and set tomorrow up the same way.`,
        });
      } else {
        messages.push({
          id: 'greet',
          type: 'greeting',
          text: `Evening check on "${focus.intention}". If you only had 20 min left, what one action would make today count? Do that.`,
        });
      }
    }
  } else if (hour < 12) {
    if (summary.drank && summary.smoked) {
      messages.push({ id: 'greet', type: 'greeting', text: 'Morning. You drank and smoked — go slow, hydrate, and don\'t schedule anything cognitively heavy before noon.' });
    } else if (summary.drank) {
      messages.push({ id: 'greet', type: 'greeting', text: 'Morning. Take it easy today — hydrate and start with something light.' });
    } else if (summary.smoked) {
      messages.push({ id: 'greet', type: 'greeting', text: 'Morning. Smoked last night — expect some grogginess. Start with low-friction tasks before anything that needs sharp memory.' });
    } else if ((summary.sleepQuality ?? 3) <= 2) {
      messages.push({ id: 'greet', type: 'greeting', text: 'Rough night. Don\'t force it — focus on one or two key tasks today.' });
    } else {
      messages.push({ id: 'greet', type: 'greeting', text: 'Fresh start. You\'ve got a full day ahead — what\'s the one thing that matters most?' });
    }
  } else if (hour < 17) {
    const pct = summary.todayTotal > 0 ? summary.todayCompleted / summary.todayTotal : 0;
    if (pct >= 0.8) {
      messages.push({ id: 'greet', type: 'greeting', text: 'You\'re crushing it today. Finish strong.' });
    } else if (pct >= 0.4) {
      messages.push({ id: 'greet', type: 'greeting', text: 'Good progress so far. Still time to push through a few more.' });
    } else {
      messages.push({ id: 'greet', type: 'greeting', text: 'The day\'s not over. Even one completed task is better than zero.' });
    }
  } else {
    if (summary.todayCompleted >= summary.todayTotal && summary.todayTotal > 0) {
      messages.push({ id: 'greet', type: 'greeting', text: 'All tasks done. Solid day — time to wind down and recharge.' });
    } else {
      messages.push({ id: 'greet', type: 'greeting', text: 'Evening check-in. How did today go? Review what you accomplished.' });
    }
  }

  // -------------------------------------------------------------------------
  // Focus-driven coaching — only when an intention is set
  // -------------------------------------------------------------------------
  if (focus) {
    if (focus.nextActions.length > 0) {
      const titles = focus.nextActions.map((s) => s.quest.title);
      const lead = titles.length === 1
        ? `Make "${titles[0]}" the next thing you do.`
        : `Plan for "${focus.intention}": run these in order — ${titles.map((t) => `"${t}"`).join(' → ')}.`;
      messages.push({
        id: 'focus-plan',
        type: 'focus',
        text: lead,
        pillar: focus.primaryPillar ?? focus.nextActions[0].quest.pillar,
        questSuggestions: focus.nextActions.map((s) => ({
          id: s.quest.id,
          title: s.quest.title,
          pillar: s.quest.pillar,
        })),
      });
    } else if (focus.relevantTotal === 0) {
      messages.push({
        id: 'focus-no-tasks',
        type: 'focus',
        text: `You haven't queued any tasks aligned with "${focus.intention}". Add 1-3 specific actions you can finish today — vague intentions slip.`,
        pillar: focus.primaryPillar ?? undefined,
      });
    } else if (focus.completedRelevant >= focus.relevantTotal) {
      messages.push({
        id: 'focus-done',
        type: 'encouragement',
        text: `All focus tasks for "${focus.intention}" are done. Either ship one more aligned move or stop and protect the win — don't dilute it.`,
        pillar: focus.primaryPillar ?? undefined,
      });
    }

    if (focus.driftQuests.length >= 2) {
      const sample = focus.driftQuests.slice(0, 2).map((q) => `"${q.title}"`).join(', ');
      messages.push({
        id: 'focus-drift',
        type: 'warning',
        text: `You completed ${focus.driftQuests.length} task${focus.driftQuests.length === 1 ? '' : 's'} today (${sample}) that don't align with "${focus.intention}". Recheck what actually matters before adding more.`,
      });
    }

    if (focus.alignmentLabel === 'on-track' || focus.alignmentLabel === 'laser') {
      messages.push({
        id: 'focus-progress',
        type: 'encouragement',
        text: `${Math.round(focus.alignmentScore * 100)}% focus alignment today — ${focus.completedRelevant}/${focus.relevantTotal} aligned tasks done. This is what a deliberate day looks like.`,
      });
    } else if (focus.alignmentLabel === 'drifting' || focus.alignmentLabel === 'off') {
      messages.push({
        id: 'focus-low',
        type: 'advice',
        text: `Focus alignment is at ${Math.round(focus.alignmentScore * 100)}%. Either reset what "${focus.intention}" really means in tasks, or change the intention — both are fine, drifting silently isn't.`,
      });
    }
  }

  // Observations based on data
  if (summary.drank && summary.smoked) {
    messages.push({
      id: 'substance-combo',
      type: 'warning',
      text: 'You drank and smoked last night. Combined, expect notably reduced REM, working memory, and focus today. Don\'t schedule deep work before lunch.',
    });
  } else if (summary.drank) {
    messages.push({
      id: 'drank',
      type: 'warning',
      text: 'You drank last night. Expect ~15-30% lower focus today. Keep tasks simple and don\'t beat yourself up if output is lower.',
    });
  } else if (summary.smoked) {
    messages.push({
      id: 'smoked',
      type: 'warning',
      text: 'You smoked last night. THC suppresses REM — expect ~10-20% slower recall and attention today. Lean on lists and routines.',
    });
  }

  if (summary.sleepQuality !== null && summary.sleepQuality <= 2) {
    messages.push({
      id: 'sleep',
      type: 'warning',
      text: `Sleep was ${summary.sleepQuality}/5. Poor sleep compounds over days — prioritize rest tonight to avoid a downward spiral.`,
    });
  }

  if (summary.currentStreak >= 7) {
    messages.push({
      id: 'streak',
      type: 'encouragement',
      text: `${summary.currentStreak}-day streak. You\'re building real habits now. Don\'t break the chain.`,
    });
  } else if (summary.currentStreak >= 3) {
    messages.push({
      id: 'streak',
      type: 'encouragement',
      text: `${summary.currentStreak}-day streak going. The first week is the hardest — keep pushing.`,
    });
  }

  if (summary.topPillarThisWeek && summary.topPillarThisWeek.count >= 5) {
    messages.push({
      id: 'top-pillar',
      type: 'observation',
      text: `You\'ve been focused on ${summary.topPillarThisWeek.label} this week (${summary.topPillarThisWeek.count} tasks). Make sure you\'re not neglecting other areas.`,
      pillar: summary.topPillarThisWeek.pillar,
    });
  }

  if (summary.neglectedPillars.length >= 3) {
    const names = summary.neglectedPillars.slice(0, 3).map((p) => p.label).join(', ');
    messages.push({
      id: 'neglected',
      type: 'advice',
      text: `${names} have had zero activity this week. Pick one and add a small task — even 10 minutes counts.`,
    });
  } else if (summary.neglectedPillars.length > 0) {
    const p = summary.neglectedPillars[0];
    messages.push({
      id: 'neglected',
      type: 'advice',
      text: `Your ${p.label} pillar hasn\'t been touched this week. One small action tomorrow would make a difference.`,
      pillar: p.pillar,
    });
  }

  if (summary.activeDaysThisWeek >= 6) {
    messages.push({
      id: 'consistency',
      type: 'encouragement',
      text: `${summary.activeDaysThisWeek}/7 active days this week. Consistency is your edge — most people can\'t sustain this.`,
    });
  } else if (summary.activeDaysThisWeek <= 2) {
    messages.push({
      id: 'consistency',
      type: 'advice',
      text: `Only ${summary.activeDaysThisWeek} active days this week. Aim for at least 4-5. Small daily actions beat big sporadic efforts.`,
    });
  }

  if (summary.weekCompleted >= 20) {
    messages.push({
      id: 'volume',
      type: 'encouragement',
      text: `${summary.weekCompleted} tasks completed this week. That\'s serious output — make sure you\'re also resting.`,
    });
  }

  if (summary.todayTotal === 0) {
    messages.push({
      id: 'no-tasks',
      type: 'advice',
      text: 'You don\'t have any tasks set for today. Add a few to give your day structure.',
    });
  }

  if ((summary.energyLevel ?? 3) >= 4 && !summary.drank && !summary.smoked && (summary.sleepQuality ?? 3) >= 4) {
    messages.push({
      id: 'high-energy',
      type: 'advice',
      text: 'Your energy and sleep are both strong today. This is a good day to tackle something hard or start something new.',
    });
  }

  if (summary.mood !== null && summary.mood <= 2) {
    messages.push({
      id: 'low-mood',
      type: 'advice',
      text: 'Mood is low today. Don\'t force big decisions — focus on routine tasks and be kind to yourself.',
    });
  }

  return messages;
}
