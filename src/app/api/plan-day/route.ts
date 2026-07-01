import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Free tier, supports structured JSON output. Override via PLANNER_MODEL.
// Note: gemini-2.0-flash free tier is disabled on some managed/edu accounts
// (limit 0); 2.5-flash works where 2.0 doesn't.
const MODEL = process.env.PLANNER_MODEL || 'gemini-2.5-flash';

const SYSTEM_PROMPT = `You are the day-planning brain for a personal "Life OS" app. The user dumps everything they want to get done today into a single text box, in plain language — comma-separated, line-separated, or run-on.

Your job:
1. Parse out the individual, concrete tasks. Split compound entries ("gym, finish the deck, call client") into separate tasks. Drop filler words. Keep the user's wording where it's already clear.
2. Order those tasks into the single most EFFICIENT sequence to actually do them today.

What "efficient" means, in priority order:
- Dependencies first: if task X must happen before task Y, X comes first.
- Group similar/nearby work: batch tasks that share a location, tool, or headspace (e.g. all errands together, all deep-work together) to avoid context-switching.
- Front-load quick wins: a couple of fast, easy tasks early build momentum.
- Respect energy: put demanding deep-focus work in a strong block (typically after an easy warm-up win but before fatigue), and leave low-energy/administrative tasks for later.

Rules:
- Every input task must appear exactly once in the output. Do not invent tasks. Do not drop tasks.
- Each task gets a short, specific reason for ITS placement (not generic). E.g. "Batched with your other errands", "Quick win to build momentum", "Do before the deck — you need the data first", "Deep-focus block while fresh". Keep each reason under 90 characters.
- Return ONLY the structured JSON array described by the response schema. The array must be ordered first = do first.`;

// Gemini structured-output schema → forces [{ task, reason }, ...].
const RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      task: { type: 'STRING' },
      reason: { type: 'STRING' },
    },
    required: ['task', 'reason'],
  },
};

interface PlanRequestBody {
  text?: string;
}

interface GeminiPart {
  text?: string;
}
interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
  error?: { message?: string };
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY not configured' },
      { status: 503 },
    );
  }

  let body: PlanRequestBody;
  try {
    body = (await req.json()) as PlanRequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: 'text too long (max 4000 chars)' }, { status: 400 });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: 'user',
            parts: [{ text: `Here is everything I want to get done today:\n"""${text}"""` }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          // 2.5-flash spends tokens "thinking" before the JSON, so give headroom.
          maxOutputTokens: 2048,
          temperature: 0.3,
        },
      }),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'network error';
    return NextResponse.json({ error: 'planner unreachable', detail }, { status: 502 });
  }

  const data = (await res.json().catch(() => null)) as GeminiResponse | null;

  if (!res.ok) {
    return NextResponse.json(
      { error: 'planner failed', detail: data?.error?.message || res.statusText, status: res.status },
      { status: 502 },
    );
  }

  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof raw !== 'string') {
    return NextResponse.json({ error: 'planner returned no content' }, { status: 502 });
  }

  let arr: unknown;
  try {
    arr = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'planner returned malformed JSON' }, { status: 502 });
  }
  if (!Array.isArray(arr)) {
    return NextResponse.json({ error: 'planner did not return an array' }, { status: 502 });
  }

  // Defensive: keep only well-shaped { task, reason } entries.
  const ordered = arr
    .filter(
      (o): o is { task: string; reason: string } =>
        !!o && typeof o === 'object' && typeof (o as { task: unknown }).task === 'string',
    )
    .map((o) => ({
      task: o.task.trim(),
      reason: typeof o.reason === 'string' ? o.reason.trim() : '',
    }))
    .filter((o) => o.task.length > 0);

  if (ordered.length === 0) {
    return NextResponse.json({ error: 'planner produced no tasks' }, { status: 502 });
  }

  return NextResponse.json({ ordered });
}
