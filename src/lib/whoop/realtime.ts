// ---------------------------------------------------------------------------
// WHOOP realtime read (browser). Reads the latest whoop_data row the webhook
// keeps fresh, and subscribes to live changes via Supabase Realtime — so the UI
// updates the instant WHOOP pushes new data, even after the tab was closed.
//
// Uses a dedicated anon client from the public env, independent of the app's
// (disabled) CLOUD_SYNC_ENABLED gamified-sync switch.
// ---------------------------------------------------------------------------

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { WhoopData } from './types';

let _client: SupabaseClient | null = null;

export function isWhoopRealtimeConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    );
  }
  return _client;
}

interface WhoopDataRow {
  data: WhoopData;
  updated_at: string;
}

/** Read the current server-side bundle for a user (null if none yet). */
export async function readWhoopData(
  userId: number,
): Promise<{ data: WhoopData; updatedAt: string } | null> {
  const { data, error } = await getClient()
    .from('whoop_data')
    .select('data, updated_at')
    .eq('whoop_user_id', userId)
    .maybeSingle<WhoopDataRow>();
  if (error || !data) return null;
  return { data: data.data, updatedAt: data.updated_at };
}

/** Subscribe to live whoop_data changes for a user. Returns an unsubscribe fn. */
export function subscribeWhoopData(
  userId: number,
  onChange: (data: WhoopData, updatedAt: string) => void,
): () => void {
  const channel = getClient()
    .channel(`whoop_data:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'whoop_data', filter: `whoop_user_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as WhoopDataRow | undefined;
        if (row?.data) onChange(row.data, row.updated_at);
      },
    )
    .subscribe();

  return () => {
    getClient().removeChannel(channel);
  };
}
