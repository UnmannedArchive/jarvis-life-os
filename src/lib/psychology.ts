import { Pillar, PILLAR_CONFIG } from './types';

// ── Daily Login Bonus (Escalating Rewards / Sunk Cost) ──────────────
// Users get XP just for opening the app. Escalates with consecutive days.
// Creates sunk cost: "I've built up to 50 XP/day, I can't lose that."
export function getLoginBonusXP(consecutiveLogins: number): number {
  if (consecutiveLogins >= 30) return 75;
  if (consecutiveLogins >= 14) return 50;
  if (consecutiveLogins >= 7) return 35;
  if (consecutiveLogins >= 3) return 20;
  return 10;
}

export function getLoginBonusLabel(consecutiveLogins: number): string {
  if (consecutiveLogins >= 30) return 'Legendary Login';
  if (consecutiveLogins >= 14) return 'Loyal User';
  if (consecutiveLogins >= 7) return 'Regular';
  if (consecutiveLogins >= 3) return 'Returning';
  return 'Welcome Back';
}

// ── Critical Hit (Variable Reward Schedule) ─────────────────────────
// 12% chance of 2x XP on any task. Unpredictable rewards are addictive
// (slot machine effect). The POSSIBILITY of a crit keeps users engaged
// even for mundane tasks.
export function rollCriticalHit(): boolean {
  return Math.random() < 0.12;
}

export function getCritMultiplier(): number {
  return 2.0;
}

// ── Tomorrow's Hook (Open Loop / Zeigarnik Effect) ──────────────────
// Always give users a reason to come back. An "open loop" the brain
// wants to close. Different hook each day of the week.
export function getTomorrowHook(
  currentStreak: number,
  pillars: { pillar: Pillar; level: number }[],
  tasksCompleted: number,
): { hook: string; subtext: string } {
  const day = new Date().getDay();
  const weakest = [...pillars].sort((a, b) => a.level - b.level)[0];

  const hooks = [
    {
      hook: 'Fresh Start Monday',
      subtext: 'New week, clean slate. 1.5x XP on your first 3 tasks.',
    },
    {
      hook: `${PILLAR_CONFIG[weakest?.pillar || 'mind'].label} Focus Day`,
      subtext: `Bonus XP for ${PILLAR_CONFIG[weakest?.pillar || 'mind'].label} tasks tomorrow.`,
    },
    {
      hook: 'Streak day ' + (currentStreak + 1),
      subtext: currentStreak >= 6
        ? `Day ${currentStreak + 1} — you're building something real.`
        : 'Keep the chain going.',
    },
    {
      hook: 'Midweek Push',
      subtext: 'Halfway through the week. Finish strong.',
    },
    {
      hook: 'Challenge Thursday',
      subtext: 'Try completing a HARD task for bonus XP.',
    },
    {
      hook: 'Friday Finish Line',
      subtext: 'Close out the week with a perfect day.',
    },
    {
      hook: 'Weekend Warrior',
      subtext: 'Most people rest. You level up.',
    },
  ];

  return hooks[day] || hooks[0];
}

// ── Commitment Device (Cialdini's Consistency Principle) ─────────────
// Once someone publicly commits to a number, they feel internal
// pressure to be consistent with that commitment.
export function getCommitmentMessage(committed: number, completed: number): {
  message: string;
  color: string;
  met: boolean;
} {
  if (completed >= committed) {
    return { message: `Commitment met! ${completed}/${committed} tasks done.`, color: '#3ecf8e', met: true };
  }
  const remaining = committed - completed;
  if (remaining === 1) {
    return { message: `1 more task to hit your commitment.`, color: '#c0c0c0', met: false };
  }
  return { message: `${remaining} tasks to go on your commitment.`, color: '#666666', met: false };
}

// ── End-of-Day Review (Peak-End Rule) ───────────────────────────────
// People remember the PEAK moment and the END of an experience.
// A satisfying daily summary creates positive memory encoding.
export function getDailyGrade(dailyDone: number, dailyTotal: number, sideDone: number, checkedIn: boolean): {
  grade: string;
  label: string;
  color: string;
} {
  if (dailyTotal === 0 && sideDone === 0) return { grade: '--', label: 'No tasks yet', color: '#666666' };
  const pct = dailyTotal > 0 ? dailyDone / dailyTotal : 0;
  const bonus = (checkedIn ? 0.05 : 0) + (sideDone > 0 ? 0.05 : 0);
  const score = pct + bonus;

  if (score >= 1.0) return { grade: 'S', label: 'Perfect', color: '#3ecf8e' };
  if (score >= 0.85) return { grade: 'A', label: 'Excellent', color: '#c0c0c0' };
  if (score >= 0.7) return { grade: 'B', label: 'Good', color: '#b0b0b0' };
  if (score >= 0.5) return { grade: 'C', label: 'Okay', color: '#f0b429' };
  if (score >= 0.25) return { grade: 'D', label: 'Needs work', color: '#f59e0b' };
  return { grade: 'F', label: 'Try again tomorrow', color: '#f25757' };
}

// ── Streak Freeze (What-The-Hell Effect Prevention) ─────────────────
// When users break a streak, many quit entirely ("what's the point?").
// Streak freezes prevent total loss, keeping them in the game.
// Earn 1 freeze per 7-day streak. Max hold: 2.
export function getStreakFreezesEarned(longestStreak: number): number {
  return Math.min(Math.floor(longestStreak / 7), 2);
}

// ── Motivational Quotes (Social Proof / Identity) ───────────────────
// Rotate quotes that reinforce the user's identity as someone who
// follows through. Identity-based habits (James Clear) are strongest.
const QUOTES = [
  { text: 'You don\'t rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'We are what we repeatedly do. Excellence is not an act, but a habit.', author: 'Aristotle' },
  { text: 'Small daily improvements over time lead to stunning results.', author: 'Robin Sharma' },
  { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'You will never always be motivated. You have to learn to be disciplined.', author: '' },
  { text: 'Don\'t count the days. Make the days count.', author: 'Muhammad Ali' },
  { text: 'A year from now you\'ll wish you started today.', author: 'Karen Lamb' },
  { text: 'Consistency beats intensity.', author: '' },
  { text: 'Motion beats meditation.', author: '' },
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: '' },
];

export function getDailyQuote(): { text: string; author: string } {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}
