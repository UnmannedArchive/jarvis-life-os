# Whoop Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect Joseph's Whoop to Life OS — recovery widget on the dashboard, Daily Check-in autofill, and opt-in Body-pillar XP for logged workouts.

**Architecture:** Next API routes own the OAuth dance and token refresh (tokens in `~/.life-os-whoop/tokens.json`, secrets in `.env.local`); a pure `src/lib/whoop/` layer normalizes Whoop v2 payloads into one `WhoopSummary` shape; a `useWhoopData` hook polls `/api/whoop/summary` and caches into the zustand store like `icsCache`. See `docs/superpowers/specs/2026-06-11-whoop-integration-design.md`.

**Tech Stack:** Next.js 16 App Router (nodejs runtime routes), zustand persist store, jest + ts-jest, Whoop API v2 (OAuth 2.0 authorization-code + `offline` scope).

**BLOCKED UNTIL:** Joseph has his Whoop, creates an app at developer.whoop.com (redirect URI `http://localhost:3000/api/whoop/callback`), and puts `WHOOP_CLIENT_ID` + `WHOOP_CLIENT_SECRET` in `.env.local`. Tasks 1–2 and 5–10 can be built before that; Tasks 3–4 compile before it but only verify on device day (Task 11).

**Verify at build time against https://developer.whoop.com/api:** exact v2 paths and response field names below were taken from the docs as of 2026-06-11. If anything differs, fix `WHOOP` constants in Task 3 and the fixture in Task 1 — nothing else should care.

---

### Task 1: Pure lib — types, score buckets, summary normalization, workout XP

**Files:**
- Create: `src/lib/whoop/types.ts`
- Create: `src/lib/whoop/mapping.ts`
- Test: `src/lib/whoop/__tests__/mapping.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/whoop/__tests__/mapping.test.ts
import { scoreToFive, xpForWorkout, normalizeSummary } from '../mapping';

// Trimmed shapes matching Whoop v2 collection responses (records[] arrays).
const recoveryRec = {
  score: { recovery_score: 71, hrv_rmssd_milli: 62.4, resting_heart_rate: 51 },
  created_at: '2026-07-01T13:01:00Z',
};
const sleepRec = {
  start: '2026-07-01T06:30:00Z', end: '2026-07-01T14:00:00Z',
  score: { sleep_performance_percentage: 88 },
};
const cycleRec = { score: { strain: 9.7 } };
const workoutRec = {
  sport_name: 'weightlifting',
  start: '2026-07-01T17:00:00Z', end: '2026-07-01T17:45:00Z',
  score: { strain: 6.2 },
};

describe('scoreToFive', () => {
  it.each([
    [0, 1], [19, 1], [20, 1], [21, 2], [40, 2], [55, 3], [80, 4], [81, 5], [100, 5],
  ])('maps %i%% to %i', (pct, expected) => {
    expect(scoreToFive(pct)).toBe(expected);
  });
  it('returns null for null', () => {
    expect(scoreToFive(null)).toBeNull();
  });
});

describe('xpForWorkout', () => {
  it('scales with strain, clamped to 5..40', () => {
    expect(xpForWorkout(6.2)).toBe(12);   // round(6.2*2)
    expect(xpForWorkout(0.5)).toBe(5);    // floor clamp
    expect(xpForWorkout(21)).toBe(40);    // ceiling clamp
  });
});

describe('normalizeSummary', () => {
  it('builds a full summary from v2 records', () => {
    const s = normalizeSummary({
      date: '2026-07-01',
      recovery: recoveryRec, sleep: sleepRec, cycle: cycleRec,
      workouts: [workoutRec],
      fetchedAt: '2026-07-01T18:00:00Z',
    });
    expect(s).toEqual({
      date: '2026-07-01',
      recoveryScore: 71, hrvMs: 62.4, restingHr: 51,
      sleepPerformancePct: 88, sleepHours: 7.5,
      dayStrain: 9.7,
      workouts: [{ sport: 'weightlifting', start: '2026-07-01T17:00:00Z', minutes: 45, strain: 6.2 }],
      fetchedAt: '2026-07-01T18:00:00Z',
    });
  });

  it('tolerates missing pieces (early morning: no recovery yet)', () => {
    const s = normalizeSummary({
      date: '2026-07-01', recovery: null, sleep: null, cycle: null, workouts: [],
      fetchedAt: '2026-07-01T05:00:00Z',
    });
    expect(s.recoveryScore).toBeNull();
    expect(s.sleepHours).toBeNull();
    expect(s.workouts).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/lib/whoop/__tests__/mapping.test.ts`
