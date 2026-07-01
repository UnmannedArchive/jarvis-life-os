'use client';

// WHOOP Coach — the optimization engine surfaced. Fuses your WHOOP week
// (recovery + strain per day) with your calendar load to name your peak day and
// flag strain / recovery-vs-load mismatches. Pure logic lives in lib/whoop/optimize.
// A Gemini narrative (/api/whoop/coach) is layered on top when a key is present;
// without it, the heuristic recommendations stand on their own.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { startOfDay, addDays, subDays, format, parseISO } from 'date-fns';
import { useWhoopData } from '@/hooks/useWhoopData';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { buildDaySignals, optimizeWeek, type RecommendationKind } from '@/lib/whoop/optimize';
import { proposeCalendarBlocks, buildGoogleEvent, type EventProposal } from '@/lib/google/propose';
import HUDPanel from '@/components/hud/HUDPanel';
import { Brain, TrendingUp, AlertTriangle, Activity, Moon, Sparkles, Plus, Check, CalendarPlus } from 'lucide-react';

const KIND_STYLE: Record<RecommendationKind, { color: string; icon: typeof Brain }> = {
  peak: { color: '#34d399', icon: TrendingUp },
  mismatch: { color: '#fbbf24', icon: AlertTriangle },
  strain: { color: '#fb923c', icon: Activity },
  rest: { color: '#60a5fa', icon: Moon },
};

// Two-way write-back: drop the proposed blocks onto the real Google Calendar.
function CalendarActions({ proposals }: { proposals: EventProposal[] }) {
  const gcal = useGoogleCalendar();
  const [status, setStatus] = useState<Record<string, 'loading' | 'ok' | 'err'>>({});

  if (proposals.length === 0) return null;

  if (!gcal.connected) {
    return (
      <div className="mt-3 pt-3 border-t border-border/40 text-[11px] text-text-placeholder">
        <Link href="/settings" className="text-accent underline">Connect Google Calendar</Link>{' '}
        to drop these blocks onto your real calendar.
      </div>
    );
  }

  const apply = async (p: EventProposal, key: string) => {
    setStatus((s) => ({ ...s, [key]: 'loading' }));
    try {
      await gcal.addEvent(buildGoogleEvent(p));
      setStatus((s) => ({ ...s, [key]: 'ok' }));
    } catch {
      setStatus((s) => ({ ...s, [key]: 'err' }));
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/40">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-placeholder mb-2">
        <CalendarPlus size={11} /> Add to Google Calendar
      </div>
      <div className="flex flex-wrap gap-1.5">
        {proposals.map((p) => {
          const key = `${p.kind}-${p.date}`;
          const st = status[key];
          return (
            <button
              key={key}
              onClick={() => apply(p, key)}
              disabled={st === 'ok' || st === 'loading'}
              title={p.description}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition-colors cursor-pointer disabled:cursor-default ${
                st === 'ok'
                  ? 'border-success/30 bg-success/10 text-success'
                  : st === 'err'
                    ? 'border-danger/30 bg-danger-dim text-danger'
                    : 'border-border bg-[rgba(255,255,255,0.02)] text-text-secondary hover:border-accent/30'
              }`}
            >
              {st === 'ok' ? <Check size={11} /> : <Plus size={11} />}
              {p.title} · {format(parseISO(p.date), 'EEE d')}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function WhoopCoach() {
  const { connected, week } = useWhoopData();

  const rangeStart = useMemo(() => subDays(startOfDay(new Date()), 7), []);
  const rangeEnd = useMemo(() => addDays(startOfDay(new Date()), 7), []);
  const { buckets } = useCalendarData(rangeStart, rangeEnd);

  const { signals, report } = useMemo(() => {
    if (!week) return { signals: [], report: null };
    const loadByDay: Record<string, number> = {};
    for (const [day, items] of Object.entries(buckets)) loadByDay[day] = items.length;
    const built = buildDaySignals(week.recovery, week.cycles, loadByDay);
    return { signals: built, report: optimizeWeek(built) };
  }, [week, buckets]);

  const proposals = useMemo(() => (report ? proposeCalendarBlocks(report) : []), [report]);

  // Optional Gemini narrative. Silent fallback to heuristics on 503/any failure.
  const [narrative, setNarrative] = useState<string | null>(null);
  useEffect(() => {
    if (signals.length === 0) return;
    let active = true;
    fetch('/api/whoop/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: signals }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d?.narrative) setNarrative(d.narrative);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [signals]);

  if (!connected) {
    return (
      <HUDPanel delay={2}>
        <div className="flex items-center gap-2 mb-2">
          <Brain size={14} className="text-accent" />
          <span className="text-sm font-semibold text-text-secondary uppercase tracking-wider">WHOOP Coach</span>
        </div>
        <p className="text-xs text-text-tertiary">
          Connect WHOOP to get weekly peak-performance and strain guidance fused with your calendar.{' '}
          <Link href="/settings" className="text-accent underline">Connect →</Link>
        </p>
      </HUDPanel>
    );
  }

  const recs = report?.recommendations ?? [];

  return (
    <HUDPanel delay={2} glow>
      <div className="flex items-center gap-2 mb-3">
        <Brain size={14} className="text-accent drop-shadow-[0_0_6px_rgba(200,200,200,0.3)]" />
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">WHOOP Coach</h2>
      </div>

      {narrative && signals.length > 0 && (
        <div className="flex gap-2 mb-3 p-3 rounded-lg border border-accent/15 bg-gradient-to-r from-accent/[0.05] to-transparent">
          <Sparkles size={13} className="text-accent flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary leading-relaxed">{narrative}</p>
        </div>
      )}

      {recs.length === 0 ? (
        <p className="text-xs text-text-tertiary">
          {report?.peakDay
            ? `Recovery and calendar load look balanced this week. Best recovery so far: ${report.peakDay.recovery}%.`
            : 'Gathering a few days of recovery + strain to tune your week…'}
        </p>
      ) : (
        <div className="space-y-2">
          {recs.map((r, i) => {
            const style = KIND_STYLE[r.kind];
            const Icon = style.icon;
            return (
              <div
                key={`${r.kind}-${i}`}
                className="flex gap-2.5 p-2.5 rounded-lg border border-[rgba(255,255,255,0.04)] bg-[rgba(0,0,0,0.35)]"
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `linear-gradient(135deg, ${style.color}18, ${style.color}08)`, color: style.color }}
                >
                  <Icon size={13} />
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{r.text}</p>
              </div>
            );
          })}
        </div>
      )}

      <CalendarActions proposals={proposals} />
    </HUDPanel>
  );
}
