import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Same free-tier Gemini setup as /api/plan-day. Without a key the client falls
// back to the heuristic recommendations, so this is purely additive.
const MODEL = process.env.WHOOP_COACH_MODEL || process.env.PLANNER_MODEL || 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are a sharp, concise performance coach inside a personal "Life OS" app. You receive the user's recent days, each with: WHOOP recovery (0-100, higher = more recovered), day strain (0-21, higher = more physical exertion), and calendar load (number of items that day). The last day in the list is today.

Write SHORT, specific, actionable guidance — 2 to 3 sentences, no more. Lead with today, then the week ahead. Be concrete:
- Name the day with the best recovery as the one to schedule the most demanding work.
- If a high-load day lands on low recovery (< 34), call it out and suggest moving deep work or protecting energy.
- If strain has been high (>= 14) several days running, tell them to take a recovery day.
No fluff, no preamble, no medical claims, no emojis, no markdown. Second person, like a coach who respects your time.`;

interface CoachDay {
  date: string;
  recovery: number | null;
  strain: number | null;
  load: number;
}
interface CoachBody {
  days?: CoachDay[];
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

  let body: CoachBody;
  try {
    body = (await req.json()) as CoachBody;
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }
  const days = Array.isArray(body.days) ? body.days.slice(-21) : [];
  if (days.length === 0) {
    return NextResponse.json({ error: 'days is required' }, { status: 400 });
  }

  const summary = days
    .map((d) => `${d.date}: recovery ${d.recovery ?? '—'}%, strain ${d.strain ?? '—'}, load ${d.load}`)
    .join('\n');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: `My recent days (oldest first, last = today):\n${summary}` }] }],
        // 2.5-flash spends output tokens "thinking" before the text, so give
        // headroom (matches /api/plan-day) or the narrative gets truncated.
        generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'network error';
    return NextResponse.json({ error: 'coach unreachable', detail }, { status: 502 });
  }

  const data = (await res.json().catch(() => null)) as GeminiResponse | null;
  if (!res.ok) {
    return NextResponse.json(
      { error: 'coach failed', detail: data?.error?.message || res.statusText },
      { status: 502 },
    );
  }

  const narrative = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!narrative) {
    return NextResponse.json({ error: 'coach returned no content' }, { status: 502 });
  }
  return NextResponse.json({ narrative });
}