Expected: FAIL — `Cannot find module '../mapping'`.

- [ ] **Step 3: Implement types + mapping**

```ts
// src/lib/whoop/types.ts
export interface WhoopWorkout {
  sport: string;
  start: string;     // ISO
  minutes: number;
  strain: number;
}

export interface WhoopSummary {
  date: string;                       // YYYY-MM-DD local
  recoveryScore: number | null;      // 0–100
  hrvMs: number | null;
  restingHr: number | null;
  sleepPerformancePct: number | null;
  sleepHours: number | null;
  dayStrain: number | null;          // 0–21
  workouts: WhoopWorkout[];
  fetchedAt: string;                 // ISO
}

/** Trimmed Whoop v2 record shapes — only the fields we read. */
export interface RawRecovery { score?: { recovery_score?: number; hrv_rmssd_milli?: number; resting_heart_rate?: number } }
export interface RawSleep { start?: string; end?: string; score?: { sleep_performance_percentage?: number } }
export interface RawCycle { score?: { strain?: number } }
export interface RawWorkout { sport_name?: string; start?: string; end?: string; score?: { strain?: number } }
```

```ts
// src/lib/whoop/mapping.ts
import {
  WhoopSummary, WhoopWorkout, RawRecovery, RawSleep, RawCycle, RawWorkout,
} from './types';

/** 0–100 score → 1–5 check-in bucket (20-point bands, 0–20 → 1). */
export function scoreToFive(pct: number | null): number | null {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return null;
  return Math.min(5, Math.max(1, Math.ceil(pct / 20)));
}

/** Body-pillar XP for one workout: 2×strain, clamped 5..40. */
export function xpForWorkout(strain: number): number {
  return Math.min(40, Math.max(5, Math.round(strain * 2)));
}

export interface SummaryInput {
  date: string;
  recovery: RawRecovery | null;
  sleep: RawSleep | null;
  cycle: RawCycle | null;
  workouts: RawWorkout[];
  fetchedAt: string;
}

export function normalizeSummary(input: SummaryInput): WhoopSummary {
  const sleepMs =
    input.sleep?.start && input.sleep?.end
      ? new Date(input.sleep.end).getTime() - new Date(input.sleep.start).getTime()
      : null;

  const workouts: WhoopWorkout[] = input.workouts
    .filter((w) => w.start && w.end)
    .map((w) => ({
      sport: w.sport_name || 'workout',
      start: w.start!,
      minutes: Math.round((new Date(w.end!).getTime() - new Date(w.start!).getTime()) / 60000),
      strain: w.score?.strain ?? 0,
    }));

  return {
    date: input.date,
    recoveryScore: input.recovery?.score?.recovery_score ?? null,
    hrvMs: input.recovery?.score?.hrv_rmssd_milli ?? null,
    restingHr: input.recovery?.score?.resting_heart_rate ?? null,
    sleepPerformancePct: input.sleep?.score?.sleep_performance_percentage ?? null,
    sleepHours: sleepMs === null ? null : Math.round((sleepMs / 3600000) * 10) / 10,
    dayStrain: input.cycle?.score?.strain ?? null,
    workouts,
    fetchedAt: input.fetchedAt,
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx jest src/lib/whoop/__tests__/mapping.test.ts`
Expected: PASS (all suites).

- [ ] **Step 5: Commit**

```bash
git add src/lib/whoop
git commit -m "feat(whoop): pure summary normalization, check-in buckets, workout XP"
```

---

### Task 2: Token file helpers

