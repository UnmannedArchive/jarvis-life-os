import { NextResponse } from 'next/server';
import { exchangeGoogleCode } from '@/lib/google/oauth';

export const runtime = 'nodejs';

// Exchange a Google OAuth code for tokens using the server-only client secret,
// then hand the tokens back to the client (which persists them in the store).
export async function POST(req: Request) {
  let code: unknown;
  try {
    ({ code } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof code !== 'string' || !code) {
    return NextResponse.json({ error: 'Missing "code"' }, { status: 400 });
  }

  try {
    return NextResponse.json(await exchangeGoogleCode(code));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google token exchange failed';
    const status = message.includes('env not configured') ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
