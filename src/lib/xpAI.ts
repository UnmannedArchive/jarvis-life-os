import { Pillar, Difficulty, QuestType } from './types';

interface XPEstimate {
  xp: number;
  difficulty: Difficulty;
  reasoning: string;
}

const EFFORT_HIGH: string[] = [
  'deep work', 'full workout', 'marathon', 'complete project', 'finish',
  'build', 'deploy', 'launch', 'ship', 'present', 'presentation',
  'exam', 'test', 'interview', 'portfolio', 'write essay', 'research paper',
  'meal prep', 'cook dinner', 'full clean', 'deep clean', 'reorganize',
  'long run', 'hike', 'swimming', 'weight training', 'leg day',
  'budget plan', 'tax', 'investment', 'financial plan',
  'network event', 'host', 'organize event', 'volunteer',
  'cold call', 'negotiate', 'pitch', 'proposal',
];

const EFFORT_MED: string[] = [
  'workout', 'exercise', 'gym', 'run', 'jog', 'yoga', 'stretch',
  'read', 'study', 'learn', 'practice', 'course', 'lesson', 'tutorial',
  'write', 'journal', 'blog', 'code', 'review', 'plan', 'design',
  'cook', 'meal', 'grocery', 'clean', 'organize', 'laundry',
  'meeting', 'email', 'call', 'catch up', 'hang out', 'visit',
  'meditate', 'reflect', 'pray', 'gratitude',
  'budget', 'save', 'track', 'review finances',
  'walk', 'bike', 'cycling',
];

const EFFORT_LOW: string[] = [
  'drink water', 'take vitamins', 'take meds', 'floss', 'brush',
  'make bed', 'tidy', 'quick', 'check', 'log', 'update',
  'text', 'reply', 'respond', 'send', 'list',
  'no phone', 'screen time', 'no sugar', 'no junk',
  'wake up early', 'sleep on time', 'alarm',
  'affirmation', 'breathe', 'posture',
  'step count', 'stairs', 'park far',
];

function extractMinutes(text: string): number | null {
  const hourMatch = text.match(/(\d+)\s*h(ou)?r/i);
  if (hourMatch) return parseInt(hourMatch[1]) * 60;

  const minMatch = text.match(/(\d+)\s*min/i);
  if (minMatch) return parseInt(minMatch[1]);

  return null;
}

function matchesAny(text: string, keywords: string[]): number {
  let score = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) score++;
  }
  return score;
}

const INTENSITY_WORDS: Record<string, number> = {
  'intense': 1.3, 'hard': 1.3, 'challenging': 1.3, 'difficult': 1.3,
  'advanced': 1.2, 'complex': 1.2, 'thorough': 1.2, 'comprehensive': 1.2,
  'full': 1.15, 'complete': 1.15, 'entire': 1.15, 'massive': 1.3,
  'quick': 0.7, 'simple': 0.7, 'easy': 0.7, 'basic': 0.7,
  'short': 0.8, 'brief': 0.8, 'light': 0.8, 'small': 0.8,
};

const TYPE_MULTIPLIERS: Record<QuestType, number> = {
  daily: 1.0,
  side: 1.15,
  epic: 1.5,
};

const PILLAR_BASE_ADJUSTMENTS: Record<Pillar, number> = {
  mind: 1.0,
  body: 1.05,
  work: 1.1,
  wealth: 1.1,
  spirit: 0.95,
  social: 1.0,
};

export function estimateXP(
  title: string,
  description: string | null,
  pillar: Pillar,
  questType: QuestType,
): XPEstimate {
  const text = `${title} ${description || ''}`.toLowerCase().trim();
  const words = text.split(/\s+/);

  let baseScore = 50;
  let reasoning = '';

  const highMatches = matchesAny(text, EFFORT_HIGH);
  const medMatches = matchesAny(text, EFFORT_MED);
  const lowMatches = matchesAny(text, EFFORT_LOW);

  if (highMatches > medMatches && highMatches > lowMatches) {
    baseScore = 140 + highMatches * 15;
    reasoning = 'High-effort task';
  } else if (medMatches > lowMatches) {
    baseScore = 80 + medMatches * 10;
    reasoning = 'Moderate effort';
  } else if (lowMatches > 0) {
    baseScore = 30 + lowMatches * 5;
    reasoning = 'Quick habit';
  } else {
    baseScore = 70;
    reasoning = 'Standard task';
  }

  const minutes = extractMinutes(text);
  if (minutes !== null) {
    if (minutes >= 120) {
      baseScore = Math.max(baseScore, 180);
      reasoning = `~${minutes}min commitment`;
    } else if (minutes >= 60) {
      baseScore = Math.max(baseScore, 120);
      reasoning = `~${minutes}min session`;
    } else if (minutes >= 30) {
      baseScore = Math.max(baseScore, 80);
      reasoning = `~${minutes}min effort`;
    } else if (minutes >= 10) {
      baseScore = Math.max(baseScore, 50);
      reasoning = `~${minutes}min quick task`;
    } else {
      baseScore = Math.max(baseScore, 30);
      reasoning = `~${minutes}min micro task`;
    }
  }

  let intensityMult = 1.0;
  for (const word of words) {
    if (INTENSITY_WORDS[word]) {
      intensityMult = Math.max(intensityMult, INTENSITY_WORDS[word]);
      if (INTENSITY_WORDS[word] < 1) {
        intensityMult = Math.min(intensityMult, INTENSITY_WORDS[word]);
      }
    }
  }
  baseScore *= intensityMult;

  const wordCount = title.split(/\s+/).length + (description ? description.split(/\s+/).length : 0);
  if (wordCount > 10) baseScore *= 1.05;
  if (wordCount > 20) baseScore *= 1.05;

  baseScore *= TYPE_MULTIPLIERS[questType];
  baseScore *= PILLAR_BASE_ADJUSTMENTS[pillar];

  const xp = Math.round(Math.max(15, Math.min(500, baseScore)) / 5) * 5;

  let difficulty: Difficulty;
  if (xp >= 200) difficulty = 'LEGENDARY';
  else if (xp >= 120) difficulty = 'HARD';
  else if (xp >= 65) difficulty = 'MED';
  else difficulty = 'EASY';

  return { xp, difficulty, reasoning };
}
