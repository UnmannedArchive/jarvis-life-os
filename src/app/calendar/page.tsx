'use client';

// Calendar — month/week grid for Google events (read-only) plus Life OS
// tasks, goal milestones, and habit schedules. Tasks can be added on a day
// and dragged between days; everything else is passive. Data comes from
// useCalendarData (see the 2026-06-10 design doc).

import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/stores/useStore';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useWhoopData } from '@/hooks/useWhoopData';
import { buildDaySignals } from '@/lib/whoop/optimize';
import { recoveryColor } from '@/lib/whoop/insights';
import { CalendarItem, dateKey } from '@/lib/calendarEvents';
import { estimateXP } from '@/lib/xpAI';
import { PILLAR_CONFIG } from '@/lib/types';
import HUDPanel from '@/components/hud/HUDPanel';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Plus, X, Check, Clock, MapPin,
  CalendarDays, Target, Repeat, RefreshCw, AlertCircle, ArrowRight,
} from 'lucide-react';
import {
  format, addMonths, addWeeks, startOfMonth, endOfMonth, startOfWeek,
  endOfWeek, eachDayOfInterval, isSameMonth, isToday, parseISO,
  formatDistanceToNow,
} from 'date-fns';
import Link from 'next/link';

type ViewMode = 'month' | 'week';

// --- item styling -----------------------------------------------------------

function chipClasses(item: CalendarItem): string {
  if (item.source === 'gcal') return 'bg-purple/15 text-text-secondary border-purple/20';
  if (item.source === 'goal') return 'bg-warning-dim text-warning border-warning/20';
  if (item.source === 'habit') return 'bg-[rgba(255,255,255,0.03)] text-text-tertiary border-transparent';
  return item.completed
    ? 'bg-[rgba(255,255,255,0.02)] text-text-placeholder line-through border-transparent'
    : 'bg-accent-dim text-text-primary border-accent/20';
}

function SourceIcon({ item, size = 10 }: { item: CalendarItem; size?: number }) {
  if (item.source === 'gcal') return <CalendarDays size={size} className="flex-shrink-0 text-purple" />;
  if (item.source === 'goal') return <Target size={size} className="flex-shrink-0 text-warning" />;
  if (item.source === 'habit') return <Repeat size={size} className="flex-shrink-0 text-text-placeholder" />;
  return (
    <span
      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: item.pillar ? PILLAR_CONFIG[item.pillar].color : 'var(--color-accent)' }}
    />
  );
}

function timeLabel(item: CalendarItem): string | null {
  if (item.allDay || !item.start) return null;
  return format(parseISO(item.start), 'h:mm a');
}

// --- chips & cells ----------------------------------------------------------

