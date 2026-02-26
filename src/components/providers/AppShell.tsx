'use client';

import { useEffect, ReactNode } from 'react';
import { useStore } from '@/stores/useStore';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import TerminalLog from '@/components/hud/TerminalLog';
import LevelUpOverlay from '@/components/hud/LevelUpOverlay';
import NotificationToast from '@/components/hud/NotificationToast';
import { Pillar, LifePillar } from '@/lib/types';

const ALL_PILLARS: Pillar[] = ['mind', 'body', 'work', 'wealth', 'spirit', 'social'];

function initializeBlankUser(store: ReturnType<typeof useStore.getState>) {
  store.setUser({
    id: 'local-user',
    email: '',
    display_name: 'Joseph',
    created_at: new Date().toISOString(),
    total_xp: 0,
    current_streak: 0,
    longest_streak: 0,
    character_class: 'RECRUIT',
    avatar_url: null,
  });

  const pillars: LifePillar[] = ALL_PILLARS.map((pillar) => ({
    id: crypto.randomUUID(),
    user_id: 'local-user',
    pillar,
    current_xp: 0,
    level: 1,
    streak: 0,
    last_activity_date: null,
  }));
  store.setPillars(pillars);
  store.setIsLoading(false);
  store.setIsAuthenticated(true);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isLoading = useStore((s) => s.isLoading);

  useEffect(() => {
    const state = useStore.getState();
    if (!state.user) {
      initializeBlankUser(state);
    }
  }, []);

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-border border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-bg-secondary flex flex-col overflow-hidden">
      <LevelUpOverlay />
      <NotificationToast />
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
      <div className="hidden md:block">
        <TerminalLog />
      </div>
      <MobileNav />
    </div>
  );
}
