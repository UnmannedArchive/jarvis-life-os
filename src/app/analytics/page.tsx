'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/stores/useStore';
import type { XPHistoryEntry } from '@/stores/useStore';
import { PILLAR_CONFIG, Pillar } from '@/lib/types';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDLabel from '@/components/hud/HUDLabel';
import ProgressRing from '@/components/hud/ProgressRing';
import StatCard from '@/components/hud/StatCard';
import { Target, TrendingUp, Award, Flame, Zap, Calendar } from 'lucide-react';
import { format, subDays, eachDayOfInterval, parseISO, isAfter } from 'date-fns';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const PILLAR_ORDER: Pillar[] = ['mind', 'body', 'work', 'wealth', 'spirit', 'social'];

type TimeRange = '7d' | '14d' | '30d' | 'all';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="hud-panel p-2 border border-hud-border text-[11px]" style={{ background: 'rgba(10,14,20,0.95)' }}>
      <div className="font-[family-name:var(--font-orbitron)] text-hud-text-muted text-[9px] tracking-[2px] mb-1">{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="w-2 h-2" style={{ backgroundColor: entry.color }} />
          <span style={{ color: entry.color }}>{entry.name}: {entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function XPOverTimeChart({ xpHistory, range }: { xpHistory: XPHistoryEntry[]; range: TimeRange }) {
  const data = useMemo(() => {
    const days = range === 'all' ? 90 : range === '30d' ? 30 : range === '14d' ? 14 : 7;
    const start = subDays(new Date(), days);
    const interval = eachDayOfInterval({ start, end: new Date() });

    return interval.map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayEntries = xpHistory.filter((e) => e.date === dateStr);
      const totalXP = dayEntries.reduce((s, e) => s + e.xp, 0);
      return {
        date: format(date, 'MMM d'),
        xp: totalXP,
      };
    });
  }, [xpHistory, range]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <defs>
          <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00ff88" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,136,0.06)" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#7fba9a', fontSize: 9, fontFamily: 'var(--font-orbitron)' }}
          axisLine={{ stroke: 'rgba(0,255,136,0.1)' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#7fba9a', fontSize: 9, fontFamily: 'var(--font-orbitron)' }}
          axisLine={{ stroke: 'rgba(0,255,136,0.1)' }}
          tickLine={false}
          width={35}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="xp"
          name="XP Earned"
          stroke="#00ff88"
          fill="url(#xpGradient)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#00ff88', stroke: '#0a0e14', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function PillarStackedChart({ xpHistory, range }: { xpHistory: XPHistoryEntry[]; range: TimeRange }) {
  const data = useMemo(() => {
    const days = range === 'all' ? 90 : range === '30d' ? 30 : range === '14d' ? 14 : 7;
    const start = subDays(new Date(), days);
    const interval = eachDayOfInterval({ start, end: new Date() });

    return interval.map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayEntries = xpHistory.filter((e) => e.date === dateStr);
      const result: Record<string, any> = { date: format(date, 'MMM d') };
      PILLAR_ORDER.forEach((p) => {
        result[p] = dayEntries.filter((e) => e.pillar === p).reduce((s, e) => s + e.xp, 0);
      });
      return result;
    });
  }, [xpHistory, range]);

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,136,0.06)" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#7fba9a', fontSize: 9, fontFamily: 'var(--font-orbitron)' }}
          axisLine={{ stroke: 'rgba(0,255,136,0.1)' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#7fba9a', fontSize: 9, fontFamily: 'var(--font-orbitron)' }}
          axisLine={{ stroke: 'rgba(0,255,136,0.1)' }}
          tickLine={false}
          width={35}
        />
        <Tooltip content={<CustomTooltip />} />
        {PILLAR_ORDER.map((pillar) => (
          <Bar
            key={pillar}
            dataKey={pillar}
            name={PILLAR_CONFIG[pillar].label}
            stackId="pillars"
            fill={PILLAR_CONFIG[pillar].color}
            opacity={0.8}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function HeatmapCalendar() {
  const xpHistory = useStore((s) => s.xpHistory);

  const days = useMemo(() => {
    const today = new Date();
    const start = subDays(today, 90);
    return eachDayOfInterval({ start, end: today }).map((date) => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayXP = xpHistory.filter((e) => e.date === dateStr).reduce((s, e) => s + e.xp, 0);
      return {
        date: dateStr,
        label: format(date, 'MMM d'),
        xp: dayXP,
        intensity: Math.min(dayXP / 400, 1),
      };
    });
  }, [xpHistory]);

  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px] min-w-fit">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day) => (
              <div
                key={day.date}
                className="w-3 h-3 transition-colors"
                title={`${day.label}: ${day.xp} XP`}
                style={{
                  backgroundColor: day.xp > 0
                    ? `rgba(0,255,136,${0.15 + day.intensity * 0.7})`
                    : 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.03)',
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function PillarBreakdown() {
  const pillars = useStore((s) => s.pillars);
  const totalXP = pillars.reduce((s, p) => s + p.current_xp, 0);

  return (
    <div className="space-y-3">
      {PILLAR_ORDER.map((pillar) => {
        const p = pillars.find((x) => x.pillar === pillar);
        const config = PILLAR_CONFIG[pillar];
        const xp = p?.current_xp || 0;
        const pct = totalXP > 0 ? (xp / totalXP) * 100 : 0;

        return (
          <div key={pillar}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase" style={{ color: config.color }}>
                {config.label} — LV{p?.level || 1}
              </span>
              <span className="text-[11px] font-[family-name:var(--font-orbitron)]" style={{ color: config.color }}>
                {xp} XP ({Math.round(pct)}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-white/5 border border-white/5 overflow-hidden" style={{ borderRadius: 2 }}>
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  backgroundColor: config.color,
                  boxShadow: `0 0 6px ${config.color}66`,
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AnalyticsPage() {
  const user = useStore((s) => s.user);
  const quests = useStore((s) => s.quests);
  const pillars = useStore((s) => s.pillars);
  const xpHistory = useStore((s) => s.xpHistory);
  const [range, setRange] = useState<TimeRange>('14d');

  const dailyQuests = quests.filter((q) => q.quest_type === 'daily');
  const completedDaily = dailyQuests.filter((q) => q.completed).length;
  const completionRate = dailyQuests.length > 0 ? Math.round((completedDaily / dailyQuests.length) * 100) : 0;
  const totalCompleted = quests.filter((q) => q.completed).length;

  const avgDailyXP = useMemo(() => {
    if (xpHistory.length === 0) return 0;
    const days = new Set(xpHistory.map((e) => e.date)).size;
    const totalXP = xpHistory.reduce((s, e) => s + e.xp, 0);
    return days > 0 ? Math.round(totalXP / days) : 0;
  }, [xpHistory]);

  const insights = useMemo(() => {
    const items: string[] = [];
    if (pillars.length > 0) {
      const weakest = pillars.reduce((a, b) => (a.current_xp < b.current_xp ? a : b));
      const strongest = pillars.reduce((a, b) => (a.current_xp > b.current_xp ? a : b));
      items.push(`Your strongest pillar is ${PILLAR_CONFIG[strongest.pillar].label} at Level ${strongest.level}.`);
      items.push(`${PILLAR_CONFIG[weakest.pillar].label} needs attention — it's your weakest pillar at Level ${weakest.level}.`);
    }
    if (user && user.longest_streak > 0) {
      items.push(`Your longest streak was ${user.longest_streak} days. Current: ${user.current_streak} days.`);
    }
    if (avgDailyXP > 0) {
      items.push(`You average ${avgDailyXP} XP per day. ${avgDailyXP >= 300 ? 'Exceptional pace!' : avgDailyXP >= 150 ? 'Solid consistency.' : 'Room to grow.'}`);
    }
    items.push('Consistency beats intensity. Show up every day.');
    return items;
  }, [pillars, user, avgDailyXP]);

  const ranges: { key: TimeRange; label: string }[] = [
    { key: '7d', label: '7 Days' },
    { key: '14d', label: '14 Days' },
    { key: '30d', label: '30 Days' },
    { key: 'all', label: 'All Time' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard icon={<Target size={14} />} label="Quests Done" value={totalCompleted} color="#00ff88" delay={0} />
        <StatCard icon={<Flame size={14} />} label="Streak" value={`${user?.current_streak || 0}d`} sublabel={`best: ${user?.longest_streak || 0}d`} color="#ffd740" delay={1} />
        <StatCard icon={<TrendingUp size={14} />} label="Total XP" value={user?.total_xp?.toLocaleString() || '0'} color="#00e5ff" delay={2} />
        <StatCard icon={<Zap size={14} />} label="Avg Daily XP" value={avgDailyXP} sublabel="per active day" color="#bf7fff" delay={3} />
      </div>

      <div className="flex gap-1 mb-4">
        {ranges.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-3 py-1.5 text-[9px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase border transition-all cursor-pointer
              ${range === r.key
                ? 'border-hud-green/40 bg-hud-green/10 text-hud-green'
                : 'border-transparent text-hud-text-muted hover:text-hud-green hover:border-hud-green/20'}
            `}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HUDPanel delay={4}>
          <HUDLabel text="XP Over Time" />
          <XPOverTimeChart xpHistory={xpHistory} range={range} />
        </HUDPanel>

        <HUDPanel delay={5}>
          <HUDLabel text="Pillar Distribution" />
          <PillarStackedChart xpHistory={xpHistory} range={range} />
        </HUDPanel>

        <HUDPanel delay={6}>
          <HUDLabel text="Completion Rate" />
          <div className="flex items-center gap-6">
            <ProgressRing
              percentage={completionRate}
              size={120}
              strokeWidth={5}
              color="#00ff88"
              value={`${completionRate}%`}
              label="Daily Quests"
            />
            <div className="flex-1">
              <PillarBreakdown />
            </div>
          </div>
        </HUDPanel>

        <HUDPanel delay={7}>
          <HUDLabel text="Activity Heatmap — 90 Days" />
          <div className="py-2">
            <HeatmapCalendar />
          </div>
          <div className="flex items-center gap-2 mt-3 text-[9px] text-hud-text-dim">
            <span>Less</span>
            {[0.1, 0.3, 0.5, 0.7, 0.9].map((intensity) => (
              <div
                key={intensity}
                className="w-3 h-3"
                style={{ backgroundColor: `rgba(0,255,136,${intensity})` }}
              />
            ))}
            <span>More</span>
          </div>
        </HUDPanel>

        <HUDPanel delay={8} className="lg:col-span-2">
          <HUDLabel text="Insights & Analysis" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 p-3 border border-white/5 bg-white/2">
                <span className="text-hud-cyan mt-0.5 flex-shrink-0 text-sm">▸</span>
                <span className="text-sm text-hud-text-muted">{insight}</span>
              </div>
            ))}
          </div>
        </HUDPanel>
      </div>
    </div>
  );
}
