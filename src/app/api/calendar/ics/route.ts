import { NextResponse } from 'next/server';
import { normalizeIcsUrl } from '@/lib/icsUrl';

export const runtime = 'nodejs';

// Browser-side fetch of a Google secret iCal address dies on CORS, so the
// client posts the URL here and we fetch it server-side. The URL is never
// stored on the server; it lives in the client's persisted store.
export async function POST(req: Request) {
  let url: unknown;
  try {
    ({ url } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof url !== 'string') {
    return NextResponse.json({ error: 'Missing "url"' }, { status: 400 });
  }

  const safeUrl = normalizeIcsUrl(url);
  if (!safeUrl) {
    return NextResponse.json(
      { error: 'URL must be a public https:// (or webcal://) iCal address' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(safeUrl, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: 'text/calendar, text/plain, */*' },
      redirect: 'follow',
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Feed responded with ${res.status}. Check the URL (Google: "Secret address in iCal format").` },
        { status: 502 }
      );
    }
    const ics = await res.text();
    if (!ics.includes('BEGIN:VCALENDAR')) {
      return NextResponse.json(
        { error: 'That URL did not return an iCal file' },
        { status: 502 }
      );
    }
    return NextResponse.json({ ics });
  } catch {
    return NextResponse.json(
      { error: 'Could not reach the calendar feed (timeout or network error)' },
      { status: 502 }
    );
  }
}
