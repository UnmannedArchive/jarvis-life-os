import { Quest, Pillar, PILLAR_CONFIG } from './types';

export interface JournalEntry {
  id: string;
  text: string;
  date: string;
  analysis: ReflectionAnalysis | null;
}

export interface ReflectionAnalysis {
  mood: 'positive' | 'mixed' | 'tough';
  moodLabel: string;
  themes: string[];
  pillarConnection: Pillar | null;
  affirmation: string;
  insight: string;
  actionSuggestion: string;
}

const POSITIVE_WORDS = [
  'great', 'amazing', 'awesome', 'happy', 'proud', 'accomplished', 'good', 'best',
  'excited', 'grateful', 'thankful', 'love', 'won', 'success', 'nailed', 'crushed',
  'productive', 'inspired', 'motivated', 'peaceful', 'calm', 'strong', 'confident',
  'progress', 'breakthrough', 'milestone', 'celebrate', 'joy', 'smile', 'fun',
  'learned', 'grew', 'improved', 'healthy', 'connected', 'supported',
];

const TOUGH_WORDS = [
  'stressed', 'anxious', 'overwhelmed', 'tired', 'exhausted', 'frustrated', 'angry',
  'sad', 'lonely', 'lost', 'confused', 'failed', 'struggle', 'hard', 'difficult',
  'worried', 'scared', 'stuck', 'burned', 'burnout', 'drained', 'unmotivated',
  'procrastinated', 'behind', 'missed', 'regret', 'disappointed', 'hurt', 'rough',
  'terrible', 'worst', 'hate', 'quit', 'gave up', 'can\'t', 'nothing', 'useless',
  'boring', 'pointless', 'wasted', 'broke', 'sick', 'pain',
];

const THEME_KEYWORDS: Record<string, string[]> = {
  'Productivity': ['work', 'task', 'project', 'deadline', 'meeting', 'done', 'finished', 'productive', 'focus', 'code', 'build', 'ship'],
  'Relationships': ['friend', 'family', 'partner', 'mom', 'dad', 'talk', 'connect', 'argue', 'support', 'date', 'people', 'social'],
  'Health': ['gym', 'workout', 'run', 'sleep', 'eat', 'cook', 'walk', 'exercise', 'tired', 'energy', 'sick', 'body', 'weight'],
  'Growth': ['learn', 'read', 'study', 'course', 'skill', 'improve', 'practice', 'grow', 'challenge', 'think', 'idea'],
  'Money': ['money', 'save', 'spend', 'invest', 'pay', 'bill', 'budget', 'income', 'job', 'salary', 'afford', 'expensive'],
  'Wellbeing': ['meditat', 'journal', 'grateful', 'reflect', 'peace', 'calm', 'breath', 'relax', 'break', 'rest', 'mindful', 'therapy'],
  'Stress': ['stress', 'anxious', 'overwhelm', 'pressure', 'worry', 'burnout', 'too much', 'can\'t cope'],
};

const PILLAR_SIGNALS: Record<Pillar, string[]> = {
  mind: ['learn', 'read', 'study', 'think', 'idea', 'book', 'course', 'brain', 'knowledge', 'research'],
  body: ['gym', 'workout', 'run', 'sleep', 'eat', 'health', 'exercise', 'walk', 'tired', 'energy', 'body'],
  work: ['work', 'project', 'deadline', 'meeting', 'code', 'ship', 'build', 'task', 'productive', 'job', 'career'],
  wealth: ['money', 'save', 'invest', 'budget', 'income', 'pay', 'bill', 'afford', 'financial'],
  spirit: ['meditat', 'journal', 'grateful', 'reflect', 'peace', 'purpose', 'meaning', 'pray', 'mindful'],
  social: ['friend', 'family', 'partner', 'people', 'talk', 'connect', 'date', 'social', 'community', 'help'],
};

const AFFIRMATIONS_POSITIVE = [
  'You\'re doing better than you think. Keep going.',
  'Today proved you\'re capable of great things.',
  'Momentum is built one good day at a time — you\'re building it.',
  'The fact that you showed up and put in the work says everything.',
  'You earned this. Don\'t downplay your wins.',
];

