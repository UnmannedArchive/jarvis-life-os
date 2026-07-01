import { NextResponse } from 'next/server';
import { refreshWhoopTokens } from '@/lib/whoop/oauth';

export const runtime = 'nodejs';

// The client calls this when its WHOOP access token has expired. We trade the
// refresh token for a rotated pair (WHOOP invalidates the old tokens on use)
// and return it; the client persists the new pair. Secret stays server-side.
export async function POST(req: Request) {
  let refreshToken: unknown;
  try {
    ({ refreshToken } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof refreshToken !== 'string' || !refreshToken) {
    return NextResponse.json({ error: 'Missing "refreshToken"' }, { status: 400 });
  }

  try {
    const tokens = await refreshWhoopTokens(refreshToken);
    return NextResponse.json(tokens);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'WHOOP token refresh failed';
    const status = message.includes('env not configured') ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
