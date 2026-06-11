'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Sparkles, RefreshCw } from 'lucide-react';
import { useWorkflowData } from '@/lib/workflow/useWorkflowData';
import type { WorkflowCategory } from '@/lib/workflow/types';

const CAT_COLOR: Record<WorkflowCategory, string> = {
  focus: '#4ade80',
  neutral: '#fbbf24',
  distraction: '#f87171',
};

function fmt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const NEXT_CAT: Record<WorkflowCategory, WorkflowCategory> = {
  focus: 'neutral', neutral: 'distraction', distraction: 'focus',
};

export default function WorkflowDashboard() {
  const { view, monitorRunning, loading, summarizing, refresh, summarize, todaysSummary, setCategory } = useWorkflowData();

  if (loading) {
    return <div className="p-6 text-text-tertiary text-sm">Loading your workflow…</div>;
  }

  if (!monitorRunning) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] p-6 max-w-xl">
          <h2 className="text-base font-semibold text-text-primary mb-2">Start the monitor</h2>
          <p className="text-sm text-text-tertiary mb-3">
            The Workflow tab shows what you worked on today. Start the local collector once and leave it running:
          </p>
          <pre className="text-xs bg-black/40 rounded-lg p-3 overflow-x-auto text-text-secondary">cd monitor &amp;&amp; python collector.py</pre>
          <p className="text-xs text-text-placeholder mt-3">
            First run: grant Screen Recording permission in System Settings → Privacy &amp; Security. Then click Refresh.
          </p>
          <button onClick={refresh} className="mt-4 inline-flex items-center gap-2 text-sm text-accent hover:underline cursor-pointer">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>
    );
  }

  if (view.totals.focus + view.totals.neutral + view.totals.distraction === 0) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] p-6 max-w-xl">
          <h2 className="text-base font-semibold text-text-primary mb-2">Monitor is running</h2>
          <p className="text-sm text-text-tertiary mb-3">
            Collecting your first session — keep working normally and check back in a minute.
            Sessions are recorded when you switch apps or windows.
          </p>
          <button onClick={refresh} className="inline-flex items-center gap-2 text-sm text-accent hover:underline cursor-pointer">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>
    );
  }

  const chartData = view.byHour.map((h) => ({
    hour: `${h.hour}:00`,
    focus: h.focus, neutral: h.neutral, distraction: h.distraction,
  }));

  const kpis: { label: string; seconds?: number; value?: string; color: string }[] = [
    { label: 'Focused', seconds: view.totals.focus, color: CAT_COLOR.focus },
    { label: 'Neutral', seconds: view.totals.neutral, color: CAT_COLOR.neutral },
    { label: 'Distracted', seconds: view.totals.distraction, color: CAT_COLOR.distraction },
    { label: 'Focus score', value: `${view.focusScore}%`, color: '#7aa2f7' },
  ];

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-text-primary">Workflow</h1>
        <button onClick={refresh} className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary cursor-pointer">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* AI read */}
      <div className="rounded-2xl border border-accent/15 bg-gradient-to-br from-accent-dim to-transparent p-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] uppercase tracking-wider text-accent flex items-center gap-1.5"><Sparkles size={12} /> AI read · today</span>
          <button onClick={summarize} disabled={summarizing}
            className="text-[11px] text-text-tertiary hover:text-text-secondary disabled:opacity-50 cursor-pointer">
            {summarizing ? 'Thinking…' : 'Refresh insight'}
          </button>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">
          {todaysSummary ?? 'Tap “Refresh insight” for a quick read on your day.'}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-[rgba(255,255,255,0.03)] p-3">
            <div className="text-[11px] uppercase tracking-wide text-text-placeholder">{k.label}</div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: k.color }}>
              {k.value ?? fmt(k.seconds ?? 0)}
            </div>
          </div>
        ))}
      </div>

      {/* Most productive hours */}
      <div className="rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] p-4">
        <div className="text-sm font-semibold text-text-secondary mb-3">Most productive hours · today</div>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#8a93a6' }} />
              <YAxis hide />
              <Tooltip
                formatter={(v, name) => [fmt(typeof v === 'number' ? v : 0), String(name)]}
                contentStyle={{ background: '#161b26', border: '1px solid #232a38', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="focus" stackId="a" fill={CAT_COLOR.focus} radius={[3, 3, 0, 0]} />
              <Bar dataKey="neutral" stackId="a" fill={CAT_COLOR.neutral} />
              <Bar dataKey="distraction" stackId="a" fill={CAT_COLOR.distraction} radius={[0, 0, 3, 3]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Where time went */}
      <div className="rounded-2xl border border-border bg-[rgba(255,255,255,0.03)] p-4">
        <div className="text-sm font-semibold text-text-secondary mb-3">Where your time went · today</div>
        <div className="flex flex-col gap-2.5">
          {view.byApp.slice(0, 10).map((a) => {
            const max = view.byApp[0]?.seconds || 1;
            return (
              <div key={a.app} className="flex items-center gap-3 text-sm">
                <span className="w-32 truncate text-text-secondary">{a.app}</span>
                <div className="flex-1 bg-[rgba(255,255,255,0.05)] rounded h-3.5">
                  <div className="h-full rounded" style={{ width: `${(a.seconds / max) * 100}%`, background: CAT_COLOR[a.category] }} />
                </div>
                <span className="w-14 text-right text-text-tertiary tabular-nums">{fmt(a.seconds)}</span>
                <button
                  onClick={() => setCategory(a.app, NEXT_CAT[a.category])}
                  title="Tap to re-label (focus → neutral → distraction)"
                  className="w-20 text-[11px] text-text-placeholder hover:text-text-secondary cursor-pointer text-left"
                >
                  {a.category}
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-text-placeholder mt-3">Tap a category to re-label that app — it sticks.</p>
      </div>
    </div>
  );
}
