# Whoop Integration — Design

**Date:** 2026-06-11
**Status:** Approved (planned under standing full-autonomy instruction; execution blocked until Joseph's Whoop arrives)

## What we're building

Link Joseph's Whoop to Life OS so recovery data drives the existing gamified
loops instead of living in a separate app:

1. **Connect Whoop** in Settings (OAuth 2.0, read-only scopes).
2. **Recovery widget** on the dashboard: today's recovery %, HRV, resting HR,
   sleep performance + duration, day strain.
3. **Daily Check-in autofill**: sleep quality and energy pre-filled from
   Whoop's sleep performance and recovery scores (overridable; mood stays
   manual).
4. **Workouts → Body pillar**: logged Whoop workouts can auto-complete the gym
   habit and award Body XP via the activity feed.

## Hard prerequisite (only Joseph can do this)

Whoop's developer platform requires creating an app *from his own Whoop
account* (developer.whoop.com → create app → redirect URI
`http://localhost:3000/api/whoop/callback`) to get `WHOOP_CLIENT_ID` /
`WHOOP_CLIENT_SECRET` for `.env.local`. Free with membership. Nothing can be
end-to-end verified before then, which is why this is spec + plan only today.

## API facts (verify against developer.whoop.com/api at build time)

- API v2 (v1 sunset Oct 2025). Paginated REST endpoints for cycles (contain
  strain), recoveries, sleeps, workouts, profile, body measurements.
- OAuth 2.0 authorization-code flow; request the `offline` scope to receive a
  refresh token alongside read scopes (recovery, sleep, workout, cycles,
  profile).
- Webhooks exist but need a public URL — not applicable to a localhost app;
  we poll instead.

## Approaches considered

**A. Client-side tokens, browser calls Whoop directly** — dead on arrival:
CORS, and the client secret can't ship to the browser.

**B. Server-side tokens + thin proxy routes (chosen)** — Next API routes do
the OAuth dance and refresh, tokens persist in `~/.life-os-whoop/tokens.json`
(same local-file pattern as the workflow collector's data dir), client only
ever talks to our own `/api/whoop/*`. Secrets stay in `.env.local`; nothing
sensitive in localStorage; survives browser-storage clears.

**C. Supabase-stored tokens** — rejected; cloud sync is deliberately off
(`CLOUD_SYNC_ENABLED = false`).

## Architecture

```
Settings "Connect Whoop" ──► GET /api/whoop/auth        (302 to Whoop consent)
Whoop redirects back     ──► GET /api/whoop/callback    (code→tokens, write
                                                         ~/.life-os-whoop/tokens.json)
Dashboard/Check-in       ──► GET /api/whoop/summary     (refresh token if needed,
                                                         fetch today's recovery+sleep+
                                                         cycle+workouts, normalize)
Settings "Disconnect"    ──► POST /api/whoop/disconnect (delete token file)
                              │
                              ▼
              src/lib/whoop/ (pure, jest-tested)
              • types.ts — WhoopSummary normalized shape
              • mapping.ts — score→1..5 check-in buckets, workout→habit/XP
              • tokens.ts — read/write/expiry helpers (fs, like eventsFile.ts)
                              │
                              ▼
              useWhoopData hook (poll on load + 15 min, cache last summary in
              store like icsCache → instant render, offline-tolerant)
                              │
              ┌───────────────┼──────────────────┐
              ▼               ▼                  ▼
      RecoveryWidget   DailyCheckin autofill   Body XP / gym habit
      (id `whoop`)     (prefill + "from        (activity feed entry,
                        Whoop" badge)           opt-in toggle)
```

### Normalized summary (one shape for all consumers)

```ts
interface WhoopSummary {
  date: string;               // YYYY-MM-DD local
  recoveryScore: number|null; // 0–100
  hrvMs: number|null;
  restingHr: number|null;
  sleepPerformancePct: number|null;
  sleepHours: number|null;
  dayStrain: number|null;     // 0–21
  workouts: { sport: string; start: string; minutes: number; strain: number }[];
  fetchedAt: string;
}
```

### Check-in mapping (pure, tested)

`scoreToFive(pct) = clamp(ceil(pct / 20), 1, 5)` applied to recovery → energy
and sleep performance → sleep quality. Check-in shows a small "from Whoop"
badge on prefilled values; manual edits always win and are never overwritten
after first render.

### Store additions

`whoopSummaryCache: WhoopSummary | null`, `whoopAutofillEnabled: boolean`
(default true), `whoopWorkoutXpEnabled: boolean` (default false, opt-in since
it grants XP automatically). Connection state itself lives server-side (token
file exists ⇔ connected), surfaced via `/api/whoop/summary` → `connected:
false` when no tokens.

## Error handling

- No tokens → summary returns `{ connected: false }`; widget shows Connect
  hint; check-in behaves exactly as today.
- Refresh failure / 401 → token file marked stale, Settings shows
  "Reconnect"; cached summary keeps rendering with "last synced X ago".
- Whoop hasn't computed recovery yet (early morning) → nulls render as "—",
  autofill skips null fields.
- Rate limits → poll interval is 15 min and summary is cached server-side per
  request day; no per-keystroke calls.

## Testing

- jest: mapping buckets (0/19/20/100, nulls), token expiry logic, summary
  normalization from recorded v2 fixture JSON.
- Manual end-to-end on device day: connect → consent → widget shows real
  recovery; check-in prefills; values survive reload offline.

## Out of scope (YAGNI)

Webhooks, historical backfill/trends page, writing data to Whoop, multi-user,
analytics correlations (phase 4 candidate, separate spec when wanted).
