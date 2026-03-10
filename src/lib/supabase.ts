import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDIxOTIwMDB9.placeholder';

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    const isPlaceholder =
      !rawUrl ||
      !rawKey ||
      rawUrl === 'your-supabase-url-here' ||
      rawKey === 'your-supabase-anon-key-here';
    const url = isPlaceholder ? PLACEHOLDER_URL : rawUrl;
    const key = isPlaceholder ? PLACEHOLDER_KEY : rawKey;

    _supabase = createClient(url, key);

    if (typeof window !== 'undefined' && isPlaceholder) {
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
