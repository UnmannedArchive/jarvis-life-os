'use client';

import { create } from 'zustand';
import {
  User,
  LifePillar,
  Quest,
  DailyCheckin,
  ActivityLogEntry,
  Goal,
  Pillar,
  Difficulty,
  QuestType,
  DIFFICULTY_CONFIG,
} from '@/lib/types';
import {
  calculateQuestXP,
  getLevelFromXP,
  getXPProgress,
  getCharacterClass,
  getStreakMilestoneReached,
  getStreakMilestoneXP,
  isPerfectDay,
  getPerfectDayBonus,
} from '@/lib/xp';
import { format } from 'date-fns';

export interface XPHistoryEntry {
  date: string;
  xp: number;
  pillar: Pillar | null;
}

export interface Notification {
  id: string;
  type: 'level_up' | 'streak_milestone' | 'perfect_day' | 'class_change';
  title: string;
  description: string;
  color: string;
  timestamp: number;
}

export interface SubTask {
  id: string;
  goalId: string;
  title: string;
  completed: boolean;
}

interface AppState {
  user: User | null;
  pillars: LifePillar[];
  quests: Quest[];
  todayCheckin: DailyCheckin | null;
  activityLog: ActivityLogEntry[];
  goals: Goal[];
  xpHistory: XPHistoryEntry[];
  notifications: Notification[];
  subTasks: SubTask[];
  isAuthenticated: boolean;
  isLoading: boolean;
  sidebarOpen: boolean;
  showLevelUp: { level: number; pillar?: string } | null;

  setUser: (user: User | null) => void;
  setPillars: (pillars: LifePillar[]) => void;
  setQuests: (quests: Quest[]) => void;
  setTodayCheckin: (checkin: DailyCheckin | null) => void;
  setActivityLog: (log: ActivityLogEntry[]) => void;
  setGoals: (goals: Goal[]) => void;
  setIsAuthenticated: (val: boolean) => void;
  setIsLoading: (val: boolean) => void;
  setSidebarOpen: (val: boolean) => void;
  setShowLevelUp: (val: { level: number; pillar?: string } | null) => void;
  addNotification: (n: Omit<Notification, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: string) => void;
  setSubTasks: (tasks: SubTask[]) => void;
  addSubTask: (goalId: string, title: string) => void;
  toggleSubTask: (taskId: string) => void;
  deleteSubTask: (taskId: string) => void;

  completeQuest: (questId: string) => void;
  addQuest: (quest: Omit<Quest, 'id' | 'user_id' | 'completed' | 'completed_at' | 'created_at' | 'sort_order'>) => void;
  deleteQuest: (questId: string) => void;
  submitCheckin: (sleep: number, energy: number, mood: number, notes?: string) => void;
  addLogEntry: (action: string, description: string, xpEarned: number, pillar?: Pillar) => void;

  getTodayQuests: () => Quest[];
  getDailyQuests: () => Quest[];
  getSideQuests: () => Quest[];
  getEpicQuests: () => Quest[];
  getPillarData: (pillar: Pillar) => LifePillar | undefined;
  getOverallLevel: () => number;
  getOverallXPProgress: () => { current: number; required: number; percentage: number };
}

