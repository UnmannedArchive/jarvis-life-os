# Calendar — Design

**Date:** 2026-06-10
**Status:** Approved (user granted full autonomy after answering the four shaping questions)

## What we're building

A real calendar for Life OS: a full **Calendar page** in the sidebar with month and
week views, plus an upgraded dashboard widget that links to it. It shows four kinds
of items on one grid:

1. **Google Calendar events** — read-only, via the calendar's *secret iCal address*
   pasted into Settings. No OAuth, no API key, private events included.
2. **Tasks** (`Quest.due_date`) — completable in place, draggable to reschedule.
3. **Goal milestones** (`Goal.target_date`) — passive markers.
4. **Habits** (`RecurringTask.days`) — passive markers on the weekdays they fire.

User decisions from brainstorming: *Both* page and widget; *read-only simple* Google
link; *all three* Life OS data types on the grid; *add + reschedule* interactivity.

## Why secret iCal URL over OAuth or the existing API key

The current widget needs a Google Cloud project + a **public** calendar. The secret
iCal address gives private read access with one pasted URL. OAuth is the only way to
get write access, and Joseph chose read-only — so all the consent-screen/token-refresh
machinery drops out. The old API-key path keeps working as a fallback source.

## Architecture

```
Settings (paste secret .ics URL) ──┐
                                   ▼
            POST /api/calendar/ics  (server-side proxy; avoids CORS,
                                     https-only, blocks private hosts)
                                   │ raw ICS text
                                   ▼
icalParser.ts (extended: EXDATE) ──► lib/calendarEvents.ts
                                      • expandRecurring() via `rrule` pkg
                                      • toCalendarItems() from quests/goals/
                                        recurringTasks/ICal events
                                      • bucketByDay(items, rangeStart, rangeEnd)
                                   ▼
              hooks/useCalendarData.ts  (fetch + cache in store, merge all
                                         sources for a visible date range)
                  │                                  │
                  ▼                                  ▼
        app/calendar/page.tsx                dashboard CalendarWidget
        (month/week grid, dnd-kit            (mini week strip + today list,
         drag-to-reschedule, click-day        links to /calendar; keeps
         quick-add, item popovers)            widget id `gcalendar`)
```

### Unified item model (`lib/calendarEvents.ts`)

```ts
type CalendarItemSource = 'gcal' | 'task' | 'goal' | 'habit';
interface CalendarItem {
  id: string;            // source-prefixed, e.g. task:<questId>, gcal:<uid>:<occurrenceISO>
  source: CalendarItemSource;
  title: string;
  date: string;          // YYYY-MM-DD bucket key (local time)
  start?: string;        // ISO, timed events only
  end?: string;
  allDay: boolean;
  pillar?: Pillar;       // tasks/goals/habits
  completed?: boolean;   // tasks
  location?: string;     // gcal
  refId: string;         // questId / goalId / recurringTaskId / ical uid
}
```

### Recurrence

`icalParser` already captures the raw `RRULE`; it does **not** expand occurrences, so
weekly classes would render once. We add the `rrule` npm package and
`expandRecurring(event, rangeStart, rangeEnd)`. The parser is extended to also capture
`EXDATE` so deleted single occurrences don't reappear. Known accepted limitation:
`RECURRENCE-ID` overrides (a single moved occurrence) render at their original slot.

### Proxy route `POST /api/calendar/ics`

Body `{ url }`. Validates `https:` and rejects localhost/private-range hosts, fetches
with a 10s timeout, returns `{ ics }` text or a typed error. Nothing is stored
server-side; the URL lives in the persisted zustand store (localStorage), same trust
level as the existing API key.

### Store additions (`useStore`)

- `gcalIcsUrl: string | null` + `setGcalIcsUrl`
- `icsCache: { fetchedAt: string; events: ICalEvent[] } | null` + setter — persisted
  so the calendar renders instantly offline; hook refreshes when stale (>5 min).
- Existing `gcalApiKey`/`gcalCalendarId`/`icalEvents` (manual import) stay; all three
  sources merge in the hook.

### Calendar page

- Route `app/calendar/page.tsx`, nav entry "Calendar" (CalendarDays icon) after Tasks
  in `Sidebar.tsx` and `MobileNav.tsx`.
- **Month view**: 6×7 CSS grid, item chips (truncated), "+N more" overflow, today
  highlighted, prev/today/next + view toggle header. **Week view**: 7 columns with
  all-day row on top and timed events listed chronologically (no hour-axis grid —
  agenda-per-day keeps it readable and cheap).
- **Quick-add**: clicking a day opens an inline composer (title → `addQuest` with that
  `due_date`, default pillar `work`, difficulty MED).
- **Reschedule**: dnd-kit drag of task chips between day cells → `updateQuest` (new
  store patch action if none exists) sets `due_date`. Only tasks drag; gcal/goal/habit
  chips don't.
- **Item click**: popover with details; tasks get Complete (existing `completeQuest`,
  XP/confetti as normal) and Go-to-Tasks; gcal events show time/location.
- Styling follows the HUD system (HUDPanel, accent tokens, framer-motion fades).

### Dashboard widget

`GoogleCalendarWidget` is refactored onto `useCalendarData` (so tasks/goals/habits
appear too), gets a 7-day mini strip with per-day dots, and an "Open Calendar →"
footer link. Widget id stays `gcalendar` so saved layouts don't break; label becomes
"Calendar".

### Settings

The Google Calendar section leads with the simple path: paste the secret iCal address
(with click-path instructions: Google Calendar → Settings → your calendar →
"Integrate calendar" → *Secret address in iCal format*), Test + Save buttons hitting
the proxy. The API-key block remains as a collapsed "Advanced" alternative.

## Error handling

- Proxy: bad URL → 400 with message surfaced in Settings test button and as a quiet
  banner on the calendar; fetch failure → stale cache keeps rendering with a
  "last synced X ago" note.
- RRULE parse failure on an event → that event renders as single occurrence (no crash).
- Empty states: no sources configured → calendar still works for tasks/goals/habits,
  with a one-line hint linking to Settings.

## Testing

Jest, matching `src/lib/__tests__` style:

- `calendarEvents.test.ts` — RRULE expansion (weekly BYDAY across a month, UNTIL,
  COUNT, EXDATE skip), all-day vs timed bucketing, task/goal/habit → item mapping,
  range filtering, overdue flagging.
- `icalParser.test.ts` — EXDATE capture (new), existing parse behavior unchanged.
- Route validation unit-tested via exported helper (https-only, private-host block).
- End-to-end: browser verification against a public Google holiday ICS feed.

## Out of scope (YAGNI)

Creating/editing Google events (needs OAuth), hour-axis week grid, multiple ICS feeds,
RECURRENCE-ID overrides, timezone selection (local time assumed), Supabase sync of new
fields beyond what `persist` already covers.
