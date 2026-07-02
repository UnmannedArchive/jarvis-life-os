import { NextResponse } from 'next/server';
import { exchangeWhoopCode } from '@/lib/whoop/oauth';

export const runtime = 'nodejs';

// The browser hits WHOOP's authorize page, WHOOP redirects back to the client
// callback page with a `code`, and the client POSTs that code here. We exchange
// it for tokens using the server-only client secret and hand the tokens back to
// the client, which persists them in the store (like the iCal URL). The secret
// never leaves the server.
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
    const tokens = await exchangeWhoopCode(code);
    return NextResponse.json(tokens);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'WHOOP token exchange failed';
    const status = message.includes('env not configured') ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