**Files:**
- Create: `src/lib/whoop/tokens.ts`
- Test: `src/lib/whoop/__tests__/tokens.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/whoop/__tests__/tokens.test.ts
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { readTokens, writeTokens, clearTokens, needsRefresh, WhoopTokens } from '../tokens';

describe('whoop tokens', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'whoop-'));
    process.env.LIFE_OS_WHOOP_DIR = dir;
  });
  afterEach(() => {
    delete process.env.LIFE_OS_WHOOP_DIR;
    rmSync(dir, { recursive: true, force: true });
  });

  const tokens: WhoopTokens = {
    accessToken: 'a', refreshToken: 'r',
    expiresAt: '2026-07-01T12:00:00Z',
  };

  it('round-trips tokens through the file', () => {
    expect(readTokens()).toBeNull();
    writeTokens(tokens);
    expect(readTokens()).toEqual(tokens);
  });

  it('clearTokens removes the file', () => {
    writeTokens(tokens);
    clearTokens();
    expect(readTokens()).toBeNull();
  });

  it('needsRefresh is true within 5 minutes of expiry', () => {
    expect(needsRefresh(tokens, new Date('2026-07-01T11:54:00Z'))).toBe(false);
    expect(needsRefresh(tokens, new Date('2026-07-01T11:56:00Z'))).toBe(true);
    expect(needsRefresh(tokens, new Date('2026-07-01T13:00:00Z'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/lib/whoop/__tests__/tokens.test.ts`
Expected: FAIL — `Cannot find module '../tokens'`.

- [ ] **Step 3: Implement**

```ts
// src/lib/whoop/tokens.ts
// Tokens live in a local file (like the workflow collector's data dir), not
// in localStorage: the refresh flow needs the client secret, which must stay
// server-side, and this survives browser-storage clears.
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface WhoopTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string; // ISO
}

function whoopDir(): string {
  return process.env.LIFE_OS_WHOOP_DIR || join(homedir(), '.life-os-whoop');
}

function tokenPath(): string {
  return join(whoopDir(), 'tokens.json');
}

export function readTokens(): WhoopTokens | null {
  const p = tokenPath();
  if (!existsSync(p)) return null;
  try {
    const t = JSON.parse(readFileSync(p, 'utf8')) as WhoopTokens;
    return t.accessToken && t.refreshToken && t.expiresAt ? t : null;
  } catch {
    return null;
  }
}

export function writeTokens(tokens: WhoopTokens): void {
  mkdirSync(whoopDir(), { recursive: true });
  writeFileSync(tokenPath(), JSON.stringify(tokens), { mode: 0o600 });
}

export function clearTokens(): void {
  if (existsSync(tokenPath())) unlinkSync(tokenPath());
}

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

export function needsRefresh(tokens: WhoopTokens, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(tokens.expiresAt).getTime() - REFRESH_MARGIN_MS;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx jest src/lib/whoop/__tests__/tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/whoop/tokens.ts src/lib/whoop/__tests__/tokens.test.ts
git commit -m "feat(whoop): server-side token file helpers"
```

---

### Task 3: OAuth routes (auth / callback / disconnect)

**Files:**
- Create: `src/lib/whoop/oauth.ts`
- Create: `src/app/api/whoop/auth/route.ts`
- Create: `src/app/api/whoop/callback/route.ts`
- Create: `src/app/api/whoop/disconnect/route.ts`
- Test: `src/lib/whoop/__tests__/oauth.test.ts`

- [ ] **Step 1: Write the failing test for the pure URL builder**

```ts
// src/lib/whoop/__tests__/oauth.test.ts
import { buildAuthUrl, WHOOP } from '../oauth';

describe('buildAuthUrl', () => {
  it('points at Whoop with our client id, scopes, state, and redirect', () => {
    const url = new URL(buildAuthUrl('client123', 'state456'));
    expect(url.origin + url.pathname).toBe(WHOOP.authUrl);
    expect(url.searchParams.get('client_id')).toBe('client123');
    expect(url.searchParams.get('state')).toBe('state456');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/whoop/callback');
    expect(url.searchParams.get('scope')).toContain('offline');
    expect(url.searchParams.get('scope')).toContain('read:recovery');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx jest src/lib/whoop/__tests__/oauth.test.ts`
Expected: FAIL — `Cannot find module '../oauth'`.

- [ ] **Step 3: Implement oauth lib**

```ts
// src/lib/whoop/oauth.ts
// Endpoint paths per developer.whoop.com as of 2026-06-11 — verify on device
// day; only this file should need fixing if Whoop moved anything.
export const WHOOP = {
  authUrl: 'https://api.prod.whoop.com/oauth/oauth2/auth',
  tokenUrl: 'https://api.prod.whoop.com/oauth/oauth2/token',
  apiBase: 'https://api.prod.whoop.com/developer/v2',
  redirectUri: 'http://localhost:3000/api/whoop/callback',
  scopes: 'offline read:recovery read:sleep read:workout read:cycles read:profile',
} as const;

export function buildAuthUrl(clientId: string, state: string): string {
  const u = new URL(WHOOP.authUrl);
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', WHOOP.redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', WHOOP.scopes);
  u.searchParams.set('state', state);
  return u.toString();
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number; // seconds
}

async function tokenRequest(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(WHOOP.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Whoop token endpoint: ${res.status}`);
  return res.json();
}

