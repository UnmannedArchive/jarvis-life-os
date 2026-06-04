# Workflow / Productivity Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Workflow tab to Life OS that passively tracks which Mac apps/windows you use and shows your most-productive hours, time breakdown, and a once-a-day AI insight.

**Architecture:** A standalone Python "collector" runs in the background and appends app + window-title sessions to `~/.life-os-monitor/events.jsonl`. Life OS's own Next.js (Node) API routes read that file, aggregate it, and (sparingly) call Gemini 2.5-flash to summarize. All categorization is client-side using a default map plus user overrides. Nothing leaves the Mac except a short text rollup to Gemini a couple times a day. The feature only works when Life OS runs locally (`npm run dev`).

**Tech Stack:** Next.js 16 (App Router, Route Handlers, `runtime = 'nodejs'`), React 19, zustand (`persist`), recharts, jest + ts-jest (Node env, pure-logic tests only), Python 3 + pyobjc (collector), Python `unittest` (collector tests).

**Spec:** `docs/superpowers/specs/2026-06-04-workflow-productivity-design.md`

---

## File Structure

**New — Life OS (TypeScript):**
- `src/lib/workflow/types.ts` — shared types (sessions, raw aggregate, categorized view).
- `src/lib/workflow/categories.ts` — default app→category map + `classifyApp`.
- `src/lib/workflow/aggregate.ts` — pure `aggregateSessions` (sessions → per-app/per-hour seconds).
- `src/lib/workflow/view.ts` — pure `buildView`, `buildRollupText`, `findUnknownApps`.
- `src/lib/workflow/eventsFile.ts` — read/parse `events.jsonl` (Node fs; dir override for tests).
- `src/lib/workflow/useWorkflowData.ts` — client hook: fetch usage, apply overrides, refresh, summarize.
- `src/app/api/workflow/usage/route.ts` — `GET` raw aggregate for a date.
- `src/app/api/workflow/summarize/route.ts` — `POST` rollup → Gemini insight + category suggestions.
- `src/components/workflow/WorkflowDashboard.tsx` — the dashboard UI.
- `src/app/workflow/page.tsx` — route that renders the dashboard.
- `src/lib/workflow/__tests__/categories.test.ts`, `aggregate.test.ts`, `view.test.ts`, `eventsFile.test.ts`.

**Modified — Life OS:**
- `src/stores/useStore.ts` — add `workflowCategoryOverrides`, `workflowSummary`, `workflowEnabled` + setters + persist.
- `src/components/layout/Sidebar.tsx`, `src/components/layout/MobileNav.tsx` — add Workflow nav item (gated by `workflowEnabled`).
- `src/app/settings/page.tsx` — master on/off toggle for the Workflow feature.

**New — collector (Python, repo-tracked code; data written outside repo):**
- `monitor/collector.py` — capture loop + pure `SessionAccumulator`.
- `monitor/test_collector.py` — `unittest` for the accumulator.
- `monitor/requirements.txt`, `monitor/README.md`.

---

### Task 1: Workflow types + category map

**Files:**
- Create: `src/lib/workflow/types.ts`
- Create: `src/lib/workflow/categories.ts`
- Test: `src/lib/workflow/__tests__/categories.test.ts`

- [ ] **Step 1: Create the types file**

`src/lib/workflow/types.ts`:

```typescript
export type WorkflowCategory = 'focus' | 'neutral' | 'distraction';

/** One coalesced session as written by the collector (a line in events.jsonl). */
export interface UsageSession {
  app: string;
  title: string;
  start: string; // ISO 8601 with offset
  end: string;   // ISO 8601 with offset
  seconds: number;
}

export interface RawAppSeconds { app: string; seconds: number; }
export interface RawHourBucket { hour: number; byApp: RawAppSeconds[]; } // hour 0..23 local
export interface RawAggregate {
  date: string; // YYYY-MM-DD
  totalSeconds: number;
  byApp: RawAppSeconds[];   // sorted desc by seconds
  byHour: RawHourBucket[];  // ascending hour, only hours with data
}

export interface CategoryTotals { focus: number; neutral: number; distraction: number; }
export interface HourCategorySeconds { hour: number; focus: number; neutral: number; distraction: number; }
export interface AppRow { app: string; seconds: number; category: WorkflowCategory; }
export interface WorkflowView {
  date: string;
  totals: CategoryTotals; // seconds
  focusScore: number;     // 0..100 integer
  byHour: HourCategorySeconds[];
  byApp: AppRow[];
}
```

- [ ] **Step 2: Write the failing test for `classifyApp`**

`src/lib/workflow/__tests__/categories.test.ts`:

```typescript
import { classifyApp, DEFAULT_CATEGORIES } from '../categories';

describe('classifyApp', () => {
  it('classifies known focus apps regardless of case', () => {
    expect(classifyApp('Cursor')).toBe('focus');
    expect(classifyApp('TERMINAL')).toBe('focus');
  });

  it('classifies known distraction apps', () => {
    expect(classifyApp('YouTube')).toBe('distraction');
    expect(classifyApp('TikTok')).toBe('distraction');
  });

  it('defaults unknown apps to neutral', () => {
    expect(classifyApp('SomeRandomApp')).toBe('neutral');
  });

  it('lets a user override win over the default', () => {
    expect(classifyApp('YouTube', { youtube: 'focus' })).toBe('focus');
  });

  it('has a non-empty default map', () => {
    expect(Object.keys(DEFAULT_CATEGORIES).length).toBeGreaterThan(5);
  });
});
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `npx jest src/lib/workflow/__tests__/categories.test.ts`
Expected: FAIL — cannot find module `../categories`.

- [ ] **Step 4: Implement `categories.ts`**

`src/lib/workflow/categories.ts`:

```typescript
import type { WorkflowCategory } from './types';

