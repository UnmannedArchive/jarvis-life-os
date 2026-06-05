import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// 2.5-flash works on the USC edu key where 2.0 is throttled to 0. Override via PLANNER_MODEL.
const MODEL = process.env.PLANNER_MODEL || 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are the productivity-analysis brain for a personal "Life OS" app. You receive a short text rollup of how someone spent time on their Mac today: per-app durations each tagged focus / neutral / distraction, plus a focus score and a peak focus hour.
Write ONE short, specific, encouraging insight (max 240 characters) about their day — name their peak focus window and, if relevant, their biggest distraction. Do NOT invent data that is not in the rollup.
For any names under "Unknown apps", suggest the single best category for each: focus, neutral, or distraction.
Return ONLY the structured JSON described by the response schema.`;

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    summary: { type: 'STRING' },
    suggestions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          app: { type: 'STRING' },
          category: { type: 'STRING', enum: ['focus', 'neutral', 'distraction'] },
        },
        required: ['app', 'category'],
      },
    },
  },
  required: ['summary'],
};

interface Body { rollup?: string; unknownApps?: string[]; }
interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const rollup = typeof body.rollup === 'string' ? body.rollup.trim() : '';
  if (!rollup) return NextResponse.json({ error: 'rollup is required' }, { status: 400 });
  const unknown = Array.isArray(body.unknownApps) ? body.unknownApps.slice(0, 20) : [];

  const userText = `Today's rollup:\n"""${rollup}"""\nUnknown apps: ${unknown.join(', ') || 'none'}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          maxOutputTokens: 1024,
          temperature: 0.4,
        },
      }),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'network error';
    return NextResponse.json({ error: 'summarizer unreachable', detail }, { status: 502 });
  }

  const data = (await res.json().catch(() => null)) as GeminiResponse | null;
  if (!res.ok) {
    return NextResponse.json(
      { error: 'summarizer failed', detail: data?.error?.message || res.statusText },
      { status: 502 },
    );
  }

  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof raw !== 'string') {
    return NextResponse.json({ error: 'summarizer returned no content' }, { status: 502 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'summarizer returned malformed JSON' }, { status: 502 });
  }

  const obj = parsed as { summary?: unknown; suggestions?: unknown };
  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : '';
  if (!summary) return NextResponse.json({ error: 'summarizer produced no summary' }, { status: 502 });

  const suggestions = Array.isArray(obj.suggestions)
    ? obj.suggestions
        .filter((x): x is { app: string; category: string } =>
          !!x && typeof (x as { app?: unknown }).app === 'string'
          && typeof (x as { category?: unknown }).category === 'string')
        .map((x) => ({ app: x.app, category: x.category }))
    : [];

  return NextResponse.json({ summary, suggestions });
}
