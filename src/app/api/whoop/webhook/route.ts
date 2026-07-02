import { NextResponse } from 'next/server';
import { verifyWhoopSignature, parseWhoopEvent } from '@/lib/whoop/webhook';
import { getSupabaseAdmin, isWhoopCloudConfigured } from '@/lib/whoop/supabaseAdmin';
import { refreshWhoopTokens } from '@/lib/whoop/oauth';
import { fetchWhoopBundle, WhoopUnauthorizedError } from '@/lib/whoop/bundle';

export const runtime = 'nodejs';

const EXPIRY_SKEW_MS = 60_000;

// WHOOP POSTs here the instant new data lands (recovery/sleep/workout
// updated|deleted). We verify the signature, look up the stored token for the
// user, refresh it if needed, re-pull their bundle and upsert whoop_data — so
// the data is current even with no browser open. Always 200 on signature-valid
// requests we can't act on, so WHOOP doesn't retry forever.
export async function POST(req: Request) {
  const secret = process.env.WHOOP_CLIENT_SECRET;
  if (!secret || !isWhoopCloudConfigured()) {
    return NextResponse.json({ error: 'WHOOP cloud not configured' }, { status: 503 });
  }

  const raw = await req.text();
  const signature = req.headers.get('x-whoop-signature');
  const timestamp = req.headers.get('x-whoop-signature-timestamp');

  if (!signature || !timestamp || !verifyWhoopSignature(secret, timestamp, raw, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = parseWhoopEvent(raw);
  if (!event) {
    return NextResponse.json({ error: 'Malformed event' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  try {
    const { data: row } = await admin
      .from('whoop_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('whoop_user_id', event.userId)
      .maybeSingle();

    // Not a user we hold a token for — acknowledge so WHOOP stops retrying.
    if (!row) return NextResponse.json({ ok: true, ignored: true });

    let accessToken = row.access_token as string;
    if (Date.parse(row.expires_at as string) - Date.now() < EXPIRY_SKEW_MS) {
      const rotated = await refreshWhoopTokens(row.refresh_token as string);
      accessToken = rotated.accessToken;
      await admin
        .from('whoop_tokens')
        .update({
          access_token: rotated.accessToken,
          refresh_token: rotated.refreshToken,
          expires_at: new Date(rotated.expiresAt).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('whoop_user_id', event.userId);
    }

    const bundle = await fetchWhoopBundle(accessToken);
    const { error } = await admin.from('whoop_data').upsert(
      {
        whoop_user_id: event.userId,
        data: bundle,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'whoop_user_id' },
    );
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof WhoopUnauthorizedError) {
      // Token is dead (user revoked); 200 so WHOOP stops retrying this event.
      return NextResponse.json({ ok: true, tokenInvalid: true });
    }
    const message = err instanceof Error ? err.message : 'Webhook processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