/** Default app-name (lowercased) → category. Extend freely. */
export const DEFAULT_CATEGORIES: Record<string, WorkflowCategory> = {
  cursor: 'focus',
  code: 'focus', // VS Code reports its app name as "Code"
  'visual studio code': 'focus',
  xcode: 'focus',
  terminal: 'focus',
  iterm2: 'focus',
  warp: 'focus',
  notion: 'focus',
  obsidian: 'focus',
  figma: 'focus',
  slack: 'neutral',
  mail: 'neutral',
  messages: 'neutral',
  calendar: 'neutral',
  finder: 'neutral',
  zoom: 'neutral',
  'microsoft teams': 'neutral',
  youtube: 'distraction',
  tiktok: 'distraction',
  instagram: 'distraction',
  netflix: 'distraction',
  reddit: 'distraction',
  discord: 'distraction',
};

/** Override (lowercased key) wins, then default map, else 'neutral'. */
export function classifyApp(
  app: string,
  overrides: Record<string, WorkflowCategory> = {},
): WorkflowCategory {
  const key = app.trim().toLowerCase();
  return overrides[key] ?? DEFAULT_CATEGORIES[key] ?? 'neutral';
}
```

- [ ] **Step 5: Run the test, verify it passes**

Run: `npx jest src/lib/workflow/__tests__/categories.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/workflow/types.ts src/lib/workflow/categories.ts src/lib/workflow/__tests__/categories.test.ts
git commit -m "feat(workflow): add usage types and category map"
```

---

### Task 2: Pure session aggregation

**Files:**
- Create: `src/lib/workflow/aggregate.ts`
- Test: `src/lib/workflow/__tests__/aggregate.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/workflow/__tests__/aggregate.test.ts`:

```typescript
import { aggregateSessions } from '../aggregate';
import type { UsageSession } from '../types';

// Helper: build an ISO local timestamp for 2026-06-04 at h:m:s.
const at = (h: number, m: number, s = 0) =>
  new Date(2026, 5, 4, h, m, s).toISOString();