const AFFIRMATIONS_MIXED = [
  'Not every day will be perfect, and that\'s fine. You still showed up.',
  'Progress isn\'t linear. The ups and downs are part of the process.',
  'Give yourself credit for the parts that went well today.',
  'A mixed day is still a day you didn\'t waste. That matters.',
  'Balance takes time. You\'re closer than you were yesterday.',
];

const AFFIRMATIONS_TOUGH = [
  'Rough days don\'t define you. How you respond tomorrow does.',
  'It\'s okay to have a hard day. Rest, reset, and come back.',
  'You\'re allowed to struggle. That doesn\'t make you weak — it makes you human.',
  'One bad day doesn\'t erase your progress. You\'ve come further than you think.',
  'Sometimes the bravest thing is just getting through the day. You did that.',
];

const INSIGHTS_POSITIVE = [
  'When you feel this good, write down what caused it. Repeat those actions.',
  'Positive momentum compounds — ride this wave into tomorrow.',
  'Notice what\'s working and double down on it.',
];

const INSIGHTS_MIXED = [
  'Identify what drained you today and what energized you. Do less of one, more of the other.',
  'Mixed days often mean you\'re pushing your limits. That\'s growth.',
  'Try starting tomorrow with the thing that went well today.',
];

const INSIGHTS_TOUGH = [
  'When things feel heavy, focus on just one small win tomorrow. That\'s enough.',
  'Check in with yourself: are you sleeping enough? Eating well? The basics matter most.',
  'Consider talking to someone you trust about what\'s weighing on you.',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getActionSuggestion(mood: string, themes: string[], pillar: Pillar | null): string {
  if (mood === 'tough') {
    if (themes.includes('Stress')) return 'Try a 5-minute breathing exercise before bed tonight.';
    if (themes.includes('Health')) return 'Prioritize sleep tonight — everything feels heavier when you\'re tired.';
    if (themes.includes('Relationships')) return 'Reach out to one person tomorrow, even with just a simple message.';
    return 'Pick one small task tomorrow and do only that. Small wins rebuild momentum.';
  }
  if (mood === 'positive') {
    if (pillar) return `You\'re strong in ${PILLAR_CONFIG[pillar].label} — consider stretching into a weaker area tomorrow.`;
    return 'Capture this energy: set tomorrow\'s intention before you sleep.';
  }
  if (pillar) return `Spend 15 minutes on ${PILLAR_CONFIG[pillar].label} tomorrow to keep building.`;
  return 'Before bed, write down the one thing you want to accomplish tomorrow.';
}

export function analyzeReflection(text: string, quests: Quest[]): ReflectionAnalysis {
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);

  const posCount = POSITIVE_WORDS.filter((w) => lower.includes(w)).length;
  const toughCount = TOUGH_WORDS.filter((w) => lower.includes(w)).length;

  let mood: 'positive' | 'mixed' | 'tough';
  let moodLabel: string;
  if (posCount >= toughCount + 2) {
    mood = 'positive';
    moodLabel = 'Positive';
  } else if (toughCount >= posCount + 2) {
    mood = 'tough';
    moodLabel = 'Tough';
  } else {
    mood = 'mixed';
    moodLabel = 'Mixed';
  }

  const themes: string[] = [];
  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      themes.push(theme);
    }
  }
  if (themes.length === 0) themes.push('General');

  let pillarConnection: Pillar | null = null;
  let bestScore = 0;
  for (const [pillar, signals] of Object.entries(PILLAR_SIGNALS)) {
    const score = signals.filter((s) => lower.includes(s)).length;
    if (score > bestScore) {
      bestScore = score;
      pillarConnection = pillar as Pillar;
    }
  }

  const affirmations = mood === 'positive' ? AFFIRMATIONS_POSITIVE : mood === 'tough' ? AFFIRMATIONS_TOUGH : AFFIRMATIONS_MIXED;
  const insights = mood === 'positive' ? INSIGHTS_POSITIVE : mood === 'tough' ? INSIGHTS_TOUGH : INSIGHTS_MIXED;

  return {
    mood,
    moodLabel,
    themes,
    pillarConnection,
    affirmation: pick(affirmations),
    insight: pick(insights),
    actionSuggestion: getActionSuggestion(mood, themes, pillarConnection),
  };
}
