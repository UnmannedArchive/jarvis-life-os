import type { WorkflowCategory } from './types';

/** Default app-name (lowercased) → category. Extend freely. */
export const DEFAULT_CATEGORIES: Record<string, WorkflowCategory> = {
  cursor: 'focus',
  code: 'focus', // VS Code reports its app name as "Code"
  'visual studio code': 'focus',
  xcode: 'focus',
  terminal: 'focus',
  iterm2: 'focus',
  warp: 'focus',
  notion: 'focus',
  obsidian: 'focus',
  figma: 'focus',
  slack: 'neutral',
  mail: 'neutral',
  messages: 'neutral',
  calendar: 'neutral',
  finder: 'neutral',
  zoom: 'neutral',
  'microsoft teams': 'neutral',
  youtube: 'distraction',
  tiktok: 'distraction',
  instagram: 'distraction',
  netflix: 'distraction',
  reddit: 'distraction',
  discord: 'distraction',
};

/** Override (lowercased key) wins, then default map, else 'neutral'. */
export function classifyApp(
  app: string,
  overrides: Record<string, WorkflowCategory> = {},
): WorkflowCategory {
  const key = app.trim().toLowerCase();
  return overrides[key] ?? DEFAULT_CATEGORIES[key] ?? 'neutral';
}
