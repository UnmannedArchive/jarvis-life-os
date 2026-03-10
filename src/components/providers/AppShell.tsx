'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useStore } from '@/stores/useStore';
import { usePathname, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import TerminalLog from '@/components/hud/TerminalLog';
import LevelUpOverlay from '@/components/hud/LevelUpOverlay';
import NotificationToast from '@/components/hud/NotificationToast';
import CriticalHitOverlay from '@/components/dashboard/CriticalHitOverlay';
import KeyboardShortcuts from '@/components/providers/KeyboardShortcuts';
import UndoToast from '@/components/hud/UndoToast';
import { supabase } from '@/lib/supabase';
import { loadUserData, createNewUser } from '@/lib/supabaseSync';

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const user = useStore((s) => s.user);
  const backgroundImage = useStore((s) => s.backgroundImage);
  const loadFromCloud = useStore((s) => s.loadFromCloud);
  const logout = useStore((s) => s.logout);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        if (mounted) {
          setChecking(false);
          if (!isAuthPage) router.replace('/login');
        }
        return;
      }

      const authUser = session.user;
      let data = await loadUserData(authUser.id);

      if (!data.user) {
        const displayName =
          (authUser.user_metadata?.display_name as string) ||
          authUser.email?.split('@')[0] ||
          'User';
        data = await createNewUser(authUser.id, authUser.email!, displayName);
      }

      if (data.user && mounted) {
        loadFromCloud({
          user: data.user,
          pillars: data.pillars,
          quests: data.quests,
          todayCheckin: data.todayCheckin,
          activityLog: data.activityLog,
          goals: data.goals,
        });
      }

      if (mounted) setChecking(false);
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          logout();
          router.replace('/login');
        }

        if (event === 'SIGNED_IN' && session) {
          const authUser = session.user;
          let data = await loadUserData(authUser.id);

          if (!data.user) {
            const displayName =
              (authUser.user_metadata?.display_name as string) ||
              authUser.email?.split('@')[0] ||
              'User';
            data = await createNewUser(authUser.id, authUser.email!, displayName);
          }

          if (data.user) {
            loadFromCloud({
              user: data.user,
              pillars: data.pillars,
              quests: data.quests,
              todayCheckin: data.todayCheckin,
              activityLog: data.activityLog,
              goals: data.goals,
            });
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  if (isAuthPage) return <>{children}</>;

  if (checking) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg ambient-bg">
        <div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin shadow-[0_0_20px_rgba(200,200,200,0.15)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg ambient-bg">
        <div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin shadow-[0_0_20px_rgba(200,200,200,0.15)]" />
      </div>
    );
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
