'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/stores/useStore';
import { buildWeeklyStats } from '@/lib/weeklyReview';
import { buildDaySignals } from '@/lib/whoop/optimize';
import HUDPanel from '@/components/hud/HUDPanel';
import { Sparkles, Loader2, CalendarCheck } from 'lucide-react';

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="px-3 py-2 rounded-xl border border-border bg-[rgba(255,255,255,0.02)]">
      <div className="text-[10px] uppercase tracking-widest text-text-placeholder">{label}</div>
      <div className="text-sm font-semibold text-text-primary mt-0.5">{value}</div>
      {hint && <div className="text-[10px] text-text-tertiary mt-0.5">{hint}</div>}
    </div>
  );
}

export default function WeeklyReview() {
  const checkinHistory = useStore((s) => s.checkinHistory);
  const quests = useStore((s) => s.quests);
  const xpHistory = useStore((s) => s.xpHistory);
  const focusSessions = useStore((s) => s.focusSessions);
  const journalEntries = useStore((s) => s.journalEntries);
  const ideas = useStore((s) => s.ideas);
  const whoopCache = useStore((s) => s.whoopCache);

  const stats = useMemo(() => {
    // Calendar load isn't part of the weekly stats, so signals only need
    // recovery + strain by day.
    const daySignals = whoopCache
      ? buildDaySignals(whoopCache.recovery, whoopCache.cycles, {})
      : [];
    return buildWeeklyStats(
      { checkinHistory, quests, xpHistory, focusSessions, journalEntries, ideas, daySignals },
      new Date(),
    );
  }, [checkinHistory, quests, xpHistory, focusSessions, journalEntries, ideas, whoopCache]);

  const [narrative, setNarrative] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const generate = async () => {
    if (pending) return;
    setPending(true);
    setUnavailable(false);
    try {
      const res = await fetch('/api/weekly-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.narrative) setNarrative(data.narrative);
      else setUnavailable(true);
    } catch {
      setUnavailable(true);
    } finally {
      setPending(false);
    }
  };

  const fmt = (n: number | null, suffix = '') => (n === null ? '—' : `${n}${suffix}`);

  return (
    <HUDPanel delay={3} glow>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <CalendarCheck size={14} className="text-accent" />
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Weekly Review
          </h2>
          <span className="text-[10px] text-text-placeholder">
            {stats.windowStart} → {stats.windowEnd}
          </span>
        </div>
        <button
          onClick={generate}
          disabled={pending}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-accent/30 text-[11px]
            text-accent hover:bg-accent/10 transition-colors cursor-pointer disabled:opacity-60"
        >
          {pending ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
          {narrative ? 'Regenerate' : 'AI insights'}
        </button>
      </div>

      {narrative && (
        <div className="flex gap-2 mb-3 p-3 rounded-lg border border-accent/15 bg-gradient-to-r from-accent/[0.05] to-transparent">
          <Sparkles size={13} className="text-accent flex-shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary leading-relaxed">{narrative}</p>
        </div>
      )}
      {unavailable && (
        <p className="mb-3 text-[11px] text-text-tertiary">
          AI insights unavailable right now — the numbers below are computed locally.
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat
          label="Quests done"
          value={String(stats.quests.completed)}
          hint={stats.quests.topPillar ? `mostly ${stats.quests.topPillar}` : undefined}
        />
        <Stat
          label="XP earned"
          value={String(stats.xp.total)}
          hint={stats.xp.bestDay ? `best day ${stats.xp.bestDay.date.slice(5)} (+${stats.xp.bestDay.xp})` : undefined}
        />
        <Stat
          label="Focus"
          value={`${stats.focus.minutes} min`}
          hint={stats.focus.sessions ? `${stats.focus.sessions} session${stats.focus.sessions === 1 ? '' : 's'}` : undefined}
        />
        <Stat
          label="Check-ins"
          value={String(stats.checkins.count)}
          hint={
            stats.checkins.avgMood !== null
              ? `mood ${fmt(stats.checkins.avgMood)} · energy ${fmt(stats.checkins.avgEnergy)} · sleep ${fmt(stats.checkins.avgSleep)}`
              : undefined
          }
        />
        <Stat
          label="Recovery avg"
          value={fmt(stats.whoop.avgRecovery, '%')}
          hint={stats.whoop.peakDay ? `peak ${stats.whoop.peakDay.slice(5)}` : undefined}
        />
        <Stat label="High-strain days" value={String(stats.whoop.highStrainDays)} />
        <Stat label="Journal entries" value={String(stats.journal.entries)} />
        <Stat label="Ideas captured" value={String(stats.ideas.captured)} />
      </div>
    </HUDPanel>
  );
}
