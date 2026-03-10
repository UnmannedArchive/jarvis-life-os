'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
import { fireConfetti, firePerfectDay, fireLevelUp } from '@/lib/confetti';
import { rollCriticalHit, getCritMultiplier, getLoginBonusXP, getLoginBonusLabel } from '@/lib/psychology';
import {
  saveUser,
  savePillars,
  upsertQuest,
  deleteQuestRemote,
  saveCheckin,
  saveActivityLogEntries,
  upsertGoals,
} from '@/lib/supabaseSync';

export interface XPHistoryEntry {
  date: string;
  xp: number;
  pillar: Pillar | null;
}

export interface Notification {
  id: string;
  type: 'level_up' | 'streak_milestone' | 'perfect_day' | 'class_change' | 'critical_hit' | 'login_bonus' | 'commitment_met';
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

  // Psychology hooks
  dailyIntention: string | null;
  dailyCommitment: number | null;
  loginBonusClaimed: boolean;
  consecutiveLogins: number;
  streakFreezes: number;
  lastLoginDate: string | null;
  showCriticalHit: { xp: number; task: string } | null;

  // Appearance
  backgroundImage: string | null;
  setBackgroundImage: (url: string | null) => void;

  // Dashboard layout
  dashboardWidgets: string[];
  setDashboardWidgets: (widgets: string[]) => void;

  // Google Calendar
  gcalApiKey: string | null;
  gcalCalendarId: string | null;
  setGcalConfig: (apiKey: string | null, calendarId: string | null) => void;

  // iCal imports
  icalEvents: import('@/lib/icalParser').ICalEvent[];
  icalSourceName: string | null;
  setIcalEvents: (events: import('@/lib/icalParser').ICalEvent[], sourceName?: string | null) => void;
  clearIcalEvents: () => void;

  // Journal / Vent
  journalEntries: import('@/lib/reflectAI').JournalEntry[];
  addJournalEntry: (entry: import('@/lib/reflectAI').JournalEntry) => void;
  deleteJournalEntry: (id: string) => void;

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

  // Psychology actions
  setDailyIntention: (intention: string) => void;
  setDailyCommitment: (count: number) => void;
  claimLoginBonus: () => void;

  completeQuest: (questId: string) => void;
  addQuest: (quest: Omit<Quest, 'id' | 'user_id' | 'completed' | 'completed_at' | 'created_at' | 'sort_order'>) => void;
  deleteQuest: (questId: string) => void;
  submitCheckin: (sleep: number, energy: number, mood: number, notes?: string) => void;
  addLogEntry: (action: string, description: string, xpEarned: number, pillar?: Pillar) => void;

  loadFromCloud: (data: {
    user: User;
    pillars: LifePillar[];
    quests: Quest[];
    todayCheckin: DailyCheckin | null;
    activityLog: ActivityLogEntry[];
    goals: Goal[];
  }) => void;
  logout: () => void;

  getTodayQuests: () => Quest[];
  getDailyQuests: () => Quest[];
  getSideQuests: () => Quest[];
  getEpicQuests: () => Quest[];
  getPillarData: (pillar: Pillar) => LifePillar | undefined;
  getOverallLevel: () => number;
  getOverallXPProgress: () => { current: number; required: number; percentage: number };
}

