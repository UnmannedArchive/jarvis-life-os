import { NextResponse } from 'next/server';
import { getSupabaseAdmin, isWhoopCloudConfigured } from '@/lib/whoop/supabaseAdmin';
import { fetchWhoopProfile } from '@/lib/whoop/bundle';

export const runtime = 'nodejs';

// Called by the client right after a successful WHOOP connect. We re-derive the
// canonical WHOOP user_id from the profile (never trust a client-supplied id),
// then store the token pair server-side so the webhook can fetch data later.
// Returns the user_id so the client can read its own whoop_data row.
export async function POST(req: Request) {
  if (!isWhoopCloudConfigured()) {
    return NextResponse.json({ error: 'Cloud sync not configured' }, { status: 503 });
  }

  let body: { accessToken?: string; refreshToken?: string; expiresAt?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { accessToken, refreshToken, expiresAt } = body;
  if (!accessToken || !refreshToken || typeof expiresAt !== 'number') {
    return NextResponse.json({ error: 'Missing token fields' }, { status: 400 });
  }

  try {
    const profile = await fetchWhoopProfile(accessToken);
    const { error } = await getSupabaseAdmin()
      .from('whoop_tokens')
      .upsert(
        {
          whoop_user_id: profile.user_id,
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: new Date(expiresAt).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'whoop_user_id' },
      );
    if (error) throw new Error(error.message);
    return NextResponse.json({ userId: profile.user_id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to store token';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
