'use client';

// Calendar widget (id `gcalendar`) — at-a-glance week strip + today/tomorrow
// agenda on the dashboard. All data comes from useCalendarData, the same
// source as the full /calendar page this widget links to. Google events are
// read-only; the secret iCal URL is configured in Settings.

import { useMemo, useRef } from 'react';
import Link from 'next/link';
import { useStore } from '@/stores/useStore';
import { useCalendarData } from '@/hooks/useCalendarData';
import { CalendarItem, dateKey } from '@/lib/calendarEvents';
import { parseICalFile, getCalendarName } from '@/lib/icalParser';
import HUDPanel from '@/components/hud/HUDPanel';
import {
  Calendar, CalendarDays, Clock, RefreshCw, AlertCircle, ArrowRight,
  Upload, Target, Repeat, MapPin,
} from 'lucide-react';
import { format, addDays, startOfDay, parseISO, isToday } from 'date-fns';
import { PILLAR_CONFIG } from '@/lib/types';

function dotColor(item: CalendarItem): string {
  if (item.source === 'gcal') return 'var(--color-purple)';
  if (item.source === 'goal') return 'var(--color-warning)';
  if (item.source === 'habit') return 'var(--color-text-placeholder)';
  return item.pillar ? PILLAR_CONFIG[item.pillar].color : 'var(--color-accent)';
}

function RowIcon({ item }: { item: CalendarItem }) {
  if (item.source === 'gcal') return <CalendarDays size={10} className="text-purple flex-shrink-0" />;
  if (item.source === 'goal') return <Target size={10} className="text-warning flex-shrink-0" />;
  if (item.source === 'habit') return <Repeat size={10} className="text-text-placeholder flex-shrink-0" />;
  return <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor(item) }} />;
}

function AgendaRow({ item }: { item: CalendarItem }) {
  const time = !item.allDay && item.start ? format(parseISO(item.start), 'h:mm a') : null;
  return (
    <Link
      href="/calendar"
      className="flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] px-2 py-1.5 hover:bg-[rgba(255,255,255,0.05)] transition-colors"
    >
      <RowIcon item={item} />
      <span className={`flex-1 truncate text-xs ${item.completed ? 'line-through text-text-placeholder' : 'text-text-primary'}`}>
        {item.title}
      </span>
      {time && (
        <span className="flex items-center gap-1 text-[10px] text-text-tertiary flex-shrink-0">
          <Clock size={9} />{time}
        </span>
      )}
      {item.location && (
        <span className="hidden sm:flex items-center gap-1 text-[10px] text-text-placeholder flex-shrink-0 max-w-[90px] truncate">
          <MapPin size={9} />{item.location}
        </span>
      )}
    </Link>
  );
}

export default function GoogleCalendarWidget() {
  const setIcalEvents = useStore((s) => s.setIcalEvents);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const range = useMemo(() => {
    const start = startOfDay(new Date());
    return { start, end: addDays(start, 6) };
  }, []);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(range.start, i)),
    [range]
  );

  const { buckets, loading, error, refresh, hasEventSource } =
    useCalendarData(range.start, range.end);

  const todayKey = dateKey(range.start);
  const tomorrowKey = dateKey(addDays(range.start, 1));
  const todayItems = buckets[todayKey] ?? [];
  const tomorrowItems = buckets[tomorrowKey] ?? [];
  const total = Object.values(buckets).reduce((n, list) => n + list.length, 0);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const content = ev.target?.result as string;
        const parsed = parseICalFile(content);
        if (parsed.length > 0) {
          setIcalEvents(parsed, getCalendarName(content) || file.name.replace(/\.ics$/i, ''));
        }
      } catch {
        /* surfaced by the page's error state on next sync */
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <HUDPanel delay={2}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-accent drop-shadow-[0_0_6px_rgba(200,200,200,0.3)]" />
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Calendar</h2>
          {total > 0 && <span className="text-[10px] text-text-placeholder tabular-nums">{total}</span>}
          {loading && <RefreshCw size={10} className="animate-spin text-text-placeholder" />}
        </div>
        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".ics,.ical,text/calendar"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-text-placeholder hover:text-accent hover:bg-accent-dim/40 transition-all cursor-pointer text-[10px]"
            title="Import .ics file"
          >
            <Upload size={11} />
          </button>
          <button
            onClick={refresh}
            className="px-1.5 py-0.5 rounded-md text-text-placeholder hover:text-accent hover:bg-accent-dim/40 transition-all text-[10px]"
            title="Refresh"
          >
            <RefreshCw size={11} />
          </button>
          <Link
            href="/calendar"
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-text-tertiary hover:text-accent hover:bg-accent-dim/40 transition-all"
          >
            Open <ArrowRight size={10} />
          </Link>
        </div>
      </div>

      {/* 7-day strip */}
      <Link href="/calendar" className="grid grid-cols-7 gap-1 mb-3">
        {days.map((day) => {
          const items = buckets[dateKey(day)] ?? [];
          const today = isToday(day);
          return (
            <div
              key={dateKey(day)}
              className={`flex flex-col items-center gap-1 rounded-lg border py-1.5 transition-colors hover:bg-[rgba(255,255,255,0.04)] ${
                today ? 'border-accent/25 bg-accent-dim/30' : 'border-[rgba(255,255,255,0.04)]'
              }`}
            >
              <span className="text-[9px] uppercase text-text-placeholder">{format(day, 'EEEEE')}</span>
              <span className={`text-xs font-medium tabular-nums ${today ? 'text-accent' : 'text-text-secondary'}`}>
                {format(day, 'd')}
              </span>
              <span className="flex gap-0.5 h-1.5 items-center">
                {items.slice(0, 3).map((item) => (
                  <span key={item.id} className="w-1 h-1 rounded-full" style={{ background: dotColor(item) }} />
                ))}
                {items.length > 3 && <span className="text-[8px] text-text-placeholder leading-none">+</span>}
              </span>
            </div>
          );
        })}
      </Link>

      {error && (
        <div className="flex items-center gap-1.5 mb-2 text-[10px] text-warning">
          <AlertCircle size={10} /> {error}
        </div>
      )}

      {!hasEventSource && total === 0 ? (
        <div className="text-center py-4">
          <p className="text-xs text-text-tertiary mb-1">No events yet.</p>
          <p className="text-[11px] text-text-placeholder">
            <Link href="/settings" className="text-accent hover:underline">Link Google Calendar</Link>
            {' '}or import an .ics file.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {todayItems.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-text-placeholder uppercase tracking-widest mb-1.5">Today</div>
              <div className="flex flex-col gap-1">
                {todayItems.slice(0, 5).map((item) => <AgendaRow key={item.id} item={item} />)}
                {todayItems.length > 5 && (
                  <Link href="/calendar" className="text-[10px] text-text-placeholder hover:text-accent px-1">
                    +{todayItems.length - 5} more today
                  </Link>
                )}
              </div>
            </div>
          )}
          {tomorrowItems.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold text-text-placeholder uppercase tracking-widest mb-1.5">Tomorrow</div>
              <div className="flex flex-col gap-1">
                {tomorrowItems.slice(0, 3).map((item) => <AgendaRow key={item.id} item={item} />)}
              </div>
            </div>
          )}
          {todayItems.length === 0 && tomorrowItems.length === 0 && (
            <p className="text-xs text-text-placeholder text-center py-2">Nothing today or tomorrow.</p>
          )}
        </div>
      )}
    </HUDPanel>
  );
}
