# Workflow / Productivity Tracking — Design Spec

**Date:** 2026-06-04
**Status:** Approved design, pre-implementation
**App:** `~/Claude/jarvis-life-os` (Next.js 16, local-only / "saved game")

## 1. Goal

Give Life OS a **Workflow tab** that passively tracks what the user works on during
the day and surfaces patterns — most productive hours, where time goes, focus vs.
distraction — inspired by Cluely, but realistic for a personal, free, local setup.

Phase 1 is **passive analytics**. A live, in-the-moment screen assistant (Cluely-style
overlay) is explicitly deferred to a later phase.

## 2. Decisions locked during brainstorming

| Decision | Choice | Why |
|---|---|---|
| Core goal | Passive analytics first; live assistant later | Cheapest, most private, real value fast |
| Data source | Local Mac helper tracking active app + window titles | Real "what was I doing" signal without cloud |
| Capture depth (phase 1) | **App + window title only — no screenshots** | ~80–90% of signal, zero images on disk, near-zero CPU |
| AI strategy | **Mostly local; sparse Gemini 2.5-flash summaries** | User won't pay; USC free tier; CPU-only Mac |
| Integration architecture | **A — "dumb collector" writes a local file; Life OS reads it** | Smallest footprint, same-origin, reuses existing Gemini wiring, easy to remove |

## 3. Scope

**In scope (phase 1):**
- A background macOS collector that records active app + window title over time.
- A local append-only event file the collector writes.
- Life OS API routes that read + aggregate that file (Node `fs`, localhost only).
- A category map (productive / neutral / distraction) with sensible defaults and
  per-app user overrides from the dashboard.
- Sparse Gemini 2.5-flash summarization (a couple times/day or on demand).
- A new **Workflow** tab: AI daily read, focus/neutral/distraction KPIs, "most
  productive hours" chart, and a "where time went" app breakdown.

**Out of scope (future phases):**
- Screenshots + OCR (additive later — just adds an `ocrText` field to events).
- Live Cluely-style overlay / real-time assistant (needs a desktop wrapper — Tauri/Electron).
- Cross-device sync / cloud storage (app is intentionally local-only).
- Showing this data on the Vercel deployment (inherent: the Mac being watched is local).

## 4. Architecture

```
┌─────────────────────┐        appends         ┌──────────────────────────┐
│  Mac collector (py) │ ───────────────────────▶│ ~/.life-os-monitor/      │
│  sample every ~20s  │     events.jsonl        │   events.jsonl  (local)  │
└─────────────────────┘                         └────────────┬─────────────┘
                                                              │ Node fs reads
                                                  ┌───────────▼─────────────┐
                                                  │ Life OS (Next.js, local) │
                                                  │  /api/workflow/usage     │ ← aggregates
                                                  │  /api/workflow/summarize │ ← sparse Gemini
                                                  │  Workflow tab (UI)       │
                                                  └──────────────────────────┘
```

The collector and Life OS are decoupled — they share **only the event file**. The
collector holds no secrets and makes no network calls. All categorization and AI work
lives in Life OS.

## 5. Components & boundaries

### 5.1 Collector — `monitor/collector.py` (code in repo)
- **Does:** every ~20s (`POLL_SECONDS`, configurable), read the frontmost app name +
  frontmost window title via macOS APIs (`AppKit.NSWorkspace` for app, Quartz
  `CGWindowListCopyWindowInfo` for the window title). Coalesce consecutive identical
  `(app, title)` samples into one session with `start`/`end`. On change (or every N
  minutes), append the closed session as one JSON line.
- **Idle handling:** if HID idle time (`CGEventSourceSecondsSinceLastEventType`) exceeds
  a threshold (default 120s) or the screen is locked, close the current session and do
  **not** attribute the idle gap. Prevents "left Cursor open" inflating focus time.
- **Holds:** no secrets, no network, no knowledge of Life OS internals.
- **Run:** `python monitor/collector.py` (its own minimal venv; deps: `pyobjc-framework-Quartz`,
  `pyobjc-framework-AppKit`). Optionally a `launchd` plist later for auto-start.
- **Permission:** macOS **Screen Recording** (window titles require it). One-time grant.

### 5.2 Event store — `~/.life-os-monitor/events.jsonl`
- Append-only JSON Lines, outside the repo (never committed). One line per session:

