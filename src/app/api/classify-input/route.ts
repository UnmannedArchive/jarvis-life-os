import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import type { ClassifyResponse, RouteDecision } from '@/lib/inputRouter';

export const runtime = 'nodejs';

// Gemini powers the Smart Inbox classifier. 2.5-flash works on managed/edu
// accounts where 2.0-flash's free tier is disabled. Override via CLASSIFIER_MODEL.
const MODEL = process.env.CLASSIFIER_MODEL || 'gemini-2.5-flash';

// Gemini structured-output schema. Anthropic's tool used a discriminated
// `oneOf`; Gemini structured output is happiest with a single flat object that
// always carries `type` plus the union of every destination's fields (all
// optional). dispatchRouteDecision() only reads the fields relevant to `type`,
// so the extra nulls are harmless.
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    decision: {
      type: 'OBJECT',
      properties: {
        type: {
          type: 'STRING',
          enum: ['quest', 'idea', 'journal', 'intention', 'checkin_flag', 'activity'],
        },
        // quest
        questType: { type: 'STRING', enum: ['daily', 'side', 'epic'] },
        pillar: { type: 'STRING', enum: ['mind', 'body', 'work', 'wealth', 'spirit', 'social'] },
        difficulty: { type: 'STRING', enum: ['EASY', 'MED', 'HARD', 'LEGENDARY'] },
        title: { type: 'STRING', description: 'Imperative, ≤60 chars (quest/activity).' },
        description: { type: 'STRING' },
        dueDate: { type: 'STRING', description: 'YYYY-MM-DD. One-off side/epic quests with a clear deadline.' },
        // idea
        raw: { type: 'STRING', description: 'Verbatim user text (idea).' },
        // journal / intention
        text: { type: 'STRING', description: 'Full text (journal) or focus statement (intention).' },
        // shared 1-5 ratings
        mood: { type: 'INTEGER' },
        energy: { type: 'INTEGER' },
        sleep: { type: 'INTEGER' },
        // checkin_flag
        drank: { type: 'BOOLEAN' },
        smoked: { type: 'BOOLEAN' },
        note: { type: 'STRING' },
        // activity
        xp: { type: 'INTEGER' },
      },
      required: ['type'],
      propertyOrdering: [
        'type', 'questType', 'pillar', 'difficulty', 'title', 'description', 'dueDate',
        'raw', 'text', 'mood', 'energy', 'sleep', 'drank', 'smoked', 'note', 'xp',
      ],
    },
    confidence: { type: 'NUMBER' },
    rationale: { type: 'STRING' },
  },
  required: ['decision', 'confidence', 'rationale'],
};

