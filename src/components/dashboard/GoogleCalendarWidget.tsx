'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useStore } from '@/stores/useStore';
import { parseICalFile, getCalendarName, ICalEvent } from '@/lib/icalParser';
import HUDPanel from '@/components/hud/HUDPanel';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, MapPin, ExternalLink, RefreshCw, AlertCircle,
  ArrowRight, Upload, FileText, X, Trash2, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  format, isToday, isTomorrow, parseISO, differenceInMinutes,
  isBefore, addDays, startOfDay, isAfter,
} from 'date-fns';

interface CalEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
  allDay: boolean;
  color?: string;
  htmlLink?: string;
  source: 'gcal' | 'ical';
}

function parseGCalEvents(items: any[]): CalEvent[] {
  return items
    .filter((item: any) => item.status !== 'cancelled')
    .map((item: any) => {
      const allDay = !!item.start?.date;
      return {
        id: item.id,
        summary: item.summary || '(No title)',
        start: allDay ? item.start.date : item.start.dateTime,
        end: allDay ? item.end.date : item.end.dateTime,
        location: item.location || undefined,
        allDay,
        htmlLink: item.htmlLink,
        source: 'gcal' as const,
      };
    });
}

function icalToCalEvents(icalEvents: ICalEvent[]): CalEvent[] {
  return icalEvents.map((ev) => ({
    id: ev.uid,
    summary: ev.summary,
    start: ev.start,
    end: ev.end,
    location: ev.location || undefined,
    description: ev.description || undefined,
    allDay: ev.allDay,
    source: 'ical' as const,
  }));
}

