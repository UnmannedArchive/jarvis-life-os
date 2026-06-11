'use client';

// ---------------------------------------------------------------------------
// useCalendarData — single source for everything the calendar UI shows.
//
// Merges four sources into day buckets for a visible date range:
//   1. Google Calendar via secret iCal URL (proxied through /api/calendar/ics,
//      cached in the store so the grid renders instantly and works offline)
//   2. Legacy Google API key + calendar id (kept from the old widget)
//   3. Manually imported .ics events
//   4. Life OS quests / goals / recurring habits
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '@/stores/useStore';
import { parseICalFile, ICalEvent } from '@/lib/icalParser';
import {
  expandICalEvent,
  taskItems,
  goalItems,
  habitItems,
  bucketByDay,
  dateKey,
  CalendarItem,
} from '@/lib/calendarEvents';

const ICS_STALE_MS = 5 * 60 * 1000;

interface GCalApiItem {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
}

/** Map one legacy Google API JSON item onto ICalEvent (singleEvents=true means
 *  the API already expanded recurrences, so no RRULE handling needed). */
function gcalApiItemToICal(item: GCalApiItem): ICalEvent | null {
  if (!item?.id || item.status === 'cancelled') return null;
  const allDay = !!item.start?.date;
  const start = allDay ? item.start?.date : item.start?.dateTime;
  if (!start) return null;
  return {
    uid: item.id,
    summary: item.summary || '(No title)',
    description: item.description ?? null,
    location: item.location ?? null,
    start,
    end: (allDay ? item.end?.date : item.end?.dateTime) || start,
    allDay,
    recurrence: null,
    exdates: [],
    status: item.status ?? null,
    organizer: null,
    created: null,
  };
}

export interface CalendarData {
  /** Items grouped by YYYY-MM-DD, all-day first then by start time. */
  buckets: Record<string, CalendarItem[]>;
  loading: boolean;
  error: string | null;
  /** When the Google feed was last fetched successfully, if ever. */
  lastSynced: string | null;
  refresh: () => void;
  /** True if any Google/iCal source is configured. */
  hasEventSource: boolean;
}

export function useCalendarData(rangeStart: Date, rangeEnd: Date): CalendarData {
  const quests = useStore((s) => s.quests);
  const goals = useStore((s) => s.goals);
  const recurringTasks = useStore((s) => s.recurringTasks);
  const icalEvents = useStore((s) => s.icalEvents);
  const gcalIcsUrl = useStore((s) => s.gcalIcsUrl);
  const icsCache = useStore((s) => s.icsCache);
  const setIcsCache = useStore((s) => s.setIcsCache);
  const gcalApiKey = useStore((s) => s.gcalApiKey);
  const gcalCalendarId = useStore((s) => s.gcalCalendarId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiEvents, setApiEvents] = useState<ICalEvent[]>([]);

  const startKey = dateKey(rangeStart);
  const endKey = dateKey(rangeEnd);

  const fetchIcsFeed = useCallback(
    async (force: boolean) => {
      const url = useStore.getState().gcalIcsUrl;
      if (!url) return;
      const cache = useStore.getState().icsCache;
      if (
        !force &&
        cache &&
        Date.now() - new Date(cache.fetchedAt).getTime() < ICS_STALE_MS
      ) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/calendar/ics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Sync failed (${res.status})`);
        setIcsCache({ fetchedAt: new Date().toISOString(), events: parseICalFile(data.ics) });
      } catch (err) {
        // Keep rendering from the stale cache; just surface the sync problem.
        setError(err instanceof Error ? err.message : 'Calendar sync failed');
      } finally {
        setLoading(false);
      }
    },
    [setIcsCache]
  );

  const fetchLegacyApi = useCallback(async () => {
    const { gcalApiKey: key, gcalCalendarId: calId } = useStore.getState();
    if (!key || !calId) return;
    try {
      const timeMin = new Date(`${startKey}T00:00:00`).toISOString();
      const timeMax = new Date(`${endKey}T23:59:59`).toISOString();
      const url =
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events?` +
        `key=${key}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=250`;
      const res = await fetch(url);
      if (!res.ok) return; // legacy path is best-effort; ICS feed is primary
      const data = await res.json();
      setApiEvents(
        ((data.items as GCalApiItem[]) || [])
          .map(gcalApiItemToICal)
          .filter((e): e is ICalEvent => e !== null)
      );
    } catch {
      /* best-effort */
    }
  }, [startKey, endKey]);

  useEffect(() => {
    fetchIcsFeed(false);
    fetchLegacyApi();
    const interval = setInterval(() => {
      fetchIcsFeed(false);
      fetchLegacyApi();
    }, ICS_STALE_MS);
    return () => clearInterval(interval);
  }, [fetchIcsFeed, fetchLegacyApi, gcalIcsUrl, gcalApiKey, gcalCalendarId]);

  const refresh = useCallback(() => {
    fetchIcsFeed(true);
    fetchLegacyApi();
  }, [fetchIcsFeed, fetchLegacyApi]);

  const buckets = useMemo(() => {
    const feedEvents = icsCache?.events ?? [];
    const expanded: CalendarItem[] = [];
    const seen = new Set<string>();
    for (const ev of [...feedEvents, ...icalEvents, ...apiEvents]) {
      for (const item of expandICalEvent(ev, rangeStart, rangeEnd)) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        expanded.push(item);
      }
    }
    expanded.push(
      ...taskItems(quests, rangeStart, rangeEnd),
      ...goalItems(goals, rangeStart, rangeEnd),
      ...habitItems(recurringTasks, rangeStart, rangeEnd)
    );
    return bucketByDay(expanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [icsCache, icalEvents, apiEvents, quests, goals, recurringTasks, startKey, endKey]);

  return {
    buckets,
    loading,
    error,
    lastSynced: icsCache?.fetchedAt ?? null,
    refresh,
    hasEventSource: !!(gcalIcsUrl || icalEvents.length > 0 || (gcalApiKey && gcalCalendarId)),
  };
}