function ItemChip({ item, compact, onOpen }: {
  item: CalendarItem;
  compact?: boolean;
  onOpen: (item: CalendarItem) => void;
}) {
  const draggable = item.source === 'task' && !item.completed;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { questId: item.refId },
    disabled: !draggable,
  });
  const time = timeLabel(item);
  return (
    <button
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); onOpen(item); }}
      className={`w-full flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-left transition-colors hover:brightness-125 ${chipClasses(item)} ${isDragging ? 'opacity-30' : ''} ${draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
    >
      <SourceIcon item={item} />
      <span className={`truncate ${compact ? 'text-[11px]' : 'text-xs'}`}>
        {time && <span className="text-text-placeholder mr-1">{time}</span>}
        {item.title}
      </span>
    </button>
  );
}

const MAX_CHIPS_MONTH = 4;

/** Small WHOOP recovery indicator shown in a calendar day's header. */
function RecoveryDot({ score }: { score: number }) {
  const c = recoveryColor(score);
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[9px] font-semibold tabular-nums"
      style={{ color: c }}
      title={`WHOOP recovery ${score}%`}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
      {score}
    </span>
  );
}

function DayCell({ day, monthAnchor, items, recovery, onOpenDay, onOpenItem }: {
  day: Date;
  monthAnchor: Date;
  items: CalendarItem[];
  recovery?: number;
  onOpenDay: (key: string) => void;
  onOpenItem: (item: CalendarItem) => void;
}) {
  const key = dateKey(day);
  const { setNodeRef, isOver } = useDroppable({ id: `day:${key}` });
  const inMonth = isSameMonth(day, monthAnchor);
  const today = isToday(day);
  const overflow = items.length - MAX_CHIPS_MONTH;
  return (
    <div
      ref={setNodeRef}
      onClick={() => onOpenDay(key)}
      className={`min-h-[112px] md:min-h-[140px] rounded-xl border p-2 flex flex-col gap-1 cursor-pointer transition-colors ${
        isOver
          ? 'border-accent/40 bg-accent-dim'
          : today
            ? 'border-accent/25 bg-[rgba(255,255,255,0.03)]'
            : 'border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.01)] hover:bg-[rgba(255,255,255,0.03)]'
      } ${inMonth ? '' : 'opacity-35'}`}
    >
      <div className="flex items-center justify-between px-1">
        <span className={`text-[13px] font-medium ${today ? 'text-accent' : 'text-text-tertiary'}`}>
          {format(day, 'd')}
        </span>
        {recovery !== undefined && <RecoveryDot score={recovery} />}
      </div>
      {items.slice(0, MAX_CHIPS_MONTH).map((item) => (
        <ItemChip key={item.id} item={item} compact onOpen={onOpenItem} />
      ))}
      {overflow > 0 && (
        <span className="text-[10px] text-text-placeholder px-1">+{overflow} more</span>
      )}
    </div>
  );
}

function WeekColumn({ day, items, recovery, onOpenDay, onOpenItem }: {
  day: Date;
  items: CalendarItem[];
  recovery?: number;
  onOpenDay: (key: string) => void;
  onOpenItem: (item: CalendarItem) => void;
}) {
  const key = dateKey(day);
  const { setNodeRef, isOver } = useDroppable({ id: `day:${key}` });
  const today = isToday(day);
  return (
    <div
      ref={setNodeRef}
      onClick={() => onOpenDay(key)}
      className={`rounded-xl border p-2 flex flex-col gap-1.5 min-h-[200px] cursor-pointer transition-colors ${
        isOver ? 'border-accent/40 bg-accent-dim' : today ? 'border-accent/25 bg-[rgba(255,255,255,0.03)]' : 'border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.01)]'
      }`}
    >
      <div className={`flex items-center justify-between pb-1 border-b border-border/40 ${today ? 'text-accent' : 'text-text-tertiary'}`}>
        <span className="text-[11px] font-semibold uppercase tracking-wider">{format(day, 'EEE d')}</span>
        {recovery !== undefined && <RecoveryDot score={recovery} />}
      </div>
      {items.length === 0 && <span className="text-[10px] text-text-placeholder">—</span>}
      {items.map((item) => (
        <ItemChip key={item.id} item={item} onOpen={onOpenItem} />
      ))}
    </div>
  );
}

// --- modals -----------------------------------------------------------------

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 8 }}
        className="glass-card rounded-2xl w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function ItemDetail({ item, onClose }: { item: CalendarItem; onClose: () => void }) {
  const completeQuest = useStore((s) => s.completeQuest);
  const time = timeLabel(item);
  const endTime = !item.allDay && item.end ? format(parseISO(item.end), 'h:mm a') : null;
  return (
    <Overlay onClose={onClose}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <SourceIcon item={item} size={14} />
          <h3 className={`text-base font-semibold truncate ${item.completed ? 'line-through text-text-placeholder' : 'text-text-primary'}`}>
            {item.title}
          </h3>
        </div>
        <button onClick={onClose} className="text-text-placeholder hover:text-text-primary"><X size={16} /></button>
      </div>
      <div className="space-y-1.5 text-xs text-text-tertiary mb-4">
        <div className="flex items-center gap-1.5">
          <Clock size={11} />
          {format(parseISO(item.date), 'EEEE, MMM d')}
          {time && <span>· {time}{endTime ? ` – ${endTime}` : ''}</span>}
        </div>
        {item.location && (
          <div className="flex items-center gap-1.5"><MapPin size={11} />{item.location}</div>
        )}
        {item.source === 'gcal' && <div className="text-text-placeholder">Google Calendar · read-only</div>}
        {item.source === 'habit' && <div className="text-text-placeholder">Recurring habit schedule</div>}
        {item.source === 'goal' && <div className="text-text-placeholder">Goal target date</div>}
      </div>
      <div className="flex gap-2">
        {item.source === 'task' && !item.completed && (
          <button
            onClick={() => { completeQuest(item.refId); onClose(); }}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-accent-dim border border-accent/25 px-3 py-2 text-sm text-text-primary hover:bg-accent/20 transition-colors"
          >
            <Check size={14} /> Complete
          </button>
        )}
        {item.source === 'task' && (
          <Link href="/quests" className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
            Open Tasks <ArrowRight size={13} />
          </Link>
        )}
        {item.source === 'goal' && (
          <Link href="/goals" className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
            Open Goals <ArrowRight size={13} />
          </Link>
        )}
      </div>
    </Overlay>
  );
}

function DayDetail({ dayKey, items, onClose, onOpenItem }: {
  dayKey: string;
  items: CalendarItem[];
  onClose: () => void;
  onOpenItem: (item: CalendarItem) => void;
}) {
  const addQuest = useStore((s) => s.addQuest);
  const [title, setTitle] = useState('');
  const day = parseISO(dayKey);

  const handleAdd = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const est = estimateXP(trimmed, null, 'work', 'side');
    addQuest({
      title: trimmed, description: null, pillar: 'work',
      difficulty: est.difficulty, xp_reward: est.xp, quest_type: 'side',
      is_recurring: false, recurrence_rule: null, due_date: dayKey,
    });
    setTitle('');
  };

  return (
    <Overlay onClose={onClose}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-text-primary">{format(day, 'EEEE, MMM d')}</h3>
        <button onClick={onClose} className="text-text-placeholder hover:text-text-primary"><X size={16} /></button>
      </div>
      <div className="space-y-1.5 max-h-72 overflow-y-auto mb-4">
        {items.length === 0 && <p className="text-xs text-text-placeholder">Nothing scheduled.</p>}
        {items.map((item) => (
          <ItemChip key={item.id} item={item} onOpen={onOpenItem} />
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add a task due this day…"
          className="flex-1 rounded-xl bg-[rgba(255,255,255,0.04)] border border-border px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-accent/40"
        />
        <button
          onClick={handleAdd}
          disabled={!title.trim()}
          className="rounded-xl border border-accent/25 bg-accent-dim px-3 py-2 text-text-primary disabled:opacity-40 hover:bg-accent/20 transition-colors"
        >
          <Plus size={15} />
        </button>
      </div>
    </Overlay>
  );
}

// --- page -------------------------------------------------------------------

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [openItem, setOpenItem] = useState<CalendarItem | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<CalendarItem | null>(null);

  const updateQuestDueDate = useStore((s) => s.updateQuestDueDate);
  const gcalIcsUrl = useStore((s) => s.gcalIcsUrl);

  const range = useMemo(() => {
    if (view === 'month') {
      return {
        start: startOfWeek(startOfMonth(anchor)),
        end: endOfWeek(endOfMonth(anchor)),
      };
    }
    return { start: startOfWeek(anchor), end: endOfWeek(anchor) };
  }, [view, anchor]);

  const days = useMemo(
    () => eachDayOfInterval({ start: range.start, end: range.end }),
    [range]
  );

  const { buckets, loading, error, lastSynced, refresh, hasEventSource } =
    useCalendarData(range.start, range.end);

  // WHOOP recovery overlay: tint each day with its recovery score.
  const { week: whoopWeek } = useWhoopData();
  const recoveryByDay = useMemo(() => {
    const map: Record<string, number> = {};
    if (whoopWeek) {
      for (const s of buildDaySignals(whoopWeek.recovery, [], {})) {
        if (s.recovery !== null) map[s.date] = s.recovery;
      }
    }
    return map;
  }, [whoopWeek]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const allItems = useMemo(() => Object.values(buckets).flat(), [buckets]);

  const handleDragStart = (e: DragStartEvent) => {
    setDragItem(allItems.find((i) => i.id === e.active.id) ?? null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setDragItem(null);
    const overId = e.over?.id;
    const questId = e.active.data.current?.questId as string | undefined;
    if (!overId || !questId || !String(overId).startsWith('day:')) return;
    updateQuestDueDate(questId, String(overId).slice(4));
  };

  const navigate = (dir: -1 | 1) =>
    setAnchor((a) => (view === 'month' ? addMonths(a, dir) : addWeeks(a, dir)));

  return (
    <div className="p-4 md:p-6 max-w-[1500px] mx-auto space-y-4">
      <HUDPanel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-text-primary">
              {view === 'month'
                ? format(anchor, 'MMMM yyyy')
                : `${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d, yyyy')}`}
            </h1>
            {loading && <RefreshCw size={13} className="animate-spin text-text-placeholder" />}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(['month', 'week'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-xs capitalize transition-colors ${view === v ? 'bg-accent-dim text-text-primary' : 'text-text-tertiary hover:text-text-primary'}`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button onClick={() => navigate(-1)} aria-label="Previous" className="rounded-lg border border-border p-1.5 text-text-tertiary hover:text-text-primary transition-colors"><ChevronLeft size={14} /></button>
            <button onClick={() => setAnchor(new Date())} className="rounded-lg border border-border px-3 py-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors">Today</button>
            <button onClick={() => navigate(1)} aria-label="Next" className="rounded-lg border border-border p-1.5 text-text-tertiary hover:text-text-primary transition-colors"><ChevronRight size={14} /></button>
            <button onClick={refresh} aria-label="Refresh" className="rounded-lg border border-border p-1.5 text-text-tertiary hover:text-text-primary transition-colors"><RefreshCw size={14} /></button>
          </div>
        </div>
        {(error || (!hasEventSource && !gcalIcsUrl)) && (
          <div className="mt-3 flex items-center gap-2 text-[11px]">
            {error ? (
              <>
                <AlertCircle size={12} className="text-warning" />
                <span className="text-warning">{error}</span>
                {lastSynced && (
                  <span className="text-text-placeholder">
                    · showing events from {formatDistanceToNow(parseISO(lastSynced), { addSuffix: true })}
                  </span>
                )}
              </>
            ) : (
              <span className="text-text-placeholder">
                Tasks, goals & habits only —{' '}
                <Link href="/settings" className="text-accent hover:underline">link Google Calendar in Settings</Link>{' '}
                to see your events here.
              </span>
            )}
          </div>
        )}
      </HUDPanel>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <HUDPanel noPadding className="p-2 md:p-3">
          {view === 'month' ? (
            <>
              <div className="grid grid-cols-7 gap-1 md:gap-1.5 mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <div key={d} className="text-center text-[11px] uppercase tracking-wider text-text-placeholder py-1.5">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 md:gap-1.5">
                {days.map((day) => (
                  <DayCell
                    key={dateKey(day)}
                    day={day}
                    monthAnchor={anchor}
                    items={buckets[dateKey(day)] ?? []}
                    recovery={recoveryByDay[dateKey(day)]}
                    onOpenDay={setOpenDay}
                    onOpenItem={setOpenItem}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-1.5">
              {days.map((day) => (
                <WeekColumn
                  key={dateKey(day)}
                  day={day}
                  items={buckets[dateKey(day)] ?? []}
                  recovery={recoveryByDay[dateKey(day)]}
                  onOpenDay={setOpenDay}
                  onOpenItem={setOpenItem}
                />
              ))}
            </div>
          )}
        </HUDPanel>
        <DragOverlay>
          {dragItem && (
            <div className={`flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] shadow-xl ${chipClasses(dragItem)}`}>
              <SourceIcon item={dragItem} />
              <span className="truncate max-w-[160px]">{dragItem.title}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <div className="flex flex-wrap items-center gap-4 px-1 text-[10px] text-text-placeholder">
        <span className="flex items-center gap-1.5"><CalendarDays size={10} className="text-purple" /> Google event</span>
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" /> Task</span>
        <span className="flex items-center gap-1.5"><Target size={10} className="text-warning" /> Goal target</span>
        <span className="flex items-center gap-1.5"><Repeat size={10} /> Habit</span>
        {lastSynced && !error && (
          <span className="ml-auto">synced {formatDistanceToNow(parseISO(lastSynced), { addSuffix: true })}</span>
        )}
      </div>

      <AnimatePresence>
        {openItem && <ItemDetail item={openItem} onClose={() => setOpenItem(null)} />}
        {openDay && !openItem && (
          <DayDetail
            dayKey={openDay}
            items={buckets[openDay] ?? []}
            onClose={() => setOpenDay(null)}
            onOpenItem={(item) => setOpenItem(item)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