export async function exchangeCode(code: string, clientId: string, clientSecret: string) {
  return tokenRequest(new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: WHOOP.redirectUri,
  }));
}

export async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  return tokenRequest(new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'offline',
  }));
}

export function toStoredTokens(t: TokenResponse) {
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: new Date(Date.now() + t.expires_in * 1000).toISOString(),
  };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx jest src/lib/whoop/__tests__/oauth.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement the three routes (thin I/O — verified on device day)**

```ts
// src/app/api/whoop/auth/route.ts
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { buildAuthUrl } from '@/lib/whoop/oauth';

export const runtime = 'nodejs';

export async function GET() {
  const clientId = process.env.WHOOP_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'Add WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET to .env.local first' },
      { status: 400 }
    );
  }
  const state = randomUUID();
  const res = NextResponse.redirect(buildAuthUrl(clientId, state));
  res.cookies.set('whoop_oauth_state', state, { httpOnly: true, maxAge: 600, path: '/' });
  return res;
}
```

```ts
// src/app/api/whoop/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode, toStoredTokens } from '@/lib/whoop/oauth';
import { writeTokens } from '@/lib/whoop/tokens';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const expected = req.cookies.get('whoop_oauth_state')?.value;

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL('/settings?whoop=error', req.url));
  }
  try {
    const tokens = await exchangeCode(
      code,
      process.env.WHOOP_CLIENT_ID!,
      process.env.WHOOP_CLIENT_SECRET!
    );
    writeTokens(toStoredTokens(tokens));
    const res = NextResponse.redirect(new URL('/settings?whoop=connected', req.url));
    res.cookies.delete('whoop_oauth_state');
    return res;
  } catch {
    return NextResponse.redirect(new URL('/settings?whoop=error', req.url));
  }
}
```

```ts
// src/app/api/whoop/disconnect/route.ts
import { NextResponse } from 'next/server';
import { clearTokens } from '@/lib/whoop/tokens';

export const runtime = 'nodejs';

export async function POST() {
  clearTokens();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc --noEmit` — expected: clean.

```bash
git add src/lib/whoop/oauth.ts src/lib/whoop/__tests__/oauth.test.ts src/app/api/whoop
git commit -m "feat(whoop): oauth connect/callback/disconnect routes"
```

---

### Task 4: Summary route

**Files:**
- Create: `src/app/api/whoop/summary/route.ts`

This route is thin I/O over the tested lib: ensure fresh tokens, fetch the
four v2 collections limited to today, normalize, return. No unit test (it is
all fetch glue); device-day verification in Task 11.

- [ ] **Step 1: Implement**

```ts
// src/app/api/whoop/summary/route.ts
import { NextResponse } from 'next/server';
import { format, startOfDay } from 'date-fns';
import { readTokens, writeTokens, clearTokens, needsRefresh } from '@/lib/whoop/tokens';
import { refreshAccessToken, toStoredTokens, WHOOP } from '@/lib/whoop/oauth';
import { normalizeSummary } from '@/lib/whoop/mapping';
import { RawRecovery, RawSleep, RawCycle, RawWorkout } from '@/lib/whoop/types';

export const runtime = 'nodejs';

async function whoopGet<T>(path: string, accessToken: string): Promise<T | null> {
  const res = await fetch(`${WHOOP.apiBase}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

interface Collection<T> { records?: T[] }

