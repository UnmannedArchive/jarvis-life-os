'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useStore } from '@/stores/useStore';
import type { XPHistoryEntry } from '@/stores/useStore';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import TerminalLog from '@/components/hud/TerminalLog';
import LevelUpOverlay from '@/components/hud/LevelUpOverlay';
import NotificationToast from '@/components/hud/NotificationToast';
import { Pillar, LifePillar } from '@/lib/types';
import { getGreeting } from '@/lib/priority';
import { format, subDays } from 'date-fns';

const DEFAULT_PILLARS: Pillar[] = ['mind', 'body', 'work', 'wealth', 'spirit', 'social'];

function generateXPHistory(): XPHistoryEntry[] {
  const history: XPHistoryEntry[] = [];
  const pillars: Pillar[] = ['mind', 'body', 'work', 'wealth', 'spirit', 'social'];
  for (let i = 30; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
    const numEntries = Math.floor(Math.random() * 4) + 1;
    for (let j = 0; j < numEntries; j++) {
      history.push({
        date,
        xp: [50, 100, 100, 150, 150, 300][Math.floor(Math.random() * 6)],
        pillar: pillars[Math.floor(Math.random() * pillars.length)],
      });
    }
  }
  return history;
}

function initializeDemoData(store: ReturnType<typeof useStore.getState>) {
  store.setUser({
    id: 'demo-user',
    email: 'joseph@jarvis.os',
    display_name: 'Joseph',
    created_at: new Date().toISOString(),
    total_xp: 2450,
    current_streak: 5,
    longest_streak: 14,
    character_class: 'ENGINEER',
    avatar_url: null,
  });

  const pillarXP: Record<Pillar, number> = {
    mind: 620, body: 380, work: 710, wealth: 290, spirit: 210, social: 240,
  };

  const pillars: LifePillar[] = DEFAULT_PILLARS.map((pillar) => ({
    id: crypto.randomUUID(),
    user_id: 'demo-user',
    pillar,
    current_xp: pillarXP[pillar],
    level: Math.floor(pillarXP[pillar] / 200) + 1,
    streak: pillar === 'work' ? 5 : pillar === 'mind' ? 3 : Math.floor(Math.random() * 4),
    last_activity_date: new Date().toISOString().split('T')[0],
  }));
  store.setPillars(pillars);

  const sampleQuests = [
    { title: 'Study for MSF Exam', pillar: 'mind' as Pillar, difficulty: 'HARD' as const, quest_type: 'daily' as const, xp_reward: 150 },
    { title: '30-min Workout', pillar: 'body' as Pillar, difficulty: 'MED' as const, quest_type: 'daily' as const, xp_reward: 100 },
    { title: 'Review Pull Requests', pillar: 'work' as Pillar, difficulty: 'MED' as const, quest_type: 'daily' as const, xp_reward: 100 },
    { title: 'Track Expenses', pillar: 'wealth' as Pillar, difficulty: 'EASY' as const, quest_type: 'daily' as const, xp_reward: 50 },
    { title: '10-min Meditation', pillar: 'spirit' as Pillar, difficulty: 'EASY' as const, quest_type: 'daily' as const, xp_reward: 50 },
    { title: 'Call a Friend', pillar: 'social' as Pillar, difficulty: 'EASY' as const, quest_type: 'daily' as const, xp_reward: 50 },
    { title: 'Read 20 Pages', pillar: 'mind' as Pillar, difficulty: 'MED' as const, quest_type: 'side' as const, xp_reward: 100 },
    { title: 'Deep Work Session (2h)', pillar: 'work' as Pillar, difficulty: 'HARD' as const, quest_type: 'side' as const, xp_reward: 150 },
    { title: 'Run 5K', pillar: 'body' as Pillar, difficulty: 'HARD' as const, quest_type: 'side' as const, xp_reward: 150 },
    { title: 'Launch Side Project MVP', pillar: 'work' as Pillar, difficulty: 'LEGENDARY' as const, quest_type: 'epic' as const, xp_reward: 300 },
  ];

  sampleQuests.forEach((q) => {
    store.addQuest({
      title: q.title,
      description: null,
      pillar: q.pillar,
      difficulty: q.difficulty,
      xp_reward: q.xp_reward,
      quest_type: q.quest_type,
      is_recurring: q.quest_type === 'daily',
      recurrence_rule: q.quest_type === 'daily' ? 'daily' : null,
      due_date: null,
    });
  });

  store.setGoals([
    {
      id: crypto.randomUUID(),
      user_id: 'demo-user',
      title: 'Launch Side Project MVP',
      description: 'Build and deploy the complete MVP with auth, core features, and landing page.',
      pillar: 'work',
      target_date: format(subDays(new Date(), -45), 'yyyy-MM-dd'),
      progress_pct: 35,
      status: 'active',
      xp_reward: 500,
      created_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: 'demo-user',
      title: 'Read 12 Books This Year',
      description: 'One book per month across mind, spirit, and wealth categories.',
      pillar: 'mind',
      target_date: format(subDays(new Date(), -300), 'yyyy-MM-dd'),
      progress_pct: 15,
      status: 'active',
      xp_reward: 500,
      created_at: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      user_id: 'demo-user',
      title: 'Run a Half Marathon',
      description: 'Train consistently and complete a 21K race.',
      pillar: 'body',
      target_date: format(subDays(new Date(), -90), 'yyyy-MM-dd'),
      progress_pct: 20,
      status: 'active',
      xp_reward: 500,
      created_at: new Date().toISOString(),
    },
  ]);

  const xpHistory = generateXPHistory();
  set_xpHistory(store, xpHistory);

  store.setIsAuthenticated(true);
}

