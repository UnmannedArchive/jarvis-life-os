import { NextResponse } from 'next/server';
import type { WeeklyStats } from '@/lib/weeklyReview';

export const runtime = 'nodejs';

// Same free-tier Gemini setup as /api/whoop/coach and /api/plan-day. Without a
// key the client keeps the locally computed stats, so this is purely additive.
const MODEL = process.env.REVIEW_MODEL || process.env.PLANNER_MODEL || 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are a sharp weekly-retro coach inside a personal "Life OS" app. You receive one week of the user's aggregated stats: daily check-in averages (1-5 scales), quests completed (with dominant life pillar), XP earned (with best day), focus sessions, journal/idea counts, and optional WHOOP data (avg recovery %, peak-recovery day, high-strain days).

Write a SHORT weekly review — 3 to 4 sentences. Structure: (1) lead with the week's clearest win, with the number. (2) Name one real pattern or connection across the data (e.g. best XP day landing on peak recovery, low sleep average alongside few focus sessions). (3) End with ONE specific, doable focus for next week grounded in the data. If most fields are empty, say the honest thing: the week is thin on data, and name the single habit that would make next week's review useful.
No fluff, no preamble, no medical claims, no emojis, no markdown. Second person, like a coach who respects your time.`;

interface ReviewBody {
  stats?: WeeklyStats;
}
interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  let body: ReviewBody;
  try {
    body = (await req.json()) as ReviewBody;
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }
  const stats = body.stats;
  if (!stats || typeof stats !== 'object' || !stats.windowStart) {
    return NextResponse.json({ error: 'stats is required' }, { status: 400 });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: 'user',
            parts: [{ text: `My week (${stats.windowStart} to ${stats.windowEnd}):\n${JSON.stringify(stats, null, 2)}` }],
          },
        ],
        // 2.5-flash spends output tokens "thinking" before the text, so give
        // headroom (matches /api/whoop/coach) or the narrative gets truncated.
        generationConfig: { maxOutputTokens: 2048, temperature: 0.5 },
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'network error';
    return NextResponse.json({ error: 'review unreachable', detail }, { status: 502 });
  }

  const data = (await res.json().catch(() => null)) as GeminiResponse | null;
  if (!res.ok) {
    return NextResponse.json(
      { error: 'review failed', detail: data?.error?.message || res.statusText },
      { status: 502 },
    );
  }

  const narrative = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!narrative) {
    return NextResponse.json({ error: 'review returned no content' }, { status: 502 });
  }
  return NextResponse.json({ narrative });
}