describe('aggregateSessions', () => {
  const sessions: UsageSession[] = [
    { app: 'Cursor', title: 'a.ts', start: at(9, 0), end: at(9, 30), seconds: 1800 },
    { app: 'Cursor', title: 'b.ts', start: at(9, 30), end: at(9, 45), seconds: 900 },
    { app: 'YouTube', title: 'vid', start: at(14, 0), end: at(14, 20), seconds: 1200 },
  ];

  it('sums seconds per app', () => {
    const agg = aggregateSessions(sessions, '2026-06-04');
    const cursor = agg.byApp.find((a) => a.app === 'Cursor');
    expect(cursor?.seconds).toBe(2700);
    expect(agg.totalSeconds).toBe(3900);
  });

  it('sorts apps by seconds descending', () => {
    const agg = aggregateSessions(sessions, '2026-06-04');
    expect(agg.byApp[0].app).toBe('Cursor');
  });

  it('buckets time into the correct local hours', () => {
    const agg = aggregateSessions(sessions, '2026-06-04');
    const nine = agg.byHour.find((h) => h.hour === 9);
    const two = agg.byHour.find((h) => h.hour === 14);
    expect(nine?.byApp.find((a) => a.app === 'Cursor')?.seconds).toBe(2700);
    expect(two?.byApp.find((a) => a.app === 'YouTube')?.seconds).toBe(1200);
  });

  it('splits a session that crosses an hour boundary', () => {
    const crossing: UsageSession[] = [
      { app: 'Cursor', title: 'x', start: at(9, 50), end: at(10, 10), seconds: 1200 },
    ];
    const agg = aggregateSessions(crossing, '2026-06-04');
    const nine = agg.byHour.find((h) => h.hour === 9)?.byApp[0].seconds ?? 0;
    const ten = agg.byHour.find((h) => h.hour === 10)?.byApp[0].seconds ?? 0;
    expect(nine).toBe(600);
    expect(ten).toBe(600);
  });

  it('ignores sessions on other dates', () => {
    const other: UsageSession[] = [
      { app: 'Cursor', title: 'x', start: new Date(2026, 5, 3, 9, 0).toISOString(), end: new Date(2026, 5, 3, 9, 10).toISOString(), seconds: 600 },
    ];
    expect(aggregateSessions(other, '2026-06-04').byApp).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx jest src/lib/workflow/__tests__/aggregate.test.ts`
Expected: FAIL — cannot find module `../aggregate`.

- [ ] **Step 3: Implement `aggregate.ts`**

`src/lib/workflow/aggregate.ts`:

```typescript
import type { UsageSession, RawAggregate, RawAppSeconds, RawHourBucket } from './types';

function localDateStr(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Aggregate sessions whose START falls on `date` into raw per-app and per-hour
 * seconds. Sessions crossing an hour boundary are split across hours.
 */
export function aggregateSessions(sessions: UsageSession[], date: string): RawAggregate {
  const appTotals = new Map<string, number>();
  const hourApp = new Map<number, Map<string, number>>();

  for (const s of sessions) {
    if (localDateStr(s.start) !== date) continue;
    const startMs = new Date(s.start).getTime();
    const endMs = new Date(s.end).getTime();
    if (!(endMs > startMs)) continue;

    let cursor = startMs;
    while (cursor < endMs) {
      const d = new Date(cursor);
      const hour = d.getHours();
      const hourEnd = new Date(d);
      hourEnd.setMinutes(60, 0, 0); // start of next hour
      const sliceEnd = Math.min(endMs, hourEnd.getTime());
      const secs = (sliceEnd - cursor) / 1000;

      appTotals.set(s.app, (appTotals.get(s.app) ?? 0) + secs);
      if (!hourApp.has(hour)) hourApp.set(hour, new Map());
      const m = hourApp.get(hour)!;
      m.set(s.app, (m.get(s.app) ?? 0) + secs);

      cursor = sliceEnd;
    }
  }

  const byApp: RawAppSeconds[] = [...appTotals.entries()]
    .map(([app, seconds]) => ({ app, seconds: Math.round(seconds) }))
    .sort((a, b) => b.seconds - a.seconds);

  const byHour: RawHourBucket[] = [...hourApp.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([hour, m]) => ({
      hour,
      byApp: [...m.entries()]
        .map(([app, seconds]) => ({ app, seconds: Math.round(seconds) }))
        .sort((a, b) => b.seconds - a.seconds),
    }));

  const totalSeconds = byApp.reduce((acc, a) => acc + a.seconds, 0);
  return { date, totalSeconds, byApp, byHour };
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx jest src/lib/workflow/__tests__/aggregate.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/workflow/aggregate.ts src/lib/workflow/__tests__/aggregate.test.ts
git commit -m "feat(workflow): aggregate sessions into per-app/per-hour seconds"
```

---

### Task 3: View builder, rollup text, unknown-app detection

**Files:**
- Create: `src/lib/workflow/view.ts`
- Test: `src/lib/workflow/__tests__/view.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/workflow/__tests__/view.test.ts`:

```typescript
import { buildView, buildRollupText, findUnknownApps } from '../view';
import type { RawAggregate } from '../types';

const raw: RawAggregate = {
  date: '2026-06-04',
  totalSeconds: 3900,
  byApp: [
    { app: 'Cursor', seconds: 2700 },   // focus
    { app: 'YouTube', seconds: 1200 },  // distraction
  ],
  byHour: [
    { hour: 9, byApp: [{ app: 'Cursor', seconds: 2700 }] },
    { hour: 14, byApp: [{ app: 'YouTube', seconds: 1200 }] },
  ],
};

describe('buildView', () => {
  it('tallies category totals and a focus score', () => {
    const v = buildView(raw);
    expect(v.totals.focus).toBe(2700);
    expect(v.totals.distraction).toBe(1200);
    expect(v.focusScore).toBe(69); // 2700 / 3900 = 0.692 -> 69
  });

  it('tags each app row with its category', () => {
    const v = buildView(raw);
    expect(v.byApp.find((a) => a.app === 'Cursor')?.category).toBe('focus');
  });

  it('applies user overrides', () => {
    const v = buildView(raw, { youtube: 'focus' });
    expect(v.totals.focus).toBe(3900);
    expect(v.focusScore).toBe(100);
  });

  it('returns focusScore 0 when there is no activity', () => {
    const empty: RawAggregate = { date: '2026-06-04', totalSeconds: 0, byApp: [], byHour: [] };
    expect(buildView(empty).focusScore).toBe(0);
  });
});

describe('buildRollupText', () => {
  it('produces a compact text line naming apps and durations', () => {
    const text = buildRollupText(buildView(raw));
    expect(text).toContain('Cursor');
    expect(text).toContain('focus score 69%');
  });
});

describe('findUnknownApps', () => {
  it('returns apps not in defaults nor overrides', () => {
    const r: RawAggregate = { date: '2026-06-04', totalSeconds: 60, byApp: [{ app: 'Weird App', seconds: 60 }], byHour: [] };
    expect(findUnknownApps(r)).toEqual(['Weird App']);
  });

  it('excludes apps covered by an override', () => {
    const r: RawAggregate = { date: '2026-06-04', totalSeconds: 60, byApp: [{ app: 'Weird App', seconds: 60 }], byHour: [] };
    expect(findUnknownApps(r, { 'weird app': 'focus' })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx jest src/lib/workflow/__tests__/view.test.ts`
Expected: FAIL — cannot find module `../view`.

- [ ] **Step 3: Implement `view.ts`**

`src/lib/workflow/view.ts`:

```typescript
import type {
  RawAggregate, WorkflowView, WorkflowCategory,
  CategoryTotals, HourCategorySeconds, AppRow,
} from './types';
import { classifyApp, DEFAULT_CATEGORIES } from './categories';

export function buildView(
  raw: RawAggregate,
  overrides: Record<string, WorkflowCategory> = {},
): WorkflowView {
  const totals: CategoryTotals = { focus: 0, neutral: 0, distraction: 0 };
  const byApp: AppRow[] = raw.byApp.map((a) => {
    const category = classifyApp(a.app, overrides);
    totals[category] += a.seconds;
    return { app: a.app, seconds: a.seconds, category };
  });

  const byHour: HourCategorySeconds[] = raw.byHour.map((h) => {
    const row: HourCategorySeconds = { hour: h.hour, focus: 0, neutral: 0, distraction: 0 };
    for (const a of h.byApp) row[classifyApp(a.app, overrides)] += a.seconds;
    return row;
  });

  const active = totals.focus + totals.neutral + totals.distraction;
  const focusScore = active > 0 ? Math.round((totals.focus / active) * 100) : 0;

  return { date: raw.date, totals, focusScore, byHour, byApp };
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h${m}m` : `${m}m`;
}

/** Compact, text-only rollup we send to Gemini (never images). */
export function buildRollupText(view: WorkflowView): string {
  const apps = view.byApp.slice(0, 12)
    .map((a) => `${a.app} (${a.category}) ${fmtDuration(a.seconds)}`)
    .join('; ');
  const peak = [...view.byHour].sort((a, b) => b.focus - a.focus)[0];
  const peakStr = peak && peak.focus > 0 ? `peak focus hour ~${peak.hour}:00` : 'no clear focus block';
  return `Date ${view.date}. Focus ${fmtDuration(view.totals.focus)}, neutral ${fmtDuration(view.totals.neutral)}, `
    + `distraction ${fmtDuration(view.totals.distraction)}, focus score ${view.focusScore}%. ${peakStr}. Apps: ${apps}.`;
}

/** Apps with no known default and no user override — candidates for AI suggestion. */
export function findUnknownApps(
  raw: RawAggregate,
  overrides: Record<string, WorkflowCategory> = {},
): string[] {
  return raw.byApp
    .filter((a) => {
      const key = a.app.trim().toLowerCase();
      return !overrides[key] && !DEFAULT_CATEGORIES[key];
    })
    .map((a) => a.app);
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx jest src/lib/workflow/__tests__/view.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/workflow/view.ts src/lib/workflow/__tests__/view.test.ts
git commit -m "feat(workflow): categorized view, rollup text, unknown-app detection"
```

---

### Task 4: Events-file parser + reader

**Files:**
- Create: `src/lib/workflow/eventsFile.ts`
- Test: `src/lib/workflow/__tests__/eventsFile.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lib/workflow/__tests__/eventsFile.test.ts`:

```typescript
import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { parseSessions, readSessions } from '../eventsFile';

describe('parseSessions', () => {
  it('parses well-formed lines and skips malformed ones', () => {
    const contents = [
      '{"app":"Cursor","title":"a","start":"2026-06-04T09:00:00-07:00","end":"2026-06-04T09:10:00-07:00","seconds":600}',
      'not json',
      '{"app":"X"}', // missing fields
      '',
    ].join('\n');
    const sessions = parseSessions(contents);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].app).toBe('Cursor');
  });
});

describe('readSessions', () => {
  it('reports monitorRunning=false when the file is absent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mon-'));
    const prev = process.env.LIFE_OS_MONITOR_DIR;
    process.env.LIFE_OS_MONITOR_DIR = dir;
    try {
      const res = readSessions();
      expect(res.monitorRunning).toBe(false);
      expect(res.sessions).toEqual([]);
    } finally {
      process.env.LIFE_OS_MONITOR_DIR = prev;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads sessions when the file exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mon-'));
    writeFileSync(join(dir, 'events.jsonl'),
      '{"app":"Cursor","title":"a","start":"2026-06-04T09:00:00-07:00","end":"2026-06-04T09:10:00-07:00","seconds":600}\n');
    const prev = process.env.LIFE_OS_MONITOR_DIR;
    process.env.LIFE_OS_MONITOR_DIR = dir;
    try {
      const res = readSessions();
      expect(res.monitorRunning).toBe(true);
      expect(res.sessions).toHaveLength(1);
    } finally {
      process.env.LIFE_OS_MONITOR_DIR = prev;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx jest src/lib/workflow/__tests__/eventsFile.test.ts`
Expected: FAIL — cannot find module `../eventsFile`.

- [ ] **Step 3: Implement `eventsFile.ts`**

`src/lib/workflow/eventsFile.ts`:

```typescript
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { UsageSession } from './types';

export function monitorDir(): string {
  return process.env.LIFE_OS_MONITOR_DIR || join(homedir(), '.life-os-monitor');
}

export function eventsFilePath(): string {
  return join(monitorDir(), 'events.jsonl');
}

export interface ReadResult { monitorRunning: boolean; sessions: UsageSession[]; }

/** Parse JSONL contents into sessions, tolerating malformed lines. */
export function parseSessions(contents: string): UsageSession[] {
  const out: UsageSession[] = [];
  for (const line of contents.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t) as Partial<UsageSession>;
      if (o && typeof o.app === 'string' && typeof o.title === 'string'
        && typeof o.start === 'string' && typeof o.end === 'string'
        && typeof o.seconds === 'number') {
        out.push({ app: o.app, title: o.title, start: o.start, end: o.end, seconds: o.seconds });
      }
    } catch {
      // skip malformed line
    }
  }
  return out;
}

export function readSessions(): ReadResult {
  const path = eventsFilePath();
  if (!existsSync(path)) return { monitorRunning: false, sessions: [] };
  const contents = readFileSync(path, 'utf8');
  return { monitorRunning: true, sessions: parseSessions(contents) };
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx jest src/lib/workflow/__tests__/eventsFile.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full lib suite to confirm no regressions**

Run: `npm test`
Expected: PASS — all existing suites plus the 4 new workflow suites.

- [ ] **Step 6: Commit**

```bash
git add src/lib/workflow/eventsFile.ts src/lib/workflow/__tests__/eventsFile.test.ts
git commit -m "feat(workflow): read and parse the collector's events.jsonl"
```

---

### Task 5: `GET /api/workflow/usage` route

**Files:**
- Create: `src/app/api/workflow/usage/route.ts`

Verification is build + manual curl (this repo has no route-level test harness; the heavy logic is already unit-tested in Tasks 2 & 4).

- [ ] **Step 1: Implement the route**

`src/app/api/workflow/usage/route.ts`:

```typescript
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
```

- [ ] **Step 2: Build to verify it compiles**

Run: `npm run build`
Expected: build succeeds; the route appears in the route list.

- [ ] **Step 3: Manual smoke test**

Run in one terminal: `npm run dev`
Then: `curl 'http://localhost:3000/api/workflow/usage' | head -c 400`
Expected (no collector yet): `{"monitorRunning":false,"aggregate":{"date":"<today>","totalSeconds":0,"byApp":[],"byHour":[]}}`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/workflow/usage/route.ts
git commit -m "feat(workflow): GET /api/workflow/usage returns the daily aggregate"
```

---

### Task 6: `POST /api/workflow/summarize` route

**Files:**
- Create: `src/app/api/workflow/summarize/route.ts`

Mirrors the structured-output Gemini pattern in `src/app/api/plan-day/route.ts`.

- [ ] **Step 1: Implement the route**

`src/app/api/workflow/summarize/route.ts`:

```typescript
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
```

- [ ] **Step 2: Build to verify it compiles**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual smoke test (requires `GEMINI_API_KEY` in `.env.local`)**

```bash
curl -s -X POST http://localhost:3000/api/workflow/summarize \
  -H 'Content-Type: application/json' \
  -d '{"rollup":"Date 2026-06-04. Focus 4h0m, neutral 1h0m, distraction 30m, focus score 80%. peak focus hour ~10:00. Apps: Cursor (focus) 4h0m; Slack (neutral) 1h0m; YouTube (distraction) 30m.","unknownApps":["Linear"]}'
```
Expected: `{"summary":"...","suggestions":[{"app":"Linear","category":"focus"}]}` (exact text varies). If the key is missing, expect `503 GEMINI_API_KEY not configured` — that's the correct degraded behavior.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/workflow/summarize/route.ts
git commit -m "feat(workflow): POST /api/workflow/summarize for sparse Gemini insight"
```

---

### Task 7: Store — overrides, cached summary, master toggle

**Files:**
- Modify: `src/stores/useStore.ts`

- [ ] **Step 1: Add state + action signatures to the `AppState` interface**

Find the interface block that lists actions (near `addActivity` / `setActivityLog`, around line 127–187). Add these members alongside the other settings/actions:

```typescript
  // Workflow / productivity tracking
  workflowEnabled: boolean;
  setWorkflowEnabled: (on: boolean) => void;
  workflowCategoryOverrides: Record<string, 'focus' | 'neutral' | 'distraction'>;
  setWorkflowCategory: (app: string, category: 'focus' | 'neutral' | 'distraction') => void;
  workflowSummary: { date: string; text: string } | null;
  setWorkflowSummary: (date: string, text: string) => void;
```

- [ ] **Step 2: Add the initial state defaults**

Find the initial state object (near `activityLog: [],`, around line 219). Add:

```typescript
  workflowEnabled: true,
  workflowCategoryOverrides: {},
  workflowSummary: null,
```

- [ ] **Step 3: Add the action implementations**

Find `setActivityLog: (log) => set({ activityLog: log }),` (around line 337) and add directly after it:

```typescript
  setWorkflowEnabled: (on) => set({ workflowEnabled: on }),
  setWorkflowCategory: (app, category) => set((s) => ({
    workflowCategoryOverrides: { ...s.workflowCategoryOverrides, [app.trim().toLowerCase()]: category },
  })),
  setWorkflowSummary: (date, text) => set({ workflowSummary: { date, text } }),
```

- [ ] **Step 4: Persist the new state**

In the `partialize` object (around line 773–807), add these three lines alongside the others:

```typescript
    workflowEnabled: state.workflowEnabled,
    workflowCategoryOverrides: state.workflowCategoryOverrides,
    workflowSummary: state.workflowSummary,
```

- [ ] **Step 5: Typecheck + build**

Run: `npx tsc --noEmit 2>&1 | grep -v "\.next/types" | grep "error" || echo "no src errors"`
Expected: `no src errors` (the only `tsc` errors are the known stale `.next/types/validator.ts` ones — ignore those, per the project memory).
Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/stores/useStore.ts
git commit -m "feat(workflow): store overrides, cached summary, and master toggle"
```

---

### Task 8: Dashboard UI, data hook, page, and nav

**Files:**
- Create: `src/lib/workflow/useWorkflowData.ts`
- Create: `src/components/workflow/WorkflowDashboard.tsx`
- Create: `src/app/workflow/page.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/components/layout/MobileNav.tsx`

- [ ] **Step 1: Create the data hook**

`src/lib/workflow/useWorkflowData.ts`:

```typescript
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '@/stores/useStore';
import { buildView, buildRollupText, findUnknownApps } from './view';
import type { RawAggregate, WorkflowView } from './types';

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const EMPTY: RawAggregate = { date: todayLocal(), totalSeconds: 0, byApp: [], byHour: [] };

export function useWorkflowData() {
  const overrides = useStore((s) => s.workflowCategoryOverrides);
  const summary = useStore((s) => s.workflowSummary);
  const setSummary = useStore((s) => s.setWorkflowSummary);
  const setCategory = useStore((s) => s.setWorkflowCategory);

  const [raw, setRaw] = useState<RawAggregate>(EMPTY);
  const [monitorRunning, setMonitorRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workflow/usage');
      const data = await res.json();
      setRaw(data.aggregate ?? EMPTY);
      setMonitorRunning(!!data.monitorRunning);
    } catch {
      setRaw(EMPTY);
      setMonitorRunning(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const view: WorkflowView = useMemo(() => buildView(raw, overrides), [raw, overrides]);

  const summarize = useCallback(async () => {
    setSummarizing(true);
    try {
      const res = await fetch('/api/workflow/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollup: buildRollupText(view),
          unknownApps: findUnknownApps(raw, overrides),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.summary === 'string') setSummary(view.date, data.summary);
        if (Array.isArray(data.suggestions)) {
          for (const s of data.suggestions) {
            if (s && typeof s.app === 'string' && typeof s.category === 'string') {
              setCategory(s.app, s.category);
            }
          }
        }
      }
    } catch {
      // leave existing summary in place on failure
    } finally {
      setSummarizing(false);
    }
  }, [view, raw, overrides, setSummary, setCategory]);

  const todaysSummary = summary && summary.date === view.date ? summary.text : null;

  return { view, monitorRunning, loading, summarizing, refresh, summarize, todaysSummary, setCategory };
}
```

- [ ] **Step 2: Create the dashboard component**

`src/components/workflow/WorkflowDashboard.tsx`:

```typescript
'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useWorkflowData } from '@/lib/workflow/useWorkflowData';
import type { WorkflowCategory } from '@/lib/workflow/types';

const CAT_COLOR: Record<WorkflowCategory, string> = {
  focus: '#4ade80',
  neutral: '#fbbf24',
  distraction: '#f87171',
};

function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const NEXT_CAT: Record<WorkflowCategory, WorkflowCategory> = {
  focus: 'neutral', neutral: 'distraction', distraction: 'focus',
};

export default function WorkflowDashboard() {
  const { view, monitorRunning, loading, summarizing, refresh, summarize, todaysSummary, setCategory } = useWorkflowData();

  if (loading) {
    return <div className="p-6 text-text-tertiary text-sm">Loading your workflow…</div>;
  }

  if (!monitorRunning || view.totals.focus + view.totals.neutral + view.totals.distraction === 0) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] p-6 max-w-xl">
          <h2 className="text-base font-semibold text-text-primary mb-2">Start the monitor</h2>
          <p className="text-sm text-text-tertiary mb-3">
            The Workflow tab shows what you worked on today. Start the local collector once and leave it running:
          </p>
          <pre className="text-xs bg-black/40 rounded-lg p-3 overflow-x-auto text-text-secondary">cd monitor && python collector.py</pre>
          <p className="text-xs text-text-placeholder mt-3">
            First run: grant Screen Recording permission in System Settings → Privacy &amp; Security. Then click Refresh.
          </p>
          <button onClick={refresh} className="mt-4 inline-flex items-center gap-2 text-sm text-accent hover:underline cursor-pointer">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>
    );
  }

  const chartData = view.byHour.map((h) => ({
    hour: `${h.hour}:00`,
    focus: h.focus, neutral: h.neutral, distraction: h.distraction,
  }));

  const kpis: { label: string; seconds?: number; value?: string; color: string }[] = [
    { label: 'Focused', seconds: view.totals.focus, color: CAT_COLOR.focus },
    { label: 'Neutral', seconds: view.totals.neutral, color: CAT_COLOR.neutral },
    { label: 'Distracted', seconds: view.totals.distraction, color: CAT_COLOR.distraction },
    { label: 'Focus score', value: `${view.focusScore}%`, color: '#7aa2f7' },
  ];

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">Workflow</h1>
        <button onClick={refresh} className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary cursor-pointer">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* AI read */}
      <div className="rounded-2xl border border-accent/15 bg-gradient-to-br from-accent-dim to-transparent p-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] uppercase tracking-wider text-accent flex items-center gap-1.5"><Sparkles size={12} /> AI read · today</span>
          <button onClick={summarize} disabled={summarizing}
            className="text-[11px] text-text-tertiary hover:text-text-secondary disabled:opacity-50 cursor-pointer">
            {summarizing ? 'Thinking…' : 'Refresh insight'}
          </button>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">
          {todaysSummary ?? 'Tap “Refresh insight” for a quick read on your day.'}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-[rgba(255,255,255,0.03)] p-3">
            <div className="text-[11px] uppercase tracking-wide text-text-placeholder">{k.label}</div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: k.color }}>
              {k.value ?? fmt(k.seconds ?? 0)}
            </div>
          </div>
        ))}
      </div>

      {/* Most productive hours */}
      <div className="rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] p-4">
        <div className="text-sm font-semibold text-text-secondary mb-3">Most productive hours · today</div>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#8a93a6' }} />
              <YAxis hide />
              <Tooltip
                formatter={(v: number, name: string) => [fmt(v), name]}
                contentStyle={{ background: '#161b26', border: '1px solid #232a38', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="focus" stackId="a" fill={CAT_COLOR.focus} radius={[3, 3, 0, 0]} />
              <Bar dataKey="neutral" stackId="a" fill={CAT_COLOR.neutral} />
              <Bar dataKey="distraction" stackId="a" fill={CAT_COLOR.distraction} radius={[0, 0, 3, 3]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Where time went */}
      <div className="rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] p-4">
        <div className="text-sm font-semibold text-text-secondary mb-3">Where your time went · today</div>
        <div className="flex flex-col gap-2.5">
          {view.byApp.slice(0, 10).map((a) => {
            const max = view.byApp[0]?.seconds || 1;
            return (
              <div key={a.app} className="flex items-center gap-3 text-sm">
                <span className="w-32 truncate text-text-secondary">{a.app}</span>
                <div className="flex-1 bg-[rgba(255,255,255,0.05)] rounded h-3.5">
                  <div className="h-full rounded" style={{ width: `${(a.seconds / max) * 100}%`, background: CAT_COLOR[a.category] }} />
                </div>
                <span className="w-14 text-right text-text-tertiary tabular-nums">{fmt(a.seconds)}</span>
                <button
                  onClick={() => setCategory(a.app, NEXT_CAT[a.category])}
                  title="Tap to re-label (focus → neutral → distraction)"
                  className="w-20 text-[11px] text-text-placeholder hover:text-text-secondary cursor-pointer text-left"
                >
                  {a.category}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-text-placeholder mt-3">Tap a category to re-label that app — it sticks.</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create the page**

`src/app/workflow/page.tsx`:

```typescript
import WorkflowDashboard from '@/components/workflow/WorkflowDashboard';

export default function WorkflowPage() {
  return <WorkflowDashboard />;
}
```

- [ ] **Step 4: Add the Workflow item to the desktop sidebar**

In `src/components/layout/Sidebar.tsx`, add `Activity` to the lucide import on line 5:

```typescript
import { LayoutDashboard, CheckSquare, BarChart3, Target, Settings, ChevronLeft, ChevronRight, Timer, Lightbulb, Activity } from 'lucide-react';
```

Then in the `nav` array, add the Workflow entry after the Focus entry:

```typescript
  { href: '/focus', label: 'Focus', icon: Timer },
  { href: '/workflow', label: 'Workflow', icon: Activity },
  { href: '/settings', label: 'Settings', icon: Settings },
```

Gate it by the master toggle — replace the `nav.map(...)` opening so disabled-feature hides the tab. At the top of the component add:

```typescript
  const workflowEnabled = useStore((s) => s.workflowEnabled);
```

and change the iterated list from `nav` to:

```typescript
          {nav.filter((item) => item.href !== '/workflow' || workflowEnabled).map((item) => {
```

- [ ] **Step 5: Add the Workflow item to the mobile nav**

In `src/components/layout/MobileNav.tsx`, add `Activity` to its lucide import, then add to its nav array after the Focus entry:

```typescript
  { href: '/workflow', label: 'Workflow', icon: Activity },
```

(If `MobileNav` renders a fixed number of items, place Workflow before Settings; if it gates by `workflowEnabled` like the sidebar, add the same `const workflowEnabled = useStore((s) => s.workflowEnabled);` and filter. Match whatever pattern the file already uses for store reads.)

- [ ] **Step 6: Build + lint + manual check**

Run: `npm run build`
Expected: build succeeds; `/workflow` listed as a route.
Run: `npm run lint`
Expected: 0 errors.
Manual: `npm run dev`, open `http://localhost:3000/workflow`. With no collector running you should see the "Start the monitor" card. The Workflow item appears in the sidebar.

- [ ] **Step 7: Commit**

```bash
git add src/lib/workflow/useWorkflowData.ts src/components/workflow/WorkflowDashboard.tsx src/app/workflow/page.tsx src/components/layout/Sidebar.tsx src/components/layout/MobileNav.tsx
git commit -m "feat(workflow): dashboard UI, data hook, page, and nav entry"
```

---

### Task 9: The macOS collector (Python)

**Files:**
- Create: `monitor/collector.py`
- Create: `monitor/test_collector.py`
- Create: `monitor/requirements.txt`
- Create: `monitor/README.md`

The capture functions are thin macOS I/O (smoke-tested manually). The pure `SessionAccumulator` is unit-tested with `unittest` (no extra deps).

- [ ] **Step 1: Write the failing accumulator test**

`monitor/test_collector.py`:

```python
import unittest
from collector import SessionAccumulator


class TestSessionAccumulator(unittest.TestCase):
    def test_emits_session_when_app_changes(self):
        acc = SessionAccumulator(idle_threshold=120)
        self.assertEqual(acc.sample("Cursor", "a.ts", 1000, 0), [])
        self.assertEqual(acc.sample("Cursor", "a.ts", 1020, 0), [])
        closed = acc.sample("Chrome", "Gmail", 1040, 0)
        self.assertEqual(len(closed), 1)
        self.assertEqual(closed[0]["app"], "Cursor")
        self.assertEqual(closed[0]["seconds"], 40)

    def test_idle_closes_session_without_counting_the_gap(self):
        acc = SessionAccumulator(idle_threshold=120)
        acc.sample("Cursor", "a.ts", 1000, 0)
        acc.sample("Cursor", "a.ts", 1020, 0)          # last active at 1020
        closed = acc.sample("Cursor", "a.ts", 1200, 300)  # idle 300s -> close
        self.assertEqual(len(closed), 1)
        self.assertEqual(closed[0]["seconds"], 20)       # 1000..1020, gap excluded

    def test_flush_closes_the_open_session(self):
        acc = SessionAccumulator()
        acc.sample("Cursor", "a.ts", 1000, 0)
        acc.sample("Cursor", "a.ts", 1030, 0)
        closed = acc.flush(1030)
        self.assertEqual(len(closed), 1)
        self.assertEqual(closed[0]["seconds"], 30)

    def test_session_dict_has_iso_timestamps(self):
        acc = SessionAccumulator()
        acc.sample("Cursor", "a.ts", 1000, 0)
        closed = acc.flush(1060)
        s = closed[0]
        self.assertIn("start", s)
        self.assertIn("end", s)
        self.assertTrue("T" in s["start"])  # ISO 8601


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `cd monitor && python -m unittest test_collector.py`
Expected: FAIL — `ModuleNotFoundError: No module named 'collector'` (or `ImportError: SessionAccumulator`).

- [ ] **Step 3: Implement `collector.py`**

`monitor/collector.py`:

```python
"""Life OS workflow collector.

Samples the frontmost macOS app + window title and appends coalesced sessions
to ~/.life-os-monitor/events.jsonl. No screenshots, no network. The pure
SessionAccumulator is unit-tested; the capture functions are thin I/O.
"""

import json
import os
import time
from datetime import datetime, timezone

POLL_SECONDS = int(os.environ.get("POLL_SECONDS", "20"))
IDLE_THRESHOLD = int(os.environ.get("IDLE_THRESHOLD", "120"))


def _iso(epoch: float) -> str:
    return datetime.fromtimestamp(epoch, tz=timezone.utc).astimezone().isoformat()


class SessionAccumulator:
    """Turns a stream of (app, title, ts, idle_seconds) samples into sessions.

    A session closes when the app/title changes, when idle exceeds the
    threshold (the idle gap is NOT counted), or on flush().
    """

    def __init__(self, idle_threshold: int = IDLE_THRESHOLD):
        self.idle_threshold = idle_threshold
        self.current = None  # dict: app, title, start, last_active

    def _close(self, end_epoch: float):
        c = self.current
        self.current = None
        seconds = max(0, round(end_epoch - c["start"]))
        return {
            "app": c["app"],
            "title": c["title"],
            "start": _iso(c["start"]),
            "end": _iso(end_epoch),
            "seconds": seconds,
        }

    def sample(self, app: str, title: str, ts: float, idle_seconds: float):
        closed = []
        if idle_seconds is not None and idle_seconds >= self.idle_threshold:
            if self.current is not None:
                closed.append(self._close(self.current["last_active"]))
            return closed

        if self.current is None:
            self.current = {"app": app, "title": title, "start": ts, "last_active": ts}
        elif app != self.current["app"] or title != self.current["title"]:
            closed.append(self._close(ts))
            self.current = {"app": app, "title": title, "start": ts, "last_active": ts}
        else:
            self.current["last_active"] = ts
        return closed

    def flush(self, ts: float):
        if self.current is None:
            return []
        return [self._close(ts)]


# ---- macOS capture (thin I/O; smoke-tested manually) ----

def monitor_dir() -> str:
    return os.environ.get("LIFE_OS_MONITOR_DIR") or os.path.join(
        os.path.expanduser("~"), ".life-os-monitor"
    )


def frontmost_app() -> str:
    try:
        from AppKit import NSWorkspace
        app = NSWorkspace.sharedWorkspace().frontmostApplication()
        return str(app.localizedName()) if app else "Unknown"
    except Exception:
        return "Unknown"


def frontmost_title() -> str:
    try:
        from Quartz import (
            CGWindowListCopyWindowInfo,
            kCGWindowListOptionOnScreenOnly,
            kCGNullWindowID,
        )
        from AppKit import NSWorkspace
        front = NSWorkspace.sharedWorkspace().frontmostApplication()
        pid = front.processIdentifier() if front else None
        windows = CGWindowListCopyWindowInfo(kCGWindowListOptionOnScreenOnly, kCGNullWindowID)
        for w in windows or []:
            if w.get("kCGWindowOwnerPID") == pid:
                name = w.get("kCGWindowName")
                if name:
                    return str(name)
        return ""
    except Exception:
        return ""


def idle_seconds() -> float:
    try:
        from Quartz import (
            CGEventSourceSecondsSinceLastEventType,
            kCGEventSourceStateHIDSystemState,
            kCGAnyInputEventType,
        )
        return float(CGEventSourceSecondsSinceLastEventType(
            kCGEventSourceStateHIDSystemState, kCGAnyInputEventType))
    except Exception:
        return 0.0


def append_session(session: dict) -> None:
    d = monitor_dir()
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "events.jsonl"), "a", encoding="utf-8") as f:
        f.write(json.dumps(session) + "\n")


def run() -> None:
    acc = SessionAccumulator()
    print(f"Life OS collector running. Writing to {monitor_dir()}/events.jsonl")
    print(f"Polling every {POLL_SECONDS}s. Ctrl+C to stop.")
    try:
        while True:
            ts = time.time()
            for s in acc.sample(frontmost_app(), frontmost_title(), ts, idle_seconds()):
                append_session(s)
            time.sleep(POLL_SECONDS)
    except KeyboardInterrupt:
        for s in acc.flush(time.time()):
            append_session(s)
        print("\nStopped. Final session flushed.")


if __name__ == "__main__":
    run()
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `cd monitor && python -m unittest test_collector.py`
Expected: PASS (4 tests).

- [ ] **Step 5: Create `requirements.txt`**

`monitor/requirements.txt`:

```
pyobjc-framework-Quartz>=10.0
pyobjc-framework-Cocoa>=10.0
```

- [ ] **Step 6: Create `README.md`**

`monitor/README.md`:

```markdown
# Life OS — workflow collector

A small background script that records which Mac app + window you're using, so
the Life OS **Workflow** tab can show your most-productive hours. **No
screenshots. No network.** Data is written only to `~/.life-os-monitor/events.jsonl`.

## Setup (once)

```bash
cd monitor
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
source .venv/bin/activate   # if not already active
python collector.py
```

Leave it running while you work. First launch will prompt for **Screen
Recording** permission (System Settings → Privacy & Security → Screen Recording)
— required to read window titles. Quit with Ctrl+C.

## Privacy / kill switch

- Only the frontmost app name + window title are recorded — never images.
- Stop the script and delete `~/.life-os-monitor/` to erase all data.
- You can also turn the whole feature off in Life OS → Settings.

## Config (env vars)

- `POLL_SECONDS` (default 20) — how often to sample.
- `IDLE_THRESHOLD` (default 120) — seconds of no input before time stops counting.
- `LIFE_OS_MONITOR_DIR` — override the data directory (used by tests).
```

- [ ] **Step 7: Commit**

```bash
git add monitor/collector.py monitor/test_collector.py monitor/requirements.txt monitor/README.md
git commit -m "feat(workflow): macOS collector with tested session accumulator"
```

---

### Task 10: End-to-end verification + settings toggle + memory

**Files:**
- Modify: `src/app/settings/page.tsx` (master on/off toggle)

- [ ] **Step 1: Add a Workflow toggle to settings**

In `src/app/settings/page.tsx`, read the flag and setter near the other store reads:

```typescript
  const workflowEnabled = useStore((s) => s.workflowEnabled);
  const setWorkflowEnabled = useStore((s) => s.setWorkflowEnabled);
```

Add a settings row (place it near the other preference toggles; match the file's existing toggle markup). Minimal version:

```tsx
        <div className="flex items-center justify-between py-3 border-t border-border">
          <div>
            <div className="text-sm text-text-primary">Workflow tracking</div>
            <div className="text-xs text-text-tertiary">Show the Workflow tab and read local monitor data.</div>
          </div>
          <button
            onClick={() => setWorkflowEnabled(!workflowEnabled)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${workflowEnabled ? 'bg-accent-dim text-accent' : 'bg-[rgba(255,255,255,0.05)] text-text-tertiary'}`}
          >
            {workflowEnabled ? 'On' : 'Off'}
          </button>
        </div>
```

- [ ] **Step 2: Build + lint + full test suite**

Run: `npm run build`  → succeeds.
Run: `npm run lint`  → 0 errors.
Run: `npm test`  → all suites pass.
Run: `cd monitor && python -m unittest test_collector.py`  → passes.

- [ ] **Step 3: Real end-to-end smoke test**

```bash
# 1. Start the collector and use a couple of apps for ~1–2 minutes.
cd monitor && source .venv/bin/activate && python collector.py
# 2. Confirm data is landing:
cat ~/.life-os-monitor/events.jsonl | tail -3
# 3. In another terminal, run the app and open the Workflow tab:
npm run dev   # then visit http://localhost:3000/workflow
```
Expected: the dashboard shows KPIs, the hours chart, and your app breakdown. Tapping a category re-labels the app and the bar color changes. "Refresh insight" produces a one-line AI summary (if `GEMINI_API_KEY` is set).

- [ ] **Step 4: Toggle test**

Turn "Workflow tracking" Off in Settings → the Workflow item disappears from the sidebar. Turn it back On → it returns.

- [ ] **Step 5: Commit**

```bash
git add src/app/settings/page.tsx
git commit -m "feat(workflow): master on/off toggle in settings"
```

- [ ] **Step 6: Update project memory**

Append to `~/.claude/projects/-Users-joseph/memory/project_jarvis-life-os.md` a short note that the Workflow tab + `monitor/collector.py` exist, what they do, and the `~/.life-os-monitor/events.jsonl` data path. Add a pointer line in `MEMORY.md` if the entry title changes.

---

## Self-Review

**1. Spec coverage**

| Spec section | Covered by |
|---|---|
| Collector (app + window title, idle handling, coalescing) | Task 9 |
| Event store `events.jsonl` format | Tasks 1 (type), 4 (parse), 9 (write) |
| `GET /api/workflow/usage` | Task 5 |
| `POST /api/workflow/summarize` (sparse Gemini 2.5-flash, text-only) | Task 6 |
| Category map (defaults + overrides, tap-to-relabel) | Tasks 1, 3, 8 |
| Focus score + per-hour/per-app aggregation | Tasks 2, 3 |
| Workflow UI (AI read, KPIs, hours chart, breakdown) | Task 8 |
| Privacy / no screenshots / kill switch | Task 9 (README), Task 10 (toggle) |
| Graceful degradation (no collector / Gemini down) | Task 8 (empty state), Task 6 (503/502), hook leaves old summary |
| Master on/off toggle | Tasks 7 (flag), 8 (nav gate), 10 (settings) |
| Testing strategy | Tasks 1–4 (jest), Task 9 (unittest), Tasks 5/6/8 (build+manual) |

No spec gaps.

**2. Placeholder scan:** No `TBD`/`TODO`/"add error handling" — every code step is complete. The only adapt-to-file note is the MobileNav store-read pattern (Task 8 Step 5), which gives both concrete variants.

**3. Type consistency:** `WorkflowCategory`, `UsageSession`, `RawAggregate`, `WorkflowView` are defined in Task 1 and used unchanged in Tasks 2–8. `classifyApp(app, overrides)`, `buildView(raw, overrides)`, `buildRollupText(view)`, `findUnknownApps(raw, overrides)`, `aggregateSessions(sessions, date)`, `parseSessions`/`readSessions`, and the store members (`workflowEnabled`, `workflowCategoryOverrides`, `workflowSummary` + setters) match across every task and the route/hook consumers. Override keys are consistently lowercased at write (`setWorkflowCategory`) and read (`classifyApp`). Collector session dict shape (`app/title/start/end/seconds`) matches `UsageSession` and `parseSessions`.