```json
{"app":"Cursor","title":"useStore.ts — jarvis-life-os","start":"2026-06-04T09:01:20-07:00","end":"2026-06-04T09:14:05-07:00","seconds":765}
```

- The format is intentionally extensible: a future OCR phase adds an optional
  `"ocrText"` field with no migration.
- Rotation: one file is fine for phase 1; revisit per-day files if it grows large.

### 5.3 Life OS API routes (Node, localhost)
- `GET /api/workflow/usage?date=YYYY-MM-DD` — reads `events.jsonl`, filters to the date,
  returns an aggregate: per-app seconds, per-hour seconds, and per-category totals
  (focus / neutral / distraction) plus a focus score. Categories applied using the
  default map + user overrides (see 5.4). Missing file → empty aggregate + `monitorRunning: false`.
- `POST /api/workflow/summarize` — builds a compact **text** rollup (app names, titles,
  durations) and sends it to Gemini 2.5-flash for the daily read + suggested categories
  for unknown apps. Called at most a couple times/day, or via a manual "refresh insight"
  button. Result cached in the store. Gemini failure → return without the AI sentence.

### 5.4 Category map
- **Defaults in code** (`src/lib/workflow/categories.ts`): seed mapping of common apps
  to focus/neutral/distraction (e.g. Cursor/Terminal/Xcode = focus, Slack/Mail = neutral,
  YouTube/TikTok/Instagram = distraction). Unknown app → `neutral` until labeled.
- **User overrides** stored in the zustand store (persisted in `life-os-storage`), set by
  tapping an app in the dashboard. Overrides always win over defaults and over Gemini
  suggestions. Gemini may only *suggest* a category for an app the user hasn't labeled.

### 5.5 Workflow UI tab
- New route/tab "Workflow" rendering: AI daily read card, KPI row (focused / neutral /
  distracted / focus score), "most productive hours" stacked bar chart (by hour, colored
  by category), and a "where time went" per-app breakdown with tap-to-relabel.
- Matches existing Life OS dark HUD styling.

## 6. Categorization & focus score
- Each session maps to a category via override → default → `neutral`.
- Focus score = focus_seconds / (focus + neutral + distraction) for the day, shown as %.

## 7. AI summarization (sparse, free-tier safe)
- Model: **`gemini-2.5-flash`** (the model that works on the USC key; `2.0-*` is throttled
  to zero on that account — do not use it).
- Reuses the existing keyless-SDK `fetch` pattern and `GEMINI_API_KEY`.
- Input is **text only** (never images): a per-category, per-app rollup with durations.
- Frequency: a couple times/day or manual refresh — stays inside the free daily limit.

## 8. Privacy & permissions
- No screenshots in phase 1. Only app name + window-title text.
- All raw data stays in `~/.life-os-monitor/`. Only a short text summary leaves the Mac
  (to Gemini), a couple times/day.
- macOS Screen Recording permission required (for window titles).
- Kill switch: quit the collector + delete `~/.life-os-monitor/` = gone. Plus a master
  on/off toggle in Life OS settings.

## 9. Failure behavior (mirrors existing patterns)
- Collector not running / no events file → Workflow tab shows a "Start the monitor" card
  with the copy-paste command, and still renders whatever Life OS's own data provides
  (focus sessions, check-ins).
- Gemini over limit / offline → render local rule-based stats without the AI sentence —
  same graceful-degrade approach as the existing `planDay` heuristic fallback.
- Feature never hard-fails the app.

## 10. Testing
- **Collector:** unit-test the pure functions — session coalescing and idle-gap handling —
  over sample event sequences. macOS capture itself is thin I/O, smoke-tested manually.
- **API routes:** aggregate from a fixture `events.jsonl`; test category application and
  the Gemini-fallback path (mirrors `planDay.test.ts`).
- **UI:** render the Workflow tab from a fixture aggregate.

## 11. Risks / open questions
- Window titles for some Electron/web apps are generic ("Untitled") — acceptable for
  phase 1; OCR is the documented future remedy.
- `pyobjc` install on a CPU-only Mac is fine (no native model), but adds a Python dep set
  the user must install once.
- Auto-start (`launchd`) is deferred; phase 1 starts the collector manually.
