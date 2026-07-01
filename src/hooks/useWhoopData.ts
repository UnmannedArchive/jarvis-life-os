'use client';

// ---------------------------------------------------------------------------
// useWhoopData — single source for WHOOP biometrics in the UI. Mirrors
// useCalendarData: serves the cached bundle instantly, refreshes in the
// background when stale, and persists rotated tokens + fresh data to the store.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/stores/useStore';
import { fetchWhoopData, WhoopAuthError } from '@/lib/whoop/client';
import { buildWhoopAuthorizeUrl, isWhoopConfigured } from '@/lib/whoop/constants';
import { readWhoopData, subscribeWhoopData, isWhoopRealtimeConfigured } from '@/lib/whoop/realtime';
import { WHOOP_STATE_KEY } from '@/app/whoop/callback/page';
import type { WhoopRecovery, WhoopSleep, WhoopCycle, WhoopData } from '@/lib/whoop/types';

const STALE_MS = 10 * 60 * 1000; // re-sync if the cache is older than this
const POLL_MS = 5 * 60 * 1000; // while the tab is open+visible, check this often

export interface WhoopToday {
  recovery: WhoopRecovery | null;
  sleep: WhoopSleep | null;
  cycle: WhoopCycle | null;
}

export function useWhoopData() {
  const whoopAuth = useStore((s) => s.whoopAuth);
  const whoopCache = useStore((s) => s.whoopCache);
  const whoopUserId = useStore((s) => s.whoopUserId);
  const setWhoopAuth = useStore((s) => s.setWhoopAuth);
  const setWhoopCache = useStore((s) => s.setWhoopCache);
  const clearWhoopAuth = useStore((s) => s.clearWhoopAuth);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const connected = !!whoopAuth;
  const configured = isWhoopConfigured();

  const refresh = useCallback(async () => {
    if (!whoopAuth || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWhoopData(whoopAuth, setWhoopAuth);
      setWhoopCache({ fetchedAt: new Date().toISOString(), ...data });
    } catch (err) {
      if (err instanceof WhoopAuthError) {
        clearWhoopAuth();
        setError('WHOOP connection expired — please reconnect.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to sync WHOOP.');
      }
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [whoopAuth, setWhoopAuth, setWhoopCache, clearWhoopAuth]);

  // Keep the latest fetch time in a ref so the event handlers below (whose
  // closures are stable) always read the current value.
  const fetchedAtRef = useRef<string | null>(whoopCache?.fetchedAt ?? null);
  useEffect(() => {
    fetchedAtRef.current = whoopCache?.fetchedAt ?? null;
  }, [whoopCache?.fetchedAt]);

  const refreshIfStale = useCallback(() => {
    if (!whoopAuth) return;
    const at = fetchedAtRef.current;
    if (!at || Date.now() - new Date(at).getTime() > STALE_MS) refresh();
  }, [whoopAuth, refresh]);

  // Sync on connect, and keep it current the whole time the tab is open: when
  // the window regains focus, when the tab becomes visible again, and on a
  // light interval while visible. Each trigger only hits WHOOP if the cached
  // data is actually stale, so it stays well within rate limits.
  useEffect(() => {
    if (!whoopAuth) return;
    refreshIfStale();

    const onFocus = () => refreshIfStale();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshIfStale();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') refreshIfStale();
    }, POLL_MS);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, [whoopAuth, refreshIfStale]);

  // Cloud push: when the webhook keeps a server-side whoop_data row fresh, read
  // it on mount and subscribe to live changes so the widget updates the instant
  // WHOOP pushes new data — even if the tab was closed when it happened.
  const applyServerData = useCallback(
    (data: WhoopData, updatedAt: string) => {
      setWhoopCache({
        fetchedAt: updatedAt,
        recovery: data.recovery,
        sleep: data.sleep,
        cycles: data.cycles,
        workouts: data.workouts,
      });
    },
    [setWhoopCache],
  );

  useEffect(() => {
    if (!whoopUserId || !isWhoopRealtimeConfigured()) return;
    let active = true;
    readWhoopData(whoopUserId).then((res) => {
      if (active && res) applyServerData(res.data, res.updatedAt);
    });
    const unsubscribe = subscribeWhoopData(whoopUserId, applyServerData);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [whoopUserId, applyServerData]);

  /** Start the OAuth flow: stash CSRF state, redirect the browser to WHOOP. */
  const connect = useCallback(() => {
    if (!configured) {
      setError('WHOOP is not configured. Add NEXT_PUBLIC_WHOOP_CLIENT_ID to .env.local.');
      return;
    }
    const state = crypto.randomUUID();
    sessionStorage.setItem(WHOOP_STATE_KEY, state);
    window.location.href = buildWhoopAuthorizeUrl(state);
  }, [configured]);

  // Records come back most-recent-first, so [0] is the latest.
  const today: WhoopToday = useMemo(
    () => ({
      recovery: whoopCache?.recovery[0] ?? null,
      sleep: whoopCache?.sleep[0] ?? null,
      cycle: whoopCache?.cycles[0] ?? null,
    }),
    [whoopCache],
  );

  return {
    connected,
    configured,
    loading,
    error,
    today,
    week: whoopCache,
    lastSynced: whoopCache?.fetchedAt ?? null,
    refresh,
    connect,
    disconnect: clearWhoopAuth,
  };
}
