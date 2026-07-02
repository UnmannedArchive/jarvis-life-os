// ---------------------------------------------------------------------------
// Service-role Supabase client — SERVER ONLY. Used by the WHOOP webhook and the
// store-token route to read/write whoop_tokens (which is otherwise locked to
// anon) and to upsert whoop_data. Never import from a client component:
// SUPABASE_SERVICE_ROLE_KEY must never reach the browser.
// ---------------------------------------------------------------------------

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _admin: SupabaseClient | null = null;

export function isWhoopCloudConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!isWhoopCloudConfigured()) {
    throw new Error('Supabase admin not configured (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  }
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return _admin;
}
