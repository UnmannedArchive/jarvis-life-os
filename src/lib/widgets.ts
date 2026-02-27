export interface WidgetConfig {
  id: string;
  label: string;
  description: string;
  defaultSize: 'small' | 'wide' | 'full';
  icon: string;
}

export const WIDGET_REGISTRY: WidgetConfig[] = [
  { id: 'welcome', label: 'Welcome', description: 'Greeting & daily check-in', defaultSize: 'full', icon: 'Sun' },
  { id: 'intention', label: 'Focus', description: 'AI focus tracking', defaultSize: 'full', icon: 'Crosshair' },
  { id: 'commitment', label: 'Commitment', description: 'Daily task commitment', defaultSize: 'full', icon: 'Target' },
  { id: 'nudge', label: 'Nudge', description: 'Motivational progress nudge', defaultSize: 'full', icon: 'Zap' },
  { id: 'login_bonus', label: 'Login Bonus', description: 'Daily login reward', defaultSize: 'full', icon: 'Gift' },
  { id: 'tasks', label: 'Tasks', description: 'Today\'s prioritized tasks', defaultSize: 'wide', icon: 'CheckSquare' },
  { id: 'habits', label: 'Habit Week', description: 'Weekly habit tracker', defaultSize: 'wide', icon: 'Calendar' },
  { id: 'streak', label: 'Streak Calendar', description: 'XP contribution grid', defaultSize: 'wide', icon: 'Flame' },
  { id: 'performance', label: 'Performance', description: 'AI rating based on your track record', defaultSize: 'small', icon: 'Gauge' },
  { id: 'character', label: 'Character', description: 'Level, class & XP', defaultSize: 'small', icon: 'User' },
  { id: 'radar', label: 'Life Balance', description: 'Pillar radar chart', defaultSize: 'small', icon: 'Hexagon' },
  { id: 'achievements', label: 'Achievements', description: 'Badges & milestones', defaultSize: 'small', icon: 'Trophy' },
  { id: 'gcalendar', label: 'Google Calendar', description: 'Upcoming events from Google Calendar', defaultSize: 'small', icon: 'CalendarDays' },
  { id: 'tomorrow', label: 'Tomorrow', description: 'Preview of what\'s next', defaultSize: 'full', icon: 'ArrowRight' },
  { id: 'review', label: 'Day Review', description: 'End-of-day summary', defaultSize: 'full', icon: 'BarChart3' },
  { id: 'system', label: 'System Status', description: 'System indicators', defaultSize: 'full', icon: 'Activity' },
];

export const DEFAULT_LAYOUT: string[] = [
  'login_bonus', 'welcome', 'intention', 'commitment', 'nudge',
  'tasks', 'performance', 'character', 'habits', 'radar', 'streak', 'achievements',
  'tomorrow', 'review', 'system',
];

export function getWidgetConfig(id: string): WidgetConfig | undefined {
  return WIDGET_REGISTRY.find((w) => w.id === id);
}