const SYSTEM_PROMPT = `You are the routing brain for a personal Life OS app. The user types a single short message into a quick-capture inbox at the top of their dashboard. Your job: classify it into exactly one destination and emit the structured fields needed to create it. Return ONLY a JSON object that matches the provided schema — never reply with prose.

# Destinations (pick ONE)

1. **quest** — A concrete action the user intends to do. Pick this when the input is a task, habit, or to-do.
   - questType:
     - "daily" — recurring habit or routine (e.g. "meditate 10 min", "drink 3L water")
     - "side"  — one-off task with no fixed completion ritual (e.g. "email landlord", "finish chapter 3")
     - "epic"  — multi-session project or goal (e.g. "ship v1 of the app", "train for half marathon")
   - pillar: mind | body | work | wealth | spirit | social
     - mind: learning, reading, study, focus practice
     - body: exercise, sleep, nutrition, recovery
     - work: career, job tasks, projects, building, shipping
     - wealth: money, investing, budgeting, financial admin
     - spirit: meditation, journaling, gratitude, reflection
     - social: relationships, calls, dates, friends, family
   - difficulty: EASY (≤15 min, low effort) | MED (~30-60 min, normal effort) | HARD (deep work, multi-hour) | LEGENDARY (rare, exceptional commitment)
   - title: short imperative (≤60 chars). Strip filler. "Go run 5k tomorrow morning" → "Run 5k".
   - dueDate: only for "side"/"epic" with a clear deadline; YYYY-MM-DD.

2. **idea** — A "what if", invention, brainstorm, or product idea. Pick this for anything that's a thought to capture, not an action to do.
   - raw: the user's full text, verbatim. A separate organizer extracts category/tags.

3. **journal** — Reflective or emotional text about the user's day or state. Pick when the input is a feeling, vent, or self-observation rather than an action.
   - text: full input verbatim
   - mood: 1-5 if confidently inferable, omit otherwise

4. **intention** — User declaring today's focus. Triggers: "today is about X", "today I want to focus on Y", "main thing today: Z". Single line.
   - text: clean focus statement, e.g. user says "okay today i really wanna focus on shipping the auth flow" → "ship the auth flow"

5. **checkin_flag** — Past-tense report about the user's state last night or this morning. Triggers: "drank", "smoked", "slept terribly", "feeling sharp today".
   - drank: true if alcohol mentioned
   - smoked: true if cannabis/THC mentioned
   - sleep/energy/mood: 1-5 if inferable from words like "great"=5, "ok"=3, "rough"=2, "terrible"=1
   - note: clean one-line summary
   - Note: don't pick this for *intentions* like "drink less" (that's a quest).

6. **activity** — Past-tense report of something the user just finished that isn't a pre-existing quest. Triggers: "just finished a run", "wrapped up a 2hr coding sprint", "had dinner with mom".
   - title: imperative-past, e.g. "Finished a 45min run"
   - pillar: same enum as quest
   - xp: optional, 10-100 based on perceived effort

# Decision rules
- **Future tense + action** → quest. **Past tense + action done** → activity.
- **Feelings without an action** → journal.
- **"What if…" / "imagine if…" / abstract concepts** → idea.
- **"Today is about…" / "main focus today"** → intention.
- **"Last night I…" + substance/sleep** → checkin_flag.
- If you're under 50% sure → emit type: "idea" with the raw text. Idea is the safest catch-all.

# Confidence
- Always set "confidence" (0-1): how sure you are about the destination.
- Always set "rationale": one short sentence on why this destination was chosen — shown to the user.

# Examples

Input: "5k run tomorrow morning"
→ quest, daily, body, EASY, title="Run 5k", dueDate=tomorrow's date

Input: "what if habit tracking worked through iMessage"
→ idea, raw="what if habit tracking worked through iMessage"

Input: "feeling burned out, can't focus today"
→ journal, text="feeling burned out, can't focus today", mood=2

Input: "today is about shipping the auth flow"
→ intention, text="ship the auth flow"

Input: "drank too much last night"
→ checkin_flag, drank=true, note="Drank too much last night"

Input: "just finished a 45min run"
→ activity, title="Finished a 45min run", pillar=body, xp=40

Input: "finish the supabase migration this week"
→ quest, side, work, MED, title="Finish Supabase migration", dueDate=this Sunday

Input: "build a SaaS for tax-loss harvesting"
→ idea, raw="build a SaaS for tax-loss harvesting"

Input: "10 pushups every morning"
→ quest, daily, body, EASY, title="10 pushups every morning"

Input: "i think i need to reach out to mom this weekend"
→ quest, side, social, EASY, title="Reach out to mom", dueDate=this Saturday

Always return the JSON object. Pick the single best destination. When in doubt: idea.`;

interface ClassifyRequestBody {
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

  let body: ClassifyRequestBody;
  try {
    body = (await req.json()) as ClassifyRequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: 'text too long (max 2000 chars)' }, { status: 400 });
  }

  // Local day, not UTC — evenings in any western timezone would otherwise
  // tell the model the wrong "today" and shift every suggested due date.
  const today = format(new Date(), 'yyyy-MM-dd');
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
            parts: [{ text: `Today is ${today}.\n\nUser input:\n"""${text}"""` }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          // 2.5-flash spends tokens "thinking" before the JSON, so give headroom.
          maxOutputTokens: 2048,
          temperature: 0.2,
        },
      }),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'network error';
    return NextResponse.json({ error: 'classifier unreachable', detail }, { status: 502 });
  }

  const data = (await res.json().catch(() => null)) as GeminiResponse | null;

  if (!res.ok) {
    return NextResponse.json(
      { error: 'classifier failed', detail: data?.error?.message || res.statusText, status: res.status },
      { status: 502 },
    );
  }

  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof rawText !== 'string') {
    return NextResponse.json({ error: 'classifier returned no content' }, { status: 502 });
  }

  let parsed: ClassifyResponse;
  try {
    parsed = JSON.parse(rawText) as ClassifyResponse;
  } catch {
    return NextResponse.json({ error: 'classifier returned malformed JSON' }, { status: 502 });
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.decision || typeof parsed.decision !== 'object') {
    return NextResponse.json({ error: 'malformed classifier output' }, { status: 502 });
  }

  // Confidence floor → degrade to idea so the item is never lost.
  if (typeof parsed.confidence === 'number' && parsed.confidence < 0.5) {
    const fallback: ClassifyResponse = {
      decision: { type: 'idea', raw: text } as RouteDecision,
      confidence: parsed.confidence,
      rationale: parsed.rationale || 'Low confidence — saved as idea so nothing is lost.',
    };
    return NextResponse.json(fallback);
  }

  return NextResponse.json(parsed);
}
