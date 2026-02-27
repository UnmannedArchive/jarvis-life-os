import { Quest, Pillar, ActivityLogEntry } from './types';

const STOP_WORDS = new Set([
  'i', 'me', 'my', 'we', 'our', 'you', 'your', 'it', 'its', 'the', 'a', 'an',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'up', 'down', 'about', 'and', 'but', 'or', 'nor',
  'not', 'so', 'than', 'too', 'very', 'just', 'that', 'this', 'these', 'those',
  'then', 'there', 'here', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'only', 'own', 'same', 'get', 'got', 'make', 'go', 'going', 'today',
  'day', 'want', 'need', 'try', 'start', 'keep', 'work', 'thing', 'things',
  'really', 'much', 'done', 'doing', 'also', 'still', 'even',
]);

const PILLAR_KEYWORDS: Record<Pillar, string[]> = {
  mind: ['read', 'learn', 'study', 'book', 'course', 'research', 'think', 'write', 'journal', 'meditate', 'reflect', 'analyze', 'education', 'knowledge', 'mental', 'brain', 'focus', 'concentrate', 'idea', 'creative', 'creativity', 'plan', 'planning', 'strategy', 'reading', 'writing', 'podcast', 'article', 'tutorial', 'skill', 'practice', 'language'],
  body: ['exercise', 'gym', 'run', 'workout', 'health', 'sleep', 'diet', 'eat', 'nutrition', 'walk', 'stretch', 'yoga', 'lift', 'weight', 'cardio', 'swim', 'sport', 'training', 'fitness', 'muscle', 'body', 'physical', 'rest', 'recovery', 'hydrate', 'water', 'meal', 'cook', 'cooking', 'hiking', 'bike', 'cycling'],
  work: ['project', 'code', 'build', 'ship', 'deploy', 'meeting', 'task', 'deadline', 'email', 'client', 'product', 'feature', 'bug', 'fix', 'design', 'develop', 'launch', 'presentation', 'report', 'review', 'coding', 'programming', 'software', 'app', 'website', 'business', 'office', 'professional', 'career', 'job', 'interview', 'resume', 'portfolio'],
  wealth: ['invest', 'save', 'budget', 'money', 'income', 'finance', 'stock', 'crypto', 'trade', 'bank', 'expense', 'revenue', 'profit', 'fund', 'financial', 'payment', 'earning', 'savings', 'debt', 'credit', 'asset', 'portfolio', 'passive', 'side', 'hustle', 'freelance', 'accounting', 'tax'],
  spirit: ['meditate', 'pray', 'gratitude', 'mindful', 'peace', 'calm', 'spiritual', 'soul', 'purpose', 'meaning', 'values', 'belief', 'faith', 'inner', 'awareness', 'presence', 'breathe', 'breathing', 'stillness', 'reflection', 'nature', 'growth', 'self', 'compassion', 'kindness', 'patience', 'acceptance', 'healing'],
  social: ['friend', 'family', 'call', 'meet', 'connect', 'network', 'community', 'relationship', 'date', 'party', 'event', 'social', 'people', 'conversation', 'hangout', 'visit', 'talk', 'listen', 'support', 'help', 'volunteer', 'team', 'group', 'collaborate', 'mentor', 'partner', 'love'],
};

const SYNONYM_CLUSTERS: string[][] = [
  ['exercise', 'workout', 'gym', 'training', 'fitness'],
  ['read', 'reading', 'book', 'study', 'learn', 'learning'],
  ['code', 'coding', 'programming', 'develop', 'build', 'software'],
  ['meditate', 'meditation', 'mindful', 'mindfulness', 'breathe'],
  ['write', 'writing', 'journal', 'journaling', 'blog'],
  ['invest', 'investing', 'stock', 'stocks', 'trade', 'trading'],
  ['run', 'running', 'jog', 'jogging', 'cardio'],
  ['eat', 'eating', 'diet', 'nutrition', 'meal', 'cook', 'cooking'],
  ['friend', 'friends', 'social', 'hang', 'hangout'],
  ['project', 'task', 'assignment', 'work'],
  ['sleep', 'rest', 'recovery', 'nap'],
  ['plan', 'planning', 'organize', 'schedule', 'prep', 'prepare'],
  ['focus', 'concentrate', 'deep', 'attention'],
  ['clean', 'cleaning', 'organize', 'tidy', 'declutter'],
  ['stretch', 'stretching', 'yoga', 'flexibility', 'mobility'],
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

function expandWithSynonyms(words: string[]): Set<string> {
  const expanded = new Set(words);
  for (const word of words) {
    for (const cluster of SYNONYM_CLUSTERS) {
      if (cluster.includes(word)) {
        for (const syn of cluster) expanded.add(syn);
      }
    }
  }
  return expanded;
}

function detectPillars(words: Set<string>): Set<Pillar> {
  const detected = new Set<Pillar>();
  for (const [pillar, keywords] of Object.entries(PILLAR_KEYWORDS) as [Pillar, string[]][]) {
    for (const kw of keywords) {
      if (words.has(kw)) {
        detected.add(pillar);
        break;
      }
    }
  }
  return detected;
}

function wordOverlap(setA: Set<string>, setB: Set<string>): number {
  let matches = 0;
  for (const w of setA) {
    if (setB.has(w)) matches++;
  }
  return matches;
}

function substringMatch(intentionWords: Set<string>, text: string): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const word of intentionWords) {
    if (lower.includes(word)) hits++;
  }
  return hits;
}

