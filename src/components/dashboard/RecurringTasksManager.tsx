'use client';

import { useState } from 'react';
import { useStore } from '@/stores/useStore';
import {
  DOW_SHORT,
  DOW_LABELS,
  EVERY_DAY,
  WEEKDAYS,
  describeSchedule,
  normalizeDays,
} from '@/lib/recurring';
import HUDButton from '@/components/hud/HUDButton';
import { Repeat, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

/** Sun-first day toggle strip. Tapping a letter flips that weekday on/off. */
function DayToggles({
  days,
  onChange,
}: {
  days: number[];
  onChange: (days: number[]) => void;
}) {
  const set = new Set(days);
  const toggle = (d: number) => {
    const next = new Set(set);
    if (next.has(d)) next.delete(d);
    else next.add(d);
    onChange(normalizeDays(Array.from(next)));
  };
  return (
    <div className="flex items-center gap-1">
      {DOW_SHORT.map((label, d) => {
        const active = set.has(d);
        return (
          <button
            key={d}
            type="button"
            onClick={() => toggle(d)}
            aria-pressed={active}
            aria-label={DOW_LABELS[d]}
            title={DOW_LABELS[d]}
            className={`w-6 h-6 rounded-md text-[10px] font-semibold transition-all cursor-pointer border ${
              active
                ? 'border-accent bg-accent/20 text-accent shadow-[0_0_6px_rgba(200,200,200,0.15)]'
                : 'border-[rgba(255,255,255,0.08)] text-text-placeholder hover:border-[rgba(255,255,255,0.2)]'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Preset({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[10px] uppercase tracking-wider text-text-placeholder hover:text-accent
        border border-[rgba(255,255,255,0.08)] hover:border-accent/40 rounded-md px-2 py-0.5
        transition-colors cursor-pointer"
    >
      {label}
    </button>
  );
}

export default function RecurringTasksManager() {
  const recurringTasks = useStore((s) => s.recurringTasks);
  const addRecurringTask = useStore((s) => s.addRecurringTask);
  const updateRecurringTask = useStore((s) => s.updateRecurringTask);
  const deleteRecurringTask = useStore((s) => s.deleteRecurringTask);

  const [name, setName] = useState('');
  const [days, setDays] = useState<number[]>(EVERY_DAY);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast('Name required', { description: 'Give the recurring task a name first.' });
      return;
    }
    if (days.length === 0) {
      toast('Pick at least one day', { description: 'Choose which days this task applies to.' });
      return;
    }
    addRecurringTask(trimmed, days);
    toast.success('Recurring task added', { description: `${trimmed} · ${describeSchedule(days)}` });
    setName('');
    setDays(EVERY_DAY);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[11px] text-text-placeholder leading-relaxed">
        Recurring tasks are auto-added to your daily plan on the days you choose — no retyping. Use{' '}
        <span className="text-text-secondary">Every day except Sat</span> for a rest day, or pick specific days.
      </p>

      {/* Existing tasks */}
      {recurringTasks.length > 0 && (
        <div className="flex flex-col gap-2">
          {recurringTasks.map((t) => (
            <div
              key={t.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-[rgba(255,255,255,0.05)]
                bg-[rgba(0,0,0,0.2)] px-3 py-2"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Repeat size={12} className="text-accent flex-shrink-0" />
                <input
                  value={t.name}
                  onChange={(e) => updateRecurringTask(t.id, { name: e.target.value })}
                  className="flex-1 min-w-0 bg-transparent text-sm text-text-primary focus:outline-none
                    border-b border-transparent focus:border-accent/30"
                />
                <span className="text-[10px] text-text-placeholder uppercase tracking-wider whitespace-nowrap hidden md:inline">
                  {describeSchedule(t.days)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DayToggles days={t.days} onChange={(d) => updateRecurringTask(t.id, { days: d })} />
                <button
                  onClick={() => {
                    deleteRecurringTask(t.id);
                    toast('Removed', { description: t.name });
                  }}
                  aria-label={`Delete ${t.name}`}
                  className="text-text-placeholder hover:text-danger transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add new */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-3 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
            }}
            placeholder="New recurring task (e.g. Gym)"
            className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg
              px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder
              focus:outline-none focus:border-accent/30"
          />
          {name && (
            <button
              onClick={() => setName('')}
              aria-label="Clear name"
              className="text-text-placeholder hover:text-text-secondary transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <DayToggles days={days} onChange={setDays} />
          <div className="flex items-center gap-1.5">
            <Preset label="Every day" onClick={() => setDays(EVERY_DAY)} />
            <Preset label="Weekdays" onClick={() => setDays(WEEKDAYS)} />
            <Preset label="Except Sat" onClick={() => setDays(EVERY_DAY.filter((d) => d !== 6))} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-text-placeholder uppercase tracking-wider">
            {describeSchedule(days)}
          </span>
          <HUDButton size="sm" onClick={handleAdd}>
            <Plus size={13} /> Add
          </HUDButton>
        </div>
      </div>
    </div>
  );
}