export const useStore = create<AppState>()(persist((set, get) => ({
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
  dailyIntention: null,
  dailyCommitment: null,
  loginBonusClaimed: false,
  consecutiveLogins: 0,
  streakFreezes: 0,
  lastLoginDate: null,
  showCriticalHit: null,
  backgroundImage: null,
  dashboardWidgets: [],
  gcalApiKey: null,
  gcalCalendarId: null,
  icalEvents: [],
  icalSourceName: null,
  journalEntries: [],

  setBackgroundImage: (url) => set({ backgroundImage: url }),
  setDashboardWidgets: (widgets) => set({ dashboardWidgets: widgets }),
  setGcalConfig: (apiKey, calendarId) => set({ gcalApiKey: apiKey, gcalCalendarId: calendarId }),
  setIcalEvents: (events, sourceName) => set({ icalEvents: events, icalSourceName: sourceName ?? null }),
  clearIcalEvents: () => set({ icalEvents: [], icalSourceName: null }),
  addJournalEntry: (entry) => set((s) => ({ journalEntries: [entry, ...s.journalEntries].slice(0, 50) })),
  deleteJournalEntry: (id) => set((s) => ({ journalEntries: s.journalEntries.filter((e) => e.id !== id) })),
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
    const updated = get().subTasks.map((t) => t.id === taskId ? { ...t, completed: !t.completed } : t);
    set({ subTasks: updated });

    const task = updated.find((t) => t.id === taskId);
    if (task) {
      const goalSubs = updated.filter((t) => t.goalId === task.goalId);
      const doneCount = goalSubs.filter((t) => t.completed).length;
      const pct = goalSubs.length > 0 ? Math.round((doneCount / goalSubs.length) * 100) : 0;
      const goals = get().goals.map((g) =>
        g.id === task.goalId ? { ...g, progress_pct: pct, status: pct >= 100 ? 'completed' as const : 'active' as const } : g
      );
      set({ goals });
      upsertGoals(goals).catch(() => {});
      if (pct >= 100) fireConfetti();
    }
  },
  deleteSubTask: (taskId) => {
    set({ subTasks: get().subTasks.filter((t) => t.id !== taskId) });
  },

  setDailyIntention: (intention) => set({ dailyIntention: intention || null }),
  setDailyCommitment: (count) => set({ dailyCommitment: count }),

  claimLoginBonus: () => {
    const { user, loginBonusClaimed, consecutiveLogins, lastLoginDate, activityLog, xpHistory } = get();
    if (loginBonusClaimed || !user) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
    const isConsecutive = lastLoginDate === yesterday;
    const newConsecutive = isConsecutive ? consecutiveLogins + 1 : 1;
    const bonusXP = getLoginBonusXP(newConsecutive);
    const label = getLoginBonusLabel(newConsecutive);

    const log: ActivityLogEntry = {
      id: crypto.randomUUID(), user_id: user.id, action: 'login_bonus',
      description: `${label} — Day ${newConsecutive} login bonus // +${bonusXP} XP`,
      xp_earned: bonusXP, pillar: null, created_at: new Date().toISOString(),
    };

    const updatedLoginUser = { ...user, total_xp: user.total_xp + bonusXP };
    set({
      loginBonusClaimed: true,
      consecutiveLogins: newConsecutive,
      lastLoginDate: today,
      user: updatedLoginUser,
      activityLog: [log, ...activityLog].slice(0, 100),
      xpHistory: [...xpHistory, { date: today, xp: bonusXP, pillar: null }],
      notifications: [{
        id: crypto.randomUUID(), timestamp: Date.now(),
        type: 'login_bonus' as const, title: `${label}!`,
        description: `Day ${newConsecutive} — +${bonusXP} XP login bonus`,
        color: '#888888',
      }, ...get().notifications].slice(0, 20),
    });
    saveUser(updatedLoginUser).catch(() => {});
    saveActivityLogEntries([log]).catch(() => {});
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
    let xpEarned = calculateQuestXP(quest.difficulty, streak, activePillars, hour < 10);
    const isCrit = rollCriticalHit();
    if (isCrit) {
      xpEarned = Math.round(xpEarned * getCritMultiplier());
      set({ showCriticalHit: { xp: xpEarned, task: quest.title } });
      setTimeout(() => set({ showCriticalHit: null }), 2500);
    }
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
      description: `QUEST COMPLETE — "${quest.title}" // +${xpEarned} XP${isCrit ? ' CRITICAL HIT!' : ''} // ${quest.pillar.toUpperCase()}`,
      xp_earned: xpEarned,
      pillar: quest.pillar,
      created_at: now,
    });

    const newNotifications: Omit<Notification, 'id' | 'timestamp'>[] = [];

    if (isCrit) {
      newNotifications.push({
        type: 'critical_hit' as const,
        title: 'CRITICAL HIT!',
        description: `"${quest.title}" earned 2x XP — +${xpEarned} XP!`,
        color: '#f0b429',
      });
    }

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
      fireLevelUp();
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
        color: '#b0b0b0',
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

    const completedQuest = updatedQuests.find((q) => q.id === questId);
    if (completedQuest) upsertQuest(completedQuest).catch(() => {});
    if (updatedUser) saveUser(updatedUser).catch(() => {});
    savePillars(updatedPillars).catch(() => {});
    saveActivityLogEntries(logs).catch(() => {});

    const dailyQuests = updatedQuests.filter((q) => q.quest_type === 'daily');
    if (dailyQuests.length > 0 && dailyQuests.every((q) => q.completed)) {
      firePerfectDay();
    } else {
      fireConfetti();
    }

    const { dailyCommitment } = get();
    if (dailyCommitment) {
      const totalDone = updatedQuests.filter((q) => q.completed).length;
      if (totalDone === dailyCommitment) {
        get().addNotification({
          type: 'commitment_met', title: 'Commitment Met!',
          description: `You said ${dailyCommitment} tasks and you did it.`,
          color: '#3ecf8e',
        });
      }
    }
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
    upsertQuest(newQuest).catch(() => {});
  },

  deleteQuest: (questId) => {
    set({ quests: get().quests.filter((q) => q.id !== questId) });
    deleteQuestRemote(questId).catch(() => {});
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
    saveCheckin(checkin).catch(() => {});
    saveActivityLogEntries([logEntry]).catch(() => {});
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
    saveActivityLogEntries([entry]).catch(() => {});
  },

  loadFromCloud: (data) => {
    set({
      user: data.user,
      pillars: data.pillars,
      quests: data.quests,
      todayCheckin: data.todayCheckin,
      activityLog: data.activityLog,
      goals: data.goals,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    set({
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
      isLoading: false,
      dailyIntention: null,
      dailyCommitment: null,
      loginBonusClaimed: false,
      consecutiveLogins: 0,
      lastLoginDate: null,
      journalEntries: [],
    });
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
}), {
  name: 'life-os-storage',
  partialize: (state) => ({
    user: state.user,
    pillars: state.pillars,
    quests: state.quests,
    todayCheckin: state.todayCheckin,
    activityLog: state.activityLog,
    goals: state.goals,
    xpHistory: state.xpHistory,
    subTasks: state.subTasks,
    consecutiveLogins: state.consecutiveLogins,
    lastLoginDate: state.lastLoginDate,
    streakFreezes: state.streakFreezes,
    dailyIntention: state.dailyIntention,
    dailyCommitment: state.dailyCommitment,
    loginBonusClaimed: state.loginBonusClaimed,
    backgroundImage: state.backgroundImage,
    dashboardWidgets: state.dashboardWidgets,
    gcalApiKey: state.gcalApiKey,
    gcalCalendarId: state.gcalCalendarId,
    icalEvents: state.icalEvents,
    icalSourceName: state.icalSourceName,
    journalEntries: state.journalEntries,
  }),
}));
