/**
 * Organizes raw idea/invention text into a structured form:
 * title (short), category, and tags. Uses keyword-based logic so it works
 * without any API key. You can later plug in Claude to improve organization.
 */

export type IdeaCategory =
  | 'product'
  | 'feature'
  | 'app'
  | 'habit'
  | 'business'
  | 'creative'
  | 'tech'
  | 'life'
  | 'other';

export interface OrganizedIdea {
  title: string;
  category: IdeaCategory;
  tags: string[];
  raw: string;
}

const CATEGORY_KEYWORDS: Record<IdeaCategory, string[]> = {
  product: ['product', 'app', 'tool', 'saas', 'platform', 'build', 'ship', 'launch', 'mvp', 'startup'],
  feature: ['feature', 'button', 'screen', 'flow', 'ux', 'ui', 'integration', 'api', 'add', 'support'],
  app: ['app', 'mobile', 'web', 'desktop', 'ios', 'android', 'website', 'dashboard'],
  habit: ['habit', 'routine', 'daily', 'track', 'reminder', 'streak', 'goal', 'journal'],
  business: ['business', 'revenue', 'customer', 'market', 'pricing', 'b2b', 'b2c', 'monetize'],
  creative: ['story', 'art', 'music', 'design', 'write', 'film', 'podcast', 'content', 'brand'],
  tech: ['code', 'algorithm', 'ai', 'ml', 'database', 'backend', 'frontend', 'api', 'automation'],
  life: ['life', 'health', 'relationship', 'travel', 'home', 'family', 'personal', 'improve'],
  other: [],
};

function extractTitle(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'Untitled idea';

  // First sentence or first line, max ~60 chars
  const firstSentence = trimmed.split(/[.!?\n]/)[0]?.trim() || trimmed;
  const firstLine = firstSentence.split('\n')[0]?.trim() || firstSentence;
  if (firstLine.length <= 60) return firstLine;
  return firstLine.slice(0, 57) + '...';
}

function detectCategory(raw: string): IdeaCategory {
  const lower = raw.toLowerCase();
  let best: IdeaCategory = 'other';
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (cat === 'other') continue;
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      best = cat as IdeaCategory;
    }
  }

  return best;
}

function extractTags(raw: string, category: IdeaCategory): string[] {
  const lower = raw.toLowerCase();
  const tags = new Set<string>();

  // Add category as first tag
  tags.add(category);

  // Common concept words (simple heuristic)
  const conceptWords = [
    'automation', 'ai', 'mobile', 'web', 'api', 'dashboard', 'tracking',
    'social', 'health', 'finance', 'productivity', 'learning', 'design',
    'reminder', 'habit', 'goal', 'journal', 'notes', 'search', 'filter',
  ];
  for (const word of conceptWords) {
    if (lower.includes(word)) tags.add(word);
  }

  // Words in quotes or after "like X" / "e.g. X"
  const quoted = [...raw.matchAll(/"([^"]+)"/g)].map((m) => m[1].toLowerCase().replace(/\s+/, '-'));
  quoted.forEach((t) => tags.add(t));

  return Array.from(tags).slice(0, 8);
}

/**
 * Takes raw idea text (typed or from speech) and returns an organized idea
 * with title, category, and tags. Safe to call from client; no API key needed.
 */
export function organizeIdea(raw: string): OrganizedIdea {
  const cleaned = raw.trim();
  if (!cleaned) {
    return { title: 'Untitled idea', category: 'other', tags: [], raw: '' };
  }

  const title = extractTitle(cleaned);
  const category = detectCategory(cleaned);
  const tags = extractTags(cleaned, category);

  return {
    title,
    category,
    tags,
    raw: cleaned,
  };
}

export const CATEGORY_LABELS: Record<IdeaCategory, string> = {
  product: 'Product',
  feature: 'Feature',
  app: 'App',
  habit: 'Habit',
  business: 'Business',
  creative: 'Creative',
  tech: 'Tech',
  life: 'Life',
  other: 'Other',
};

/** Stored idea with id, timestamp, and source (typed vs voice). */
export interface StoredIdea extends OrganizedIdea {
  id: string;
  created_at: string;
  source: 'typed' | 'voice';
}
