'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useStore } from '@/stores/useStore';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import TerminalLog from '@/components/hud/TerminalLog';
import LevelUpOverlay from '@/components/hud/LevelUpOverlay';
import NotificationToast from '@/components/hud/NotificationToast';
import CriticalHitOverlay from '@/components/dashboard/CriticalHitOverlay';
import KeyboardShortcuts from '@/components/providers/KeyboardShortcuts';
import UndoToast from '@/components/hud/UndoToast';
import ActivityDrawer from '@/components/activity/ActivityDrawer';
import LoginModal from '@/components/auth/LoginModal';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { loadUserData, createNewUser } from '@/lib/supabaseSync';
import { shouldNudgeBackup } from '@/lib/backupNudge';
import { toast } from 'sonner';
import { PILLAR_CONFIG } from '@/lib/types';
import type { User, Pillar, LifePillar } from '@/lib/types';

const GUEST_USER: User = {
  id: 'guest',
  email: '',
  display_name: 'Guest',
  created_at: new Date().toISOString(),
  total_xp: 0,
  current_streak: 0,
  longest_streak: 0,
  character_class: 'RECRUIT',
  avatar_url: null,
};

// The six life pillars start at level 1 with no XP. They must exist in the
// store before any quest is completed — completeQuest maps over this array to
// add pillar XP, so an empty array silently drops all per-pillar progress
// (the Life Balance radar and pillar analytics stay blank forever).
function seedPillars(userId: string): LifePillar[] {
  return (Object.keys(PILLAR_CONFIG) as Pillar[]).map((pillar) => ({
    id: `pillar-${pillar}`,
    user_id: userId,
    pillar,
    current_xp: 0,
    level: 1,
    streak: 0,
    last_activity_date: null,
  }));
}

interface CloudData {
  user: User;
  pillars: import('@/lib/types').LifePillar[];
  quests: import('@/lib/types').Quest[];
  todayCheckin: import('@/lib/types').DailyCheckin | null;
  activityLog: import('@/lib/types').ActivityLogEntry[];
  goals: import('@/lib/types').Goal[];
}

function loadGuestMode(loadFromCloud: (data: CloudData) => void) {
  const currentUser = useStore.getState().user;
  if (!currentUser || currentUser.id === 'guest') {
    loadFromCloud({
      user: GUEST_USER,
      pillars: [],
      quests: [],
      todayCheckin: null,
      activityLog: [],
      goals: [],
    });
  }
}

// Local-only mode: the persisted zustand store *is* the save file. Seed a fresh
// profile on first run, but never overwrite an existing local save — unlike
// loadGuestMode, which resets every slice to an empty guest on each load.
function initLocalSave() {
  const { user, pillars } = useStore.getState();
  const resolvedUser = user ?? GUEST_USER;
  useStore.setState({
    user: resolvedUser,
    pillars: pillars && pillars.length > 0 ? pillars : seedPillars(resolvedUser.id),
    isAuthenticated: true,
    isLoading: false,
  });
}

export default function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const user = useStore((s) => s.user);
  const backgroundImage = useStore((s) => s.backgroundImage);
  const loadFromCloud = useStore((s) => s.loadFromCloud);
  const logout = useStore((s) => s.logout);
  const [ready, setReady] = useState(false);
  const [loginDismissed, setLoginDismissed] = useState(false);

  const showLogin =
    ready &&
    isSupabaseConfigured() &&
    (!user || user.id === 'guest') &&
    !loginDismissed;

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured()) {
      // Storage is async (IndexedDB) — the persisted save may still be loading
      // when this effect runs. Seeding before hydration would mis-detect a
      // fresh install, so wait for hydration to finish.
      let nudgeTimer: ReturnType<typeof setTimeout> | undefined;
      const init = () => {
        if (!mounted) return;
        initLocalSave();
        setReady(true);

        // Delay past first paint: this effect can run before the sibling
        // <Toaster> subscribes, and sonner drops toasts fired before mount.
        nudgeTimer = setTimeout(() => {
          if (!mounted) return;
          const s = useStore.getState();
          const hasContent = s.quests.length > 0 || s.activityLog.length > 0;
          if (shouldNudgeBackup(new Date(), s.lastExportAt, s.lastBackupNudgeAt, hasContent)) {
            s.setLastBackupNudgeAt(new Date().toISOString());
            toast('Back up your save?', {
              description: 'Your progress lives only in this browser. Export a copy from Settings.',
              action: { label: 'Export', onClick: () => router.push('/settings') },
              duration: 10000,
            });
          }
        }, 1500);
      };

      if (useStore.persist.hasHydrated()) {
        init();
        return () => {
          mounted = false;
          if (nudgeTimer) clearTimeout(nudgeTimer);
        };
      }
      const unsubHydration = useStore.persist.onFinishHydration(init);
      return () => {
        mounted = false;
        unsubHydration();
        if (nudgeTimer) clearTimeout(nudgeTimer);
      };
    }

    const fallbackTimer = setTimeout(() => {
      if (mounted && !useStore.getState().user) {
        console.warn('[AppShell] Auth check timed out, loading guest mode');
        loadGuestMode(loadFromCloud);
        setReady(true);
      }
    }, 8000);

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session) {
          loadGuestMode(loadFromCloud);
          setReady(true);
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
      } catch (err) {
        console.warn('[AppShell] Auth error, falling back to guest mode:', err);
        if (mounted) {
          loadGuestMode(loadFromCloud);
        }
      } finally {
        if (mounted) setReady(true);
      }
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          logout();
          loadGuestMode(loadFromCloud);
          router.replace('/');
        }

        if (event === 'SIGNED_IN' && session) {
          try {
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
          } catch (err) {
            console.error('[AppShell] Failed to load user data after sign in:', err);
          }
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready && !user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg ambient-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-border border-t-accent rounded-full animate-spin shadow-[0_0_20px_rgba(200,200,200,0.15)]" />
          <p className="text-xs text-text-placeholder">Connecting...</p>
        </div>
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
              opacity: 0.2,
            }}
          />
          <div className="absolute inset-0 z-0 bg-black/75" />
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
      <ActivityDrawer />
      <LoginModal open={showLogin} onDismiss={() => setLoginDismissed(true)} />
    </div>
  );
}