function EventCard({ event }: { event: CalEvent }) {
  const [showDetail, setShowDetail] = useState(false);
  const startDate = parseISO(event.start);
  const endDate = parseISO(event.end);
  const now = new Date();
  const isNow = !event.allDay && isBefore(startDate, now) && isBefore(now, endDate);
  const isPast = isBefore(endDate, now);
  const minsUntil = differenceInMinutes(startDate, now);

  let timeLabel: string;
  if (event.allDay) {
    timeLabel = 'All day';
  } else {
    timeLabel = `${format(startDate, 'h:mm a')} – ${format(endDate, 'h:mm a')}`;
  }

  let urgencyLabel: string | null = null;
  if (isNow) urgencyLabel = 'Now';
  else if (minsUntil > 0 && minsUntil <= 60) urgencyLabel = `In ${minsUntil}m`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border transition-all cursor-pointer ${
        isNow
          ? 'border-accent/25 bg-accent-dim/40'
          : isPast
            ? 'border-[rgba(255,255,255,0.02)] bg-[rgba(0,0,0,0.3)] opacity-40'
            : 'border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)]'
      }`}
      onClick={() => setShowDetail(!showDetail)}
    >
      <div className="flex gap-3 p-3">
        <div className={`w-1 rounded-full flex-shrink-0 ${
          isNow ? 'bg-accent shadow-[0_0_6px_rgba(200,200,200,0.4)]' : isPast ? 'bg-text-placeholder' : event.source === 'ical' ? 'bg-warning' : 'bg-purple'
        }`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-sm font-medium truncate ${isPast ? 'text-text-placeholder line-through' : 'text-text-primary'}`}>
              {event.summary}
            </span>
            {urgencyLabel && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                isNow ? 'bg-accent/20 text-accent' : 'bg-warning-dim text-warning'
              }`}>
                {urgencyLabel}
              </span>
            )}
            {event.source === 'ical' && (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-warning/10 text-warning/70 flex-shrink-0">
                iCal
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-text-tertiary">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {timeLabel}
            </span>
            {event.location && (
              <span className="flex items-center gap-1 truncate">
                <MapPin size={10} />
                {event.location}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {event.htmlLink && (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-placeholder hover:text-accent transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={12} />
            </a>
          )}
          {showDetail ? (
            <ChevronUp size={10} className="text-text-placeholder" />
          ) : (
            <ChevronDown size={10} className="text-text-placeholder" />
          )}
        </div>
      </div>

      <AnimatePresence>
        {showDetail && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-0 border-t border-border/30 mx-3 mt-0">
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <div className="text-[9px] text-text-placeholder uppercase tracking-wider mb-0.5">Start</div>
                  <div className="text-[11px] text-text-secondary tabular-nums">
                    {event.allDay ? format(parseISO(event.start), 'MMM d, yyyy') : format(parseISO(event.start), 'MMM d, h:mm a')}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-text-placeholder uppercase tracking-wider mb-0.5">End</div>
                  <div className="text-[11px] text-text-secondary tabular-nums">
                    {event.allDay ? format(parseISO(event.end), 'MMM d, yyyy') : format(parseISO(event.end), 'MMM d, h:mm a')}
                  </div>
                </div>
                {event.location && (
                  <div className="col-span-2">
                    <div className="text-[9px] text-text-placeholder uppercase tracking-wider mb-0.5">Location</div>
                    <div className="text-[11px] text-text-secondary">{event.location}</div>
                  </div>
                )}
                {event.description && (
                  <div className="col-span-2">
                    <div className="text-[9px] text-text-placeholder uppercase tracking-wider mb-0.5">Description</div>
                    <div className="text-[11px] text-text-tertiary leading-relaxed line-clamp-3 whitespace-pre-line">
                      {event.description}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SetupPrompt() {
  return (
    <div className="text-center py-4">
      <Calendar size={24} className="mx-auto mb-2 text-text-placeholder opacity-30" />
      <p className="text-xs text-text-tertiary mb-1">No calendar connected</p>
      <p className="text-[10px] text-text-placeholder mb-3">
        Import an .ics file or connect Google Calendar in Settings.
      </p>
      <a href="/settings" className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors">
        Go to Settings <ArrowRight size={12} />
      </a>
    </div>
  );
}

export default function GoogleCalendarWidget() {
  const apiKey = useStore((s) => s.gcalApiKey);
  const calendarId = useStore((s) => s.gcalCalendarId);
  const icalEvents = useStore((s) => s.icalEvents);
  const icalSourceName = useStore((s) => s.icalSourceName);
  const setIcalEvents = useStore((s) => s.setIcalEvents);
  const clearIcalEvents = useStore((s) => s.clearIcalEvents);
  const [gcalEvents, setGcalEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGCalConfigured = !!(apiKey && calendarId);
  const hasIcal = icalEvents.length > 0;
  const hasAnySource = isGCalConfigured || hasIcal;

  const fetchGCalEvents = async () => {
    if (!apiKey || !calendarId) return;
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const timeMin = startOfDay(now).toISOString();
      const timeMax = addDays(startOfDay(now), 7).toISOString();
      const encodedCalId = encodeURIComponent(calendarId);
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodedCalId}/events?` +
        `key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=30`;

      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || `API error (${res.status})`);
      }
      const data = await res.json();
      setGcalEvents(parseGCalEvents(data.items || []));
      setLastFetch(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isGCalConfigured) fetchGCalEvents();
  }, [apiKey, calendarId]);

  useEffect(() => {
    if (!isGCalConfigured) return;
    const interval = setInterval(fetchGCalEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [apiKey, calendarId]);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        const parsed = parseICalFile(content);
        if (parsed.length === 0) {
          setImportError('No events found in this file.');
          return;
        }
        const calName = getCalendarName(content) || file.name.replace(/\.ics$/i, '');
        setIcalEvents(parsed, calName);
      } catch {
        setImportError('Failed to parse .ics file. Make sure it\'s a valid iCal file.');
      }
    };
    reader.onerror = () => setImportError('Failed to read file.');
    reader.readAsText(file);

    e.target.value = '';
  };

  // Merge all events, filter to relevant window, sort
  const allEvents = useMemo(() => {
    const icalConverted = icalToCalEvents(icalEvents);
    const merged = [...gcalEvents, ...icalConverted];

    const now = new Date();
    const windowStart = startOfDay(now);
    const windowEnd = addDays(windowStart, 7);

    return merged
      .filter((ev) => {
        const evEnd = parseISO(ev.end);
        const evStart = parseISO(ev.start);
        return isAfter(evEnd, windowStart) && isBefore(evStart, windowEnd);
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [gcalEvents, icalEvents]);

  const grouped = useMemo(() => {
    const today: CalEvent[] = [];
    const tomorrow: CalEvent[] = [];
    const later: CalEvent[] = [];

    for (const ev of allEvents) {
      const d = parseISO(ev.start);
      if (isToday(d)) today.push(ev);
      else if (isTomorrow(d)) tomorrow.push(ev);
      else later.push(ev);
    }

    return { today, tomorrow, later };
  }, [allEvents]);

  return (
    <HUDPanel delay={2}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-accent drop-shadow-[0_0_6px_rgba(200,200,200,0.3)]" />
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Calendar</h2>
          {allEvents.length > 0 && (
            <span className="text-[10px] text-text-placeholder tabular-nums">{allEvents.length}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Import .ics button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics,.ical,text/calendar"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-text-placeholder
              hover:text-accent hover:bg-accent-dim/40 transition-all cursor-pointer text-[10px]"
            title="Import .ics file"
          >
            <Upload size={11} />
            <span className="hidden sm:inline">.ics</span>
          </button>

          {isGCalConfigured && (
            <>
              {lastFetch && (
                <span className="text-[10px] text-text-placeholder">
                  {format(lastFetch, 'h:mm a')}
                </span>
              )}
              <button
                onClick={fetchGCalEvents}
                disabled={loading}
                className="text-text-placeholder hover:text-accent transition-colors cursor-pointer disabled:opacity-30"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* iCal source info */}
      {hasIcal && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/5 border border-warning/10 mb-3">
          <FileText size={12} className="text-warning flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] text-text-secondary truncate block">
              {icalSourceName || 'Imported calendar'}
            </span>
            <span className="text-[10px] text-text-placeholder">{icalEvents.length} events imported</span>
          </div>
          <button
            onClick={clearIcalEvents}
            className="text-text-placeholder hover:text-danger transition-colors cursor-pointer flex-shrink-0"
            title="Remove imported calendar"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}

      {importError && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-danger-dim border border-danger/20 mb-3">
          <AlertCircle size={13} className="text-danger flex-shrink-0" />
          <span className="text-[11px] text-danger">{importError}</span>
          <button onClick={() => setImportError(null)} className="ml-auto text-danger/50 hover:text-danger cursor-pointer">
            <X size={10} />
          </button>
        </div>
      )}

      {!hasAnySource && <SetupPrompt />}

      {isGCalConfigured && error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-danger-dim border border-danger/20 mb-3">
          <AlertCircle size={14} className="text-danger flex-shrink-0" />
          <div>
            <div className="text-xs font-medium text-danger">Google Calendar error</div>
            <div className="text-[10px] text-text-tertiary mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {hasAnySource && allEvents.length === 0 && !loading && !error && (
        <div className="text-center py-6">
          <Calendar size={24} className="mx-auto mb-2 text-text-placeholder opacity-30" />
          <p className="text-xs text-text-placeholder">No events in the next 7 days</p>
        </div>
      )}

      {allEvents.length > 0 && (
        <div className="flex flex-col gap-3">
          {grouped.today.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-text-placeholder uppercase tracking-widest mb-1.5">
                Today · {grouped.today.length}
              </div>
              <div className="flex flex-col gap-1.5">
                {grouped.today.map((ev) => <EventCard key={ev.id} event={ev} />)}
              </div>
            </div>
          )}

          {grouped.tomorrow.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-text-placeholder uppercase tracking-widest mb-1.5">
                Tomorrow · {grouped.tomorrow.length}
              </div>
              <div className="flex flex-col gap-1.5">
                {grouped.tomorrow.map((ev) => <EventCard key={ev.id} event={ev} />)}
              </div>
            </div>
          )}

          {grouped.later.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-text-placeholder uppercase tracking-widest mb-1.5">
                Upcoming · {grouped.later.length}
              </div>
              <div className="flex flex-col gap-1.5">
                {grouped.later.map((ev) => <EventCard key={ev.id} event={ev} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {loading && allEvents.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw size={16} className="animate-spin text-accent" />
        </div>
      )}
    </HUDPanel>
  );
}