export const useStore = create<AppState>((set, get) => ({
  user: null,
  pillars: [],
  quests: [],
  todayCheckin: null,
  activityLog: [],
  goals: [],
  xpHistory: [],
  notifications: [],
  subTasks: [],
  isAuthenticated: false,
  isLoading: true,
  sidebarOpen: true,
  showLevelUp: null,

  setUser: (user) => set({ user }),
  setPillars: (pillars) => set({ pillars }),
  setQuests: (quests) => set({ quests }),
  setTodayCheckin: (checkin) => set({ todayCheckin: checkin }),
  setActivityLog: (log) => set({ activityLog: log }),
  setGoals: (goals) => set({ goals }),
  setIsAuthenticated: (val) => set({ isAuthenticated: val }),
  setIsLoading: (val) => set({ isLoading: val }),
  setSidebarOpen: (val) => set({ sidebarOpen: val }),
  setShowLevelUp: (val) => set({ showLevelUp: val }),
  addNotification: (n) => {
    const notification: Notification = {
      ...n,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    set({ notifications: [notification, ...get().notifications].slice(0, 20) });
  },
  dismissNotification: (id) => {
    set({ notifications: get().notifications.filter((n) => n.id !== id) });
  },
  setSubTasks: (tasks) => set({ subTasks: tasks }),
  addSubTask: (goalId, title) => {
    const task: SubTask = { id: crypto.randomUUID(), goalId, title, completed: false };
    set({ subTasks: [...get().subTasks, task] });
  },
  toggleSubTask: (taskId) => {
    set({ subTasks: get().subTasks.map((t) => t.id === taskId ? { ...t, completed: !t.completed } : t) });
  },
  deleteSubTask: (taskId) => {
    set({ subTasks: get().subTasks.filter((t) => t.id !== taskId) });
  },

  completeQuest: (questId) => {
    const { quests, pillars, user, activityLog, xpHistory, notifications } = get();
    const quest = quests.find((q) => q.id === questId);
    if (!quest || quest.completed) return;

    const pillar = pillars.find((p) => p.pillar === quest.pillar);
    const oldPillarLevel = pillar?.level || 1;
    const streak = pillar?.streak || 0;
    const activePillars = new Set(
      quests.filter((q) => q.completed).map((q) => q.pillar),
    );
    activePillars.add(quest.pillar);

    const hour = new Date().getHours();
    const xpEarned = calculateQuestXP(quest.difficulty, streak, activePillars, hour < 10);
    const now = new Date().toISOString();
    const today = format(new Date(), 'yyyy-MM-dd');

    const updatedQuests = quests.map((q) =>
      q.id === questId ? { ...q, completed: true, completed_at: now } : q,
    );

    const updatedPillars = pillars.map((p) => {
      if (p.pillar === quest.pillar) {
        const newXP = p.current_xp + xpEarned;
        return {
          ...p,
          current_xp: newXP,
          level: getLevelFromXP(newXP),
          streak: p.streak + 1,
          last_activity_date: today,
        };
      }
      return p;
    });

    const newPillarLevel = updatedPillars.find((p) => p.pillar === quest.pillar)?.level || 1;
    const oldOverallLevel = user ? getLevelFromXP(user.total_xp) : 1;
    const newOverallLevel = user ? getLevelFromXP(user.total_xp + xpEarned) : 1;
    const oldClass = user?.character_class || 'RECRUIT';
    const newClass = getCharacterClass(updatedPillars) as User['character_class'];

    const logs: ActivityLogEntry[] = [];

    logs.push({
      id: crypto.randomUUID(),
      user_id: user?.id || '',
      action: 'quest_completed',
      description: `QUEST COMPLETE — "${quest.title}" // +${xpEarned} XP // ${quest.pillar.toUpperCase()}`,
      xp_earned: xpEarned,
      pillar: quest.pillar,
      created_at: now,
    });

    const newNotifications: Omit<Notification, 'id' | 'timestamp'>[] = [];

    if (newPillarLevel > oldPillarLevel) {
      const pillarLabel = quest.pillar.charAt(0).toUpperCase() + quest.pillar.slice(1);
      logs.push({
        id: crypto.randomUUID(),
        user_id: user?.id || '',
        action: 'level_up',
        description: `LEVEL UP — ${pillarLabel} pillar reached LEVEL ${newPillarLevel}! // +200 BONUS XP`,
        xp_earned: 200,
        pillar: quest.pillar,
        created_at: now,
      });
      newNotifications.push({
        type: 'level_up',
        title: `${pillarLabel} LEVEL UP!`,
        description: `${pillarLabel} pillar reached Level ${newPillarLevel}`,
        color: '#00ff88',
      });
    }

    if (newOverallLevel > oldOverallLevel) {
      set({ showLevelUp: { level: newOverallLevel } });
      setTimeout(() => get().setShowLevelUp(null), 3000);
      logs.push({
        id: crypto.randomUUID(),
        user_id: user?.id || '',
        action: 'level_up',
        description: `LEVEL UP — Overall character reached LEVEL ${newOverallLevel}!`,
        xp_earned: 0,
        pillar: null,
        created_at: now,
      });
    }

    if (newClass !== oldClass) {
      newNotifications.push({
        type: 'class_change',
        title: 'CLASS EVOLUTION',
        description: `You evolved from ${oldClass} to ${newClass}!`,
        color: '#00e5ff',
      });
      logs.push({
        id: crypto.randomUUID(),
        user_id: user?.id || '',
        action: 'class_change',
        description: `CLASS EVOLUTION — ${oldClass} → ${newClass}`,
        xp_earned: 0,
        pillar: null,
        created_at: now,
      });
    }

    const newStreak = (pillar?.streak || 0) + 1;
    const milestone = getStreakMilestoneReached(newStreak);
    if (milestone) {
      const bonusXP = getStreakMilestoneXP(milestone);
      logs.push({
        id: crypto.randomUUID(),
        user_id: user?.id || '',
        action: 'streak_milestone',
        description: `STREAK MILESTONE — ${milestone}-day streak on ${quest.pillar.toUpperCase()}! // +${bonusXP} BONUS XP`,
        xp_earned: bonusXP,
        pillar: quest.pillar,
        created_at: now,
      });
      newNotifications.push({
        type: 'streak_milestone',
        title: `${milestone}-DAY STREAK!`,
        description: `${quest.pillar.toUpperCase()} pillar streak milestone reached`,
        color: '#ffd740',
      });
    }

    const updatedUser = user
      ? {
          ...user,
          total_xp: user.total_xp + xpEarned + (newPillarLevel > oldPillarLevel ? 200 : 0),
          character_class: newClass,
          current_streak: Math.max(user.current_streak, newStreak),
          longest_streak: Math.max(user.longest_streak, newStreak),
        }
      : null;

    const newXPEntry: XPHistoryEntry = { date: today, xp: xpEarned, pillar: quest.pillar };

    const newNotifs = newNotifications.map((n) => ({
      ...n,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }));

    set({
      quests: updatedQuests,
      pillars: updatedPillars,
      user: updatedUser,
      activityLog: [...logs, ...activityLog].slice(0, 100),
      xpHistory: [...xpHistory, newXPEntry],
      notifications: [...newNotifs, ...notifications].slice(0, 20),
    });
  },

  addQuest: (questData) => {
    const { quests, user } = get();
    const newQuest: Quest = {
      ...questData,
      id: crypto.randomUUID(),
      user_id: user?.id || '',
      completed: false,
      completed_at: null,
      created_at: new Date().toISOString(),
      sort_order: quests.length,
    };
    set({ quests: [...quests, newQuest] });
  },

  deleteQuest: (questId) => {
    set({ quests: get().quests.filter((q) => q.id !== questId) });
  },

  submitCheckin: (sleep, energy, mood, notes) => {
    const { user, activityLog } = get();
    const now = new Date();
    const checkin: DailyCheckin = {
      id: crypto.randomUUID(),
      user_id: user?.id || '',
      date: format(now, 'yyyy-MM-dd'),
      sleep_quality: sleep,
      energy_level: energy,
      mood,
      notes: notes || null,
      created_at: now.toISOString(),
    };

    const logEntry: ActivityLogEntry = {
      id: crypto.randomUUID(),
      user_id: user?.id || '',
      action: 'checkin',
      description: `CHECK-IN — Sleep: ${sleep}/5 // Energy: ${energy}/5 // Mood: ${mood}/5`,
      xp_earned: 0,
      pillar: null,
      created_at: now.toISOString(),
    };

    set({
      todayCheckin: checkin,
      activityLog: [logEntry, ...activityLog].slice(0, 100),
    });
  },

  addLogEntry: (action, description, xpEarned, pillar) => {
    const { user, activityLog } = get();
    const entry: ActivityLogEntry = {
      id: crypto.randomUUID(),
      user_id: user?.id || '',
      action,
      description,
      xp_earned: xpEarned,
      pillar: pillar || null,
      created_at: new Date().toISOString(),
    };
    set({ activityLog: [entry, ...activityLog].slice(0, 100) });
  },

  getTodayQuests: () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return get().quests.filter(
      (q) =>
        q.quest_type === 'daily' ||
        (q.due_date && q.due_date === today) ||
        (!q.completed && q.quest_type === 'side'),
    );
  },

  getDailyQuests: () => get().quests.filter((q) => q.quest_type === 'daily'),
  getSideQuests: () => get().quests.filter((q) => q.quest_type === 'side'),
  getEpicQuests: () => get().quests.filter((q) => q.quest_type === 'epic'),

  getPillarData: (pillar) => get().pillars.find((p) => p.pillar === pillar),

  getOverallLevel: () => {
    const user = get().user;
    return user ? getLevelFromXP(user.total_xp) : 1;
  },

  getOverallXPProgress: () => {
    const user = get().user;
    return getXPProgress(user?.total_xp || 0);
  },
}));
