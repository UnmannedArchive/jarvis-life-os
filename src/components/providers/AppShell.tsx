'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useStore } from '@/stores/useStore';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import TerminalLog from '@/components/hud/TerminalLog';
import LevelUpOverlay from '@/components/hud/LevelUpOverlay';
import NotificationToast from '@/components/hud/NotificationToast';
import CriticalHitOverlay from '@/components/dashboard/CriticalHitOverlay';
import KeyboardShortcuts from '@/components/providers/KeyboardShortcuts';
import UndoToast from '@/components/hud/UndoToast';
import Onboarding from '@/components/providers/Onboarding';
import { Pillar } from '@/lib/types';

const ALL_PILLARS: Pillar[] = ['mind', 'body', 'work', 'wealth', 'spirit', 'social'];

function initializeBlankUser(store: ReturnType<typeof useStore.getState>, name: string = 'User') {
  store.setUser({
    id: 'local-user', email: '', display_name: name,
    created_at: new Date().toISOString(), total_xp: 0,
    current_streak: 0, longest_streak: 0, character_class: 'RECRUIT', avatar_url: null,
  });
  store.setPillars(ALL_PILLARS.map((pillar) => ({
    id: crypto.randomUUID(), user_id: 'local-user', pillar,
    current_xp: 0, level: 1, streak: 0, last_activity_date: null,
  })));
  store.setIsLoading(false);
  store.setIsAuthenticated(true);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isLoading = useStore((s) => s.isLoading);
  const user = useStore((s) => s.user);
  const backgroundImage = useStore((s) => s.backgroundImage);
  const [hydrated, setHydrated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const unsub = useStore.persist.onFinishHydration(() => {
      setHydrated(true);
      const state = useStore.getState();
      if (state.user) {
        state.setIsLoading(false);
        state.setIsAuthenticated(true);
      }
    });

    if (useStore.persist.hasHydrated()) {
      setHydrated(true);
      const state = useStore.getState();
      if (state.user) {
        state.setIsLoading(false);
        state.setIsAuthenticated(true);
      }
    }

    return unsub;
  }, []);

  useEffect(() => {
    if (hydrated && !user) {
      setShowOnboarding(true);
    }
  }, [hydrated, user]);

  const handleOnboardingComplete = (name: string) => {
    initializeBlankUser(useStore.getState(), name);
    setShowOnboarding(false);
  };

  if (isAuthPage) return <>{children}</>;

  if (!hydrated || (isLoading && !showOnboarding)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg ambient-bg">
        <div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin shadow-[0_0_20px_rgba(200,200,200,0.15)]" />
      </div>
    );
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="h-screen w-screen bg-bg ambient-bg flex flex-col overflow-hidden relative">
      {backgroundImage && (
        <>
          <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${backgroundImage})`,
              opacity: 0.4,
            }}
          />
          <div className="absolute inset-0 z-0 bg-black/60" />
        </>
      )}
      <LevelUpOverlay />
      <NotificationToast />
      <CriticalHitOverlay />
      <KeyboardShortcuts />
      <UndoToast />
      <Navbar />
      <div className="flex flex-1 overflow-hidden relative z-10">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      </div>
      <div className="hidden md:block relative z-10"><TerminalLog /></div>
      <MobileNav />
    </div>
  );
}
