import { NextResponse } from 'next/server';
import { readSessions } from '@/lib/workflow/eventsFile';
import { aggregateSessions } from '@/lib/workflow/aggregate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || todayLocal();

  let result;
  try {
    result = readSessions();
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'read error';
    return NextResponse.json({ error: 'could not read monitor data', detail }, { status: 500 });
  }

  const aggregate = aggregateSessions(result.sessions, date);
  return NextResponse.json({ monitorRunning: result.monitorRunning, aggregate });
}
