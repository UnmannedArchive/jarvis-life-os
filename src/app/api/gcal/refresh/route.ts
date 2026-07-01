import { NextResponse } from 'next/server';
import { refreshGoogleTokens } from '@/lib/google/oauth';

export const runtime = 'nodejs';

// Refresh an expired Google access token. Google keeps the same refresh token,
// which the helper passes back through. Secret stays server-side.
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
    return NextResponse.json(await refreshGoogleTokens(refreshToken));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google token refresh failed';
    const status = message.includes('env not configured') ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