export async function GET() {
  let tokens = readTokens();
  if (!tokens) return NextResponse.json({ connected: false });

  if (needsRefresh(tokens)) {
    try {
      const refreshed = await refreshAccessToken(
        tokens.refreshToken,
        process.env.WHOOP_CLIENT_ID!,
        process.env.WHOOP_CLIENT_SECRET!
      );
      tokens = toStoredTokens(refreshed);
      writeTokens(tokens);
    } catch {
      clearTokens(); // refresh token rejected → force reconnect in Settings
      return NextResponse.json({ connected: false, error: 'Whoop session expired — reconnect in Settings' });
    }
  }

  const sinceIso = startOfDay(new Date()).toISOString();
  const q = `?start=${encodeURIComponent(sinceIso)}&limit=10`;
  const [recovery, sleep, cycle, workout] = await Promise.all([
    whoopGet<Collection<RawRecovery>>(`/recovery${q}`, tokens.accessToken),
    whoopGet<Collection<RawSleep>>(`/activity/sleep${q}`, tokens.accessToken),
    whoopGet<Collection<RawCycle>>(`/cycle${q}`, tokens.accessToken),
    whoopGet<Collection<RawWorkout>>(`/activity/workout${q}`, tokens.accessToken),
  ]);

  const summary = normalizeSummary({
    date: format(new Date(), 'yyyy-MM-dd'),
    recovery: recovery?.records?.[0] ?? null,
    sleep: sleep?.records?.[0] ?? null,
    cycle: cycle?.records?.[0] ?? null,
    workouts: workout?.records ?? [],
    fetchedAt: new Date().toISOString(),
  });

  return NextResponse.json({ connected: true, summary });
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npx tsc --noEmit` — expected: clean.

```bash
git add src/app/api/whoop/summary
git commit -m "feat(whoop): daily summary route with token refresh"
```

---

### Task 5: Store additions

**Files:**
- Modify: `src/stores/useStore.ts` (interface block ~line 100 near `gcalIcsUrl`; defaults ~line 250; actions near `setIcsCache`; `partialize` block ~line 805)

- [ ] **Step 1: Add to the store interface (next to the Google Calendar block)**

```ts
  // Whoop (read-only; tokens live server-side, this is just display cache + prefs)
  whoopSummaryCache: import('@/lib/whoop/types').WhoopSummary | null;
  setWhoopSummaryCache: (s: import('@/lib/whoop/types').WhoopSummary | null) => void;
  whoopAutofillEnabled: boolean;
  setWhoopAutofillEnabled: (v: boolean) => void;
  whoopWorkoutXpEnabled: boolean;
  setWhoopWorkoutXpEnabled: (v: boolean) => void;
  /** Workout start-times already credited with XP (prevents double-granting). */
  whoopCreditedWorkouts: string[];
  creditWhoopWorkouts: (workouts: import('@/lib/whoop/types').WhoopWorkout[]) => void;
```

- [ ] **Step 2: Add defaults (next to `gcalIcsUrl: null`)**

```ts
  whoopSummaryCache: null,
  whoopAutofillEnabled: true,
  whoopWorkoutXpEnabled: false,
  whoopCreditedWorkouts: [],
```

- [ ] **Step 3: Add actions (next to `setIcsCache`)**

```ts
  setWhoopSummaryCache: (s) => set({ whoopSummaryCache: s }),
  setWhoopAutofillEnabled: (v) => set({ whoopAutofillEnabled: v }),
  setWhoopWorkoutXpEnabled: (v) => set({ whoopWorkoutXpEnabled: v }),

  creditWhoopWorkouts: (workouts) => {
    const { user, whoopCreditedWorkouts } = get();
    if (!user) return;
    const fresh = workouts.filter((w) => !whoopCreditedWorkouts.includes(w.start));
    if (fresh.length === 0) return;
    let totalXp = 0;
    for (const w of fresh) {
      // xpForWorkout imported from '@/lib/whoop/mapping' at top of file
      const xp = xpForWorkout(w.strain);
      totalXp += xp;
      get().addActivity({
        type: 'xp_gain',
        title: `Whoop workout: ${w.sport}`,
        description: `${w.minutes} min · strain ${w.strain.toFixed(1)} // +${xp} XP`,
        xp,
        pillar: 'body',
        metadata: { source: 'whoop', start: w.start },
      });
    }
    set({
      user: { ...user, total_xp: user.total_xp + totalXp },
      whoopCreditedWorkouts: [...whoopCreditedWorkouts, ...fresh.map((w) => w.start)].slice(-200),
    });
  },
```

Also add the import at the top of `useStore.ts`:

```ts
import { xpForWorkout } from '@/lib/whoop/mapping';
```

- [ ] **Step 4: Add to `partialize`**

```ts
    whoopSummaryCache: state.whoopSummaryCache,
    whoopAutofillEnabled: state.whoopAutofillEnabled,
    whoopWorkoutXpEnabled: state.whoopWorkoutXpEnabled,
    whoopCreditedWorkouts: state.whoopCreditedWorkouts,
```

- [ ] **Step 5: Typecheck, run all tests, commit**

Run: `npx tsc --noEmit && npx jest` — expected: clean, all pass.
Note: `addActivity` requires `Omit<ActivityFeedEntry, 'id'|'timestamp'|'pinned'|'dismissed'>` — if the compiler complains about missing fields, match the existing call sites around `useStore.ts:507`.

```bash
git add src/stores/useStore.ts
git commit -m "feat(whoop): store cache, prefs, and workout XP crediting"
```

---

### Task 6: `useWhoopData` hook

**Files:**
- Create: `src/hooks/useWhoopData.ts`

- [ ] **Step 1: Implement (mirrors `useCalendarData`'s poll+cache shape)**

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/stores/useStore';
import { WhoopSummary } from '@/lib/whoop/types';

const POLL_MS = 15 * 60 * 1000;

export interface WhoopData {
  connected: boolean;
  summary: WhoopSummary | null; // cached — renders instantly, survives offline
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWhoopData(): WhoopData {
  const summary = useStore((s) => s.whoopSummaryCache);
  const setSummary = useStore((s) => s.setWhoopSummaryCache);
  const creditWhoopWorkouts = useStore((s) => s.creditWhoopWorkouts);
  const workoutXpEnabled = useStore((s) => s.whoopWorkoutXpEnabled);

  const [connected, setConnected] = useState<boolean>(summary !== null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/whoop/summary');
      const data = await res.json();
      setConnected(!!data.connected);
      if (data.error) setError(data.error);
      if (data.summary) {
        setSummary(data.summary);
        if (workoutXpEnabled && data.summary.workouts.length > 0) {
          creditWhoopWorkouts(data.summary.workouts);
        }
      }
    } catch {
      setError('Whoop sync failed'); // keep cached summary rendering
    } finally {
      setLoading(false);
    }
  }, [setSummary, creditWhoopWorkouts, workoutXpEnabled]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { connected, summary, loading, error, refresh };
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npx tsc --noEmit` — expected: clean.

```bash
git add src/hooks/useWhoopData.ts
git commit -m "feat(whoop): polling data hook with store cache"
```

---

### Task 7: Settings section

**Files:**
- Modify: `src/app/settings/page.tsx` (add a panel after the Google Calendar `HUDPanel`, before the “Import Calendar (.ics)” panel)

- [ ] **Step 1: Add state + handlers inside `SettingsPage`**

```tsx
  const whoopAutofillEnabled = useStore((s) => s.whoopAutofillEnabled);
  const setWhoopAutofillEnabled = useStore((s) => s.setWhoopAutofillEnabled);
  const whoopWorkoutXpEnabled = useStore((s) => s.whoopWorkoutXpEnabled);
  const setWhoopWorkoutXpEnabled = useStore((s) => s.setWhoopWorkoutXpEnabled);
  const setWhoopSummaryCache = useStore((s) => s.setWhoopSummaryCache);
  const [whoopConnected, setWhoopConnected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/whoop/summary')
      .then((r) => r.json())
      .then((d) => setWhoopConnected(!!d.connected))
      .catch(() => setWhoopConnected(false));
  }, []);
```

(Add `useEffect` to the existing react import if not already imported.)

- [ ] **Step 2: Add the panel JSX**

```tsx
      <HUDPanel delay={3}>
        <div className="flex items-center gap-2 mb-1">
          <Activity size={13} className="text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Whoop</h2>
        </div>
        <p className="text-xs text-text-tertiary mb-4">
          Read-only link: recovery and sleep feed the dashboard and Daily Check-in.
        </p>

        {whoopConnected === null ? (
          <p className="text-xs text-text-placeholder">Checking connection…</p>
        ) : whoopConnected ? (
          <div className="space-y-3">
            <p className="text-xs text-success">Connected.</p>
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input type="checkbox" checked={whoopAutofillEnabled}
                onChange={(e) => setWhoopAutofillEnabled(e.target.checked)} />
              Pre-fill Daily Check-in (sleep & energy) from Whoop
            </label>
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input type="checkbox" checked={whoopWorkoutXpEnabled}
                onChange={(e) => setWhoopWorkoutXpEnabled(e.target.checked)} />
              Award Body XP for logged workouts
            </label>
            <HUDButton size="sm" variant="danger" onClick={async () => {
              await fetch('/api/whoop/disconnect', { method: 'POST' });
              setWhoopSummaryCache(null);
              setWhoopConnected(false);
            }}>
              Disconnect
            </HUDButton>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-[rgba(0,0,0,0.4)] p-4 text-xs text-text-tertiary space-y-2">
              <p>One-time setup:</p>
              <p>1. Create an app at <a href="https://developer.whoop.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">developer.whoop.com</a> with redirect URI <code className="text-text-secondary">http://localhost:3000/api/whoop/callback</code></p>
              <p>2. Put <code className="text-text-secondary">WHOOP_CLIENT_ID</code> and <code className="text-text-secondary">WHOOP_CLIENT_SECRET</code> in <code className="text-text-secondary">.env.local</code>, restart the dev server</p>
              <p>3. Click Connect and approve on Whoop</p>
            </div>
            <HUDButton size="sm" onClick={() => { window.location.href = '/api/whoop/auth'; }}>
              Connect Whoop
            </HUDButton>
          </div>
        )}
      </HUDPanel>
```

- [ ] **Step 3: Typecheck, lint, commit**

Run: `npx tsc --noEmit && npx eslint src/app/settings/page.tsx` — expected: clean (one pre-existing `alt-text` warning is known).

```bash
git add src/app/settings/page.tsx
git commit -m "feat(whoop): settings panel — connect, prefs, disconnect"
```

---

### Task 8: Recovery dashboard widget

**Files:**
- Create: `src/components/dashboard/WhoopWidget.tsx`
- Modify: `src/lib/widgets.ts` (registry list)
- Modify: `src/components/dashboard/DashboardGrid.tsx` (lazy import map, next to the `gcalendar` entry ~line 29/59)

- [ ] **Step 1: Implement the widget**

```tsx
'use client';

// Whoop recovery widget (id `whoop`) — today's recovery, sleep, and strain.
import { useWhoopData } from '@/hooks/useWhoopData';
import HUDPanel from '@/components/hud/HUDPanel';
import Link from 'next/link';
import { HeartPulse, RefreshCw, Moon, Flame } from 'lucide-react';

function recoveryColor(score: number): string {
  if (score >= 67) return 'var(--color-success)';
  if (score >= 34) return 'var(--color-warning)';
  return '#f87171';
}

export default function WhoopWidget() {
  const { connected, summary, loading, refresh } = useWhoopData();

  return (
    <HUDPanel delay={2}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <HeartPulse size={13} className="text-accent" />
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Recovery</h2>
          {loading && <RefreshCw size={10} className="animate-spin text-text-placeholder" />}
        </div>
        <button onClick={refresh} className="text-text-placeholder hover:text-accent" title="Refresh">
          <RefreshCw size={11} />
        </button>
      </div>

      {!connected ? (
        <p className="text-xs text-text-placeholder text-center py-4">
          <Link href="/settings" className="text-accent hover:underline">Connect Whoop</Link> to see recovery here.
        </p>
      ) : !summary || summary.recoveryScore === null ? (
        <p className="text-xs text-text-placeholder text-center py-4">No recovery yet today.</p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums" style={{ color: recoveryColor(summary.recoveryScore) }}>
              {summary.recoveryScore}%
            </span>
            <span className="text-[11px] text-text-tertiary">
              HRV {summary.hrvMs ?? '—'} ms · RHR {summary.restingHr ?? '—'}
            </span>
          </div>
          <div className="flex gap-4 text-[11px] text-text-tertiary">
            <span className="flex items-center gap-1">
              <Moon size={10} /> {summary.sleepHours ?? '—'}h ({summary.sleepPerformancePct ?? '—'}%)
            </span>
            <span className="flex items-center gap-1">
              <Flame size={10} /> strain {summary.dayStrain?.toFixed(1) ?? '—'}
            </span>
          </div>
          {summary.workouts.length > 0 && (
            <div className="text-[11px] text-text-placeholder">
              {summary.workouts.length} workout{summary.workouts.length > 1 ? 's' : ''} logged today
            </div>
          )}
        </div>
      )}
    </HUDPanel>
  );
}
```

- [ ] **Step 2: Register it**

In `src/lib/widgets.ts`, after the `gcalendar` line:

```ts
  { id: 'whoop', label: 'Recovery', description: 'Whoop recovery, sleep & strain', defaultSize: 'small', icon: 'HeartPulse' },
```

In `src/components/dashboard/DashboardGrid.tsx`, next to the `GoogleCalendarWidget` lazy import and its map entry:

```ts
const WhoopWidget = lazy(() => import('@/components/dashboard/WhoopWidget'));
// …
  whoop: WhoopWidget,
```

- [ ] **Step 3: Typecheck, verify in browser, commit**

Run: `npx tsc --noEmit` — clean. In the browser: dashboard → Edit → add "Recovery" widget → shows the Connect hint (pre-device).

```bash
git add src/components/dashboard/WhoopWidget.tsx src/lib/widgets.ts src/components/dashboard/DashboardGrid.tsx
git commit -m "feat(whoop): recovery dashboard widget"
```

---

### Task 9: Daily Check-in autofill

**Files:**
- Modify: `src/components/dashboard/DailyCheckin.tsx`

- [ ] **Step 1: Wire the prefill**

`DailyCheckin.tsx:46-48` holds `const [sleep, setSleep] = useState(3)` /
`[energy, setEnergy]` / `[mood, setMood]` and renders them via
`<Slider label="Sleep Quality" value={sleep} onChange={setSleep} />` (lines
64-65). Defaults are `3`, not null — so prefill must only run before the user
touches a slider. Add:

```tsx
import { useEffect } from 'react'; // extend the existing react import
import { useWhoopData } from '@/hooks/useWhoopData';
import { scoreToFive } from '@/lib/whoop/mapping';

// inside the component, after the existing useState lines:
const { summary } = useWhoopData();
const whoopAutofillEnabled = useStore((s) => s.whoopAutofillEnabled);
const [prefilled, setPrefilled] = useState(false);
const [touched, setTouched] = useState(false);

useEffect(() => {
  if (prefilled || touched || !whoopAutofillEnabled || !summary) return;
  const sleepFive = scoreToFive(summary.sleepPerformancePct);
  const energyFive = scoreToFive(summary.recoveryScore);
  if (sleepFive !== null) setSleep(sleepFive);
  if (energyFive !== null) setEnergy(energyFive);
  if (sleepFive !== null || energyFive !== null) setPrefilled(true);
}, [summary, whoopAutofillEnabled, prefilled, touched]);
```

And mark manual interaction so autofill never overwrites it — wrap the two
slider setters at lines 64-65:

```tsx
<Slider label="Sleep Quality" value={sleep} onChange={(v) => { setTouched(true); setSleep(v); }} />
<Slider label="Energy Level" value={energy} onChange={(v) => { setTouched(true); setEnergy(v); }} />
```

- [ ] **Step 2: Show the badge next to prefilled labels**

```tsx
{prefilled && (
  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent-dim text-accent">from Whoop</span>
)}
```

- [ ] **Step 3: Typecheck, verify, commit**

`npx tsc --noEmit` clean; in browser, with no Whoop connected the check-in is
unchanged.

```bash
git add src/components/dashboard/DailyCheckin.tsx
git commit -m "feat(whoop): daily check-in prefill from recovery + sleep"
```

---

### Task 10: Full-suite gate

- [ ] **Step 1: Run everything**

Run: `npx tsc --noEmit && npx jest && npx next build`
Expected: clean / all pass / build succeeds with `/api/whoop/*` in the route list.

- [ ] **Step 2: Commit anything outstanding**

```bash
git status --short   # only intentional whoop files
```

---

### Task 11: Device-day verification (manual, requires the Whoop)

- [ ] Joseph creates the app at developer.whoop.com (redirect URI `http://localhost:3000/api/whoop/callback`), adds `WHOOP_CLIENT_ID`/`WHOOP_CLIENT_SECRET` to `.env.local`, restarts `npm run dev`.
- [ ] Settings → Whoop → Connect → approve on Whoop → redirected back with "Connected."
- [ ] `~/.life-os-whoop/tokens.json` exists with mode 600.
- [ ] `curl -s localhost:3000/api/whoop/summary` returns `connected: true` and a sane summary (verify field names against real payloads; fix `types.ts` + Task 1 fixture if Whoop's actual JSON differs, then re-run jest).
- [ ] Dashboard Recovery widget shows the real recovery %; check-in pre-fills with the "from Whoop" badge; manual override sticks.
- [ ] Toggle "Award Body XP" on, log a workout, confirm one activity-feed XP entry and no duplicate on refresh.
- [ ] Wait >1h (token expiry), reload — summary still loads (refresh flow works).
