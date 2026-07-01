'use client';

import { useStore } from '@/stores/useStore';
import { toast } from 'sonner';
import { XP_VALUES } from '@/lib/constants';
import type { Quest } from '@/lib/types';

function calculateTaskXP(quest: { difficulty: string; xp_reward: number }): number {
  return quest.xp_reward || 25;
}

export function useActivityLogger() {
  const addActivity = useStore((s) => s.addActivity);
  const addLogEntry = useStore((s) => s.addLogEntry);

  const logTaskComplete = (quest: Quest) => {
    const xp = calculateTaskXP(quest);
    addActivity({
      type: 'task_complete',
      title: `Completed: ${quest.title}`,
      description: quest.description || null,
      xp,
      pillar: quest.pillar,
      metadata: { questId: quest.id },
    });
    addLogEntry('quest_completed', `"${quest.title}" // +${xp} XP`, xp, quest.pillar);
    toast.success(`+${xp} XP`, { description: quest.title, duration: 3000 });
  };

  const logCheckin = (checkin: { sleep: number; energy: number; mood: number }) => {
    addActivity({
      type: 'checkin',
      title: 'Daily Check-In',
      description: `Sleep: ${checkin.sleep}/5 · Energy: ${checkin.energy}/5 · Mood: ${checkin.mood}/5`,
      xp: XP_VALUES.checkin,
      pillar: null,
      metadata: checkin,
    });
    addLogEntry('checkin', `Sleep: ${checkin.sleep}/5 · Energy: ${checkin.energy}/5 · Mood: ${checkin.mood}/5`, XP_VALUES.checkin);
    toast.success(`+${XP_VALUES.checkin} XP`, { description: 'Check-in recorded', duration: 3000 });
  };

  const logFocusComplete = (session: { id: string; actualMinutes: number; distractionCount: number; pillarId: string }) => {
    const xp = session.actualMinutes * XP_VALUES.focus_per_minute
      + (session.distractionCount === 0 ? XP_VALUES.focus_no_distraction_bonus : 0);
    addActivity({
      type: 'focus_complete',
      title: `Focus Session: ${session.actualMinutes}m`,
      description: session.distractionCount === 0 ? 'Zero distractions — perfect focus!' : `${session.distractionCount} distraction(s)`,
      xp,
      pillar: session.pillarId as import('@/lib/types').Pillar,
      metadata: { sessionId: session.id, distractions: session.distractionCount },
    });
    toast.success(`+${xp} XP`, { description: `${session.actualMinutes}m focused`, duration: 3000 });
  };

  const logJournal = (entry: { id: string; text?: string; content?: string; mood?: string; wordCount?: number }) => {
    const content = entry.text ?? entry.content ?? '';
    addActivity({
      type: 'journal',
      title: 'Journal Entry',
      description: content.slice(0, 80) + (content.length > 80 ? '...' : ''),
      xp: XP_VALUES.journal,
      pillar: 'spirit',
      metadata: { entryId: entry.id, mood: entry.mood, wordCount: entry.wordCount ?? 0 },
    });
    addLogEntry('journal', 'Journal entry', XP_VALUES.journal, 'spirit');
    toast.success(`+${XP_VALUES.journal} XP`, { description: 'Journal saved', duration: 3000 });
  };

  const logGoalCreate = (goal: { id: string; title: string; pillar: string }) => {
    addActivity({
      type: 'goal_create',
      title: `New Goal: ${goal.title}`,
      description: null,
      xp: XP_VALUES.goal_create,
      pillar: goal.pillar as import('@/lib/types').Pillar,
      metadata: { goalId: goal.id },
    });
    toast.success(`+${XP_VALUES.goal_create} XP`, { description: 'Goal created', duration: 3000 });
  };

  const logGoalComplete = (goal: { title: string; pillar: string }) => {
    addActivity({
      type: 'goal_complete',
      title: `Goal Complete: ${goal.title}`,
      description: null,
      xp: XP_VALUES.goal_complete,
      pillar: goal.pillar as import('@/lib/types').Pillar,
      metadata: {},
    });
    toast.success('🏆 Goal Complete!', { description: `${goal.title} — +${XP_VALUES.goal_complete} XP`, duration: 4000 });
  };

  const logIdeaSave = (idea: { id: string; title?: string; raw?: string; category?: string }) => {
    const content = idea.title ?? idea.raw ?? '';
    addActivity({
      type: 'idea_save',
      title: 'Idea Captured',
      description: content.slice(0, 60),
      xp: XP_VALUES.idea_save,
      pillar: 'mind',
      metadata: { ideaId: idea.id },
    });
    toast.success(`+${XP_VALUES.idea_save} XP`, { description: 'Idea saved', duration: 2000 });
  };

  const logLoginBonus = (consecutiveDays: number, xp: number) => {
    addActivity({
      type: 'login_bonus',
      title: `Login Bonus (Day ${consecutiveDays})`,
      description: null,
      xp,
      pillar: null,
      metadata: { consecutiveDays },
    });
    toast.success('Welcome back!', { description: `Day ${consecutiveDays} — +${xp} XP`, duration: 3000 });
  };

  const logLevelUp = (newLevel: number, className: string) => {
    addActivity({
      type: 'level_up',
      title: `Level Up! → Level ${newLevel}`,
      description: `New rank: ${className}`,
      xp: 0,
      pillar: null,
      metadata: { level: newLevel, class: className },
    });
    toast('🎉 LEVEL UP!', { description: `You reached Level ${newLevel} — ${className}`, duration: 6000 });
  };

  return {
    logTaskComplete,
    logCheckin,
    logFocusComplete,
    logJournal,
    logGoalCreate,
    logGoalComplete,
    logIdeaSave,
    logLoginBonus,
    logLevelUp,
  };
}
