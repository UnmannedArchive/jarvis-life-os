import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDIxOTIwMDB9.placeholder';

// Master switch for the optional cloud layer. While false, Life OS runs entirely
// from local storage on this device — no login prompt, no network — like a saved
// game. Your data lives in the browser's localStorage under "life-os-storage"
// (see the persist config in useStore.ts). To re-enable cross-device cloud sync +
// Google sign-in later: flip this to true and set NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.
export const CLOUD_SYNC_ENABLED = false;

export function isSupabaseConfigured(): boolean {
  if (!CLOUD_SYNC_ENABLED) return false;
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return !!(
    rawUrl &&
    rawKey &&
    rawUrl !== 'your-supabase-url-here' &&
    rawKey !== 'your-supabase-anon-key-here'
  );
}

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const configured = isSupabaseConfigured();
    const url = configured ? process.env.NEXT_PUBLIC_SUPABASE_URL!.trim() : PLACEHOLDER_URL;
    const key = configured ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim() : PLACEHOLDER_KEY;

    _supabase = createClient(url, key, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
      global: {
        fetch: (input, init) => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000);
          return fetch(input, { ...init, signal: controller.signal }).finally(() =>
            clearTimeout(timeout)
          );
        },
      },
    });

    if (typeof window !== 'undefined' && !configured) {
      console.warn(
        '[Supabase] Using placeholder config. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local for auth and sync.'
      );
    }
  }
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