interface FocusScore {
  percentage: number;
  label: string;
  breakdown: {
    relevantTasks: number;
    completedRelevant: number;
    totalCompleted: number;
    totalTasks: number;
    topPillar: Pillar | null;
  };
  insight: string;
}

export function computeFocusScore(
  intention: string,
  quests: Quest[],
  activityLog: ActivityLogEntry[],
): FocusScore {
  const intentionTokens = tokenize(intention);
  if (intentionTokens.length === 0) {
    return {
      percentage: 0,
      label: 'No focus set',
      breakdown: { relevantTasks: 0, completedRelevant: 0, totalCompleted: 0, totalTasks: 0, topPillar: null },
      insight: 'Set a more specific focus to get better tracking.',
    };
  }

  const intentionExpanded = expandWithSynonyms(intentionTokens);
  const intentionPillars = detectPillars(intentionExpanded);

  if (quests.length === 0) {
    return {
      percentage: 0,
      label: 'No tasks yet',
      breakdown: { relevantTasks: 0, completedRelevant: 0, totalCompleted: 0, totalTasks: 0, topPillar: intentionPillars.values().next().value || null },
      insight: 'Add tasks related to your focus to start tracking.',
    };
  }

  const scored: { quest: Quest; relevance: number }[] = [];
  for (const quest of quests) {
    let relevance = 0;
    const titleTokens = tokenize(quest.title);
    const titleExpanded = expandWithSynonyms(titleTokens);

    const directOverlap = wordOverlap(intentionExpanded, titleExpanded);
    relevance += directOverlap * 0.35;

    const substringHits = substringMatch(intentionExpanded, quest.title + ' ' + (quest.description || ''));
    relevance += substringHits * 0.15;

    if (intentionPillars.has(quest.pillar)) {
      relevance += 0.3;
    }

    if (quest.description) {
      const descTokens = tokenize(quest.description);
      const descExpanded = expandWithSynonyms(descTokens);
      relevance += wordOverlap(intentionExpanded, descExpanded) * 0.2;
    }

    relevance = Math.min(relevance, 1);
    scored.push({ quest, relevance });
  }

  const RELEVANCE_THRESHOLD = 0.15;
  const relevant = scored.filter((s) => s.relevance >= RELEVANCE_THRESHOLD);
  const completedRelevant = relevant.filter((s) => s.quest.completed);
  const totalCompleted = quests.filter((q) => q.completed).length;

  let focusAlignmentScore: number;

  if (relevant.length === 0) {
    const generalCompletion = quests.length > 0 ? totalCompleted / quests.length : 0;
    const pillarMatch = quests.filter((q) => q.completed && intentionPillars.has(q.pillar)).length;
    const pillarWeight = quests.length > 0 ? pillarMatch / quests.length : 0;
    focusAlignmentScore = generalCompletion * 0.15 + pillarWeight * 0.25;
  } else {
    const totalRelevantWeight = relevant.reduce((sum, s) => sum + s.relevance, 0);
    const completedRelevantWeight = completedRelevant.reduce((sum, s) => sum + s.relevance, 0);
    const weightedCompletion = totalRelevantWeight > 0 ? completedRelevantWeight / totalRelevantWeight : 0;

    const ratioCompletion = relevant.length > 0 ? completedRelevant.length / relevant.length : 0;

    const generalCompletion = quests.length > 0 ? totalCompleted / quests.length : 0;

    focusAlignmentScore =
      weightedCompletion * 0.5 +
      ratioCompletion * 0.3 +
      generalCompletion * 0.2;
  }

  const todayLogs = activityLog.filter((l) => {
    const logDate = new Date(l.created_at).toDateString();
    return logDate === new Date().toDateString();
  });

  const focusLogs = todayLogs.filter((l) => {
    const logText = l.description.toLowerCase();
    for (const word of intentionExpanded) {
      if (logText.includes(word)) return true;
    }
    return false;
  });

  const activityBoost = Math.min(focusLogs.length * 0.04, 0.15);
  focusAlignmentScore = Math.min(focusAlignmentScore + activityBoost, 1);

  const percentage = Math.round(focusAlignmentScore * 100);

  const pillarCounts: Record<string, number> = {};
  for (const s of completedRelevant) {
    pillarCounts[s.quest.pillar] = (pillarCounts[s.quest.pillar] || 0) + 1;
  }
  const topPillar = Object.entries(pillarCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Pillar || intentionPillars.values().next().value || null;

  let label: string;
  let insight: string;

  if (percentage >= 85) {
    label = 'Laser-Focused';
    insight = 'Exceptional alignment with your focus today.';
  } else if (percentage >= 65) {
    label = 'On Track';
    insight = `Strong progress. ${relevant.length - completedRelevant.length} related task${relevant.length - completedRelevant.length !== 1 ? 's' : ''} remaining.`;
  } else if (percentage >= 40) {
    label = 'Partial Focus';
    const remaining = relevant.filter((s) => !s.quest.completed);
    if (remaining.length > 0) {
      insight = `Complete "${remaining[0].quest.title}" to improve your score.`;
    } else {
      insight = 'Add tasks more aligned with your intention.';
    }
  } else if (percentage >= 15) {
    label = 'Drifting';
    insight = 'Most of your tasks don\'t align with your focus. Reprioritize?';
  } else {
    label = 'Off-Focus';
    insight = 'Your tasks don\'t match your stated focus. Adjust your plan or refocus.';
  }

  return {
    percentage,
    label,
    breakdown: {
      relevantTasks: relevant.length,
      completedRelevant: completedRelevant.length,
      totalCompleted,
      totalTasks: quests.length,
      topPillar,
    },
    insight,
  };
}