function set_xpHistory(store: ReturnType<typeof useStore.getState>, history: XPHistoryEntry[]) {
  useStore.setState({ xpHistory: history });
}

function runBootSequence(store: ReturnType<typeof useStore.getState>) {
  const user = store.user;
  const name = user?.display_name || 'Operator';
  const { greeting } = getGreeting(name);
  const dailyCount = store.quests.filter((q) => q.quest_type === 'daily').length;

  const bootMessages = [
    { delay: 0, msg: 'SYSTEM — JARVIS Life OS v1.0 initializing...' },
    { delay: 200, msg: 'SYSTEM — Neural interface connected. Authentication verified.' },
    { delay: 400, msg: 'SYSTEM — Loading operator profile... OK' },
    { delay: 600, msg: `SYSTEM — ${dailyCount} daily quests loaded. ${store.quests.filter((q) => q.quest_type === 'side').length} side quests queued.` },
    { delay: 800, msg: `SYSTEM — Streak status: ${user?.current_streak || 0} days active. Shield: ${(user?.current_streak || 0) >= 7 ? 'ARMED' : 'STANDBY'}.` },
    { delay: 1000, msg: `SYSTEM — ${greeting} All systems operational.` },
  ];

  bootMessages.forEach(({ delay, msg }) => {
    setTimeout(() => {
      store.addLogEntry('system', msg, 0);
    }, delay);
  });
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isLoading = useStore((s) => s.isLoading);
  const [bootPhase, setBootPhase] = useState(0);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const state = useStore.getState();
    if (!state.user) {
      initializeDemoData(state);
    }
    state.setIsLoading(false);

    if (!booted) {
      const phases = [300, 600, 900, 1200, 1500];
      phases.forEach((delay, i) => {
        setTimeout(() => setBootPhase(i + 1), delay);
      });
      setTimeout(() => {
        setBooted(true);
        runBootSequence(useStore.getState());
      }, 1800);
    }
  }, [booted]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!booted) {
    return (
      <div className="h-screen w-screen hud-bg-gradient flex items-center justify-center">
        <div className="hud-grid-overlay" />
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 border-2 border-hud-green/30 border-t-hud-green rounded-full animate-spin" />
          <span className="font-[family-name:var(--font-orbitron)] text-[12px] tracking-[5px] text-hud-green glow-text">
            JARVIS LIFE OS
          </span>
          <div className="flex flex-col items-center gap-1 mt-4">
            {[
              'Connecting neural interface...',
              'Loading operator profile...',
              'Calibrating priority engine...',
              'Syncing life pillars...',
              'All systems nominal.',
            ].map((msg, i) => (
              <span
                key={i}
                className={`text-[10px] font-[family-name:var(--font-mono)] tracking-[1px] transition-all duration-300 ${
                  bootPhase > i ? 'text-hud-green/80' : 'text-hud-text-dim/30'
                }`}
              >
                [{bootPhase > i ? '✓' : '·'}] {msg}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen hud-bg-gradient flex flex-col overflow-hidden">
      <div className="hud-grid-overlay" />
      <div className="hud-scanlines" />

      <LevelUpOverlay />
      <NotificationToast />

      <Navbar />

      <div className="flex flex-1 overflow-hidden relative z-10">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>

      <div className="hidden md:block relative z-10">
        <TerminalLog />
      </div>

      <MobileNav />
    </div>
  );
}
