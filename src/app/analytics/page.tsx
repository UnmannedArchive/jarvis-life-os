'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/stores/useStore';
import type { XPHistoryEntry } from '@/stores/useStore';
import { PILLAR_CONFIG, Pillar } from '@/lib/types';
import HUDPanel from '@/components/hud/HUDPanel';
import ProgressRing from '@/components/hud/ProgressRing';
import StatCard from '@/components/hud/StatCard';
import { Target, TrendingUp, Flame, Zap } from 'lucide-react';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

const PILLAR_ORDER: Pillar[] = ['mind', 'body', 'work', 'wealth', 'spirit', 'social'];
type TimeRange = '7d' | '14d' | '30d';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-lg border border-border shadow-lg p-2.5 text-xs">
      <div className="font-medium text-text-primary mb-1">{label}</div>
      {payload.map((e: any) => (
        <div key={e.name} className="flex items-center gap-1.5 text-text-secondary">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
          {e.name}: {e.value}
        </div>
      ))}
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

  const days = range === '30d' ? 30 : range === '14d' ? 14 : 7;

  const xpChartData = useMemo(() => {
    const start = subDays(new Date(), days);
    return eachDayOfInterval({ start, end: new Date() }).map((date) => {
      const d = format(date, 'yyyy-MM-dd');
      return { date: format(date, 'MMM d'), xp: xpHistory.filter((e) => e.date === d).reduce((s, e) => s + e.xp, 0) };
    });
  }, [xpHistory, days]);

  const pillarChartData = useMemo(() => {
    const start = subDays(new Date(), days);
    return eachDayOfInterval({ start, end: new Date() }).map((date) => {
      const d = format(date, 'yyyy-MM-dd');
      const r: Record<string, any> = { date: format(date, 'MMM d') };
      PILLAR_ORDER.forEach((p) => { r[p] = xpHistory.filter((e) => e.date === d && e.pillar === p).reduce((s, e) => s + e.xp, 0); });
      return r;
    });
  }, [xpHistory, days]);

  const totalXP = pillars.reduce((s, p) => s + p.current_xp, 0);
  const ranges: { key: TimeRange; label: string }[] = [{ key: '7d', label: '7d' }, { key: '14d', label: '14d' }, { key: '30d', label: '30d' }];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard icon={<Target size={14} />} label="Tasks Completed" value={totalCompleted} color="#228be6" delay={0} />
        <StatCard icon={<Flame size={14} />} label="Current Streak" value={`${user?.current_streak || 0}d`} sublabel={`Best: ${user?.longest_streak || 0}d`} color="#fab005" delay={1} />
        <StatCard icon={<TrendingUp size={14} />} label="Total XP" value={user?.total_xp?.toLocaleString() || '0'} color="#7950f2" delay={2} />
        <StatCard icon={<Zap size={14} />} label="Completion Rate" value={`${completionRate}%`} sublabel="of daily tasks" color="#40c057" delay={3} />
      </div>

      <div className="flex gap-1 mb-4">
        {ranges.map((r) => (
          <button key={r.key} onClick={() => setRange(r.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              range === r.key ? 'bg-accent-light text-accent' : 'text-text-tertiary hover:bg-bg-secondary'
            }`}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <HUDPanel delay={4}>
          <h3 className="text-sm font-semibold text-text-primary mb-4">XP Over Time</h3>
          {xpHistory.length === 0 ? (
            <div className="text-center py-12 text-text-placeholder text-sm">Complete tasks to see your XP trend.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={xpChartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <defs>
                  <linearGradient id="xpG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#228be6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#228be6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                <XAxis dataKey="date" tick={{ fill: '#868e96', fontSize: 10 }} axisLine={{ stroke: '#e9ecef' }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#868e96', fontSize: 10 }} axisLine={{ stroke: '#e9ecef' }} tickLine={false} width={30} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="xp" name="XP" stroke="#228be6" fill="url(#xpG)" strokeWidth={2} dot={false}
                  activeDot={{ r: 4, fill: '#228be6', stroke: 'white', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </HUDPanel>

        <HUDPanel delay={5}>
          <h3 className="text-sm font-semibold text-text-primary mb-4">By Pillar</h3>
          {xpHistory.length === 0 ? (
            <div className="text-center py-12 text-text-placeholder text-sm">No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={pillarChartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                <XAxis dataKey="date" tick={{ fill: '#868e96', fontSize: 10 }} axisLine={{ stroke: '#e9ecef' }} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#868e96', fontSize: 10 }} axisLine={{ stroke: '#e9ecef' }} tickLine={false} width={30} />
                <Tooltip content={<CustomTooltip />} />
                {PILLAR_ORDER.map((p) => (
                  <Bar key={p} dataKey={p} name={PILLAR_CONFIG[p].label} stackId="a" fill={PILLAR_CONFIG[p].color} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </HUDPanel>

        <HUDPanel delay={6}>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Pillar Breakdown</h3>
          <div className="space-y-3">
            {PILLAR_ORDER.map((pillar) => {
              const p = pillars.find((x) => x.pillar === pillar);
              const config = PILLAR_CONFIG[pillar];
              const xp = p?.current_xp || 0;
              const pct = totalXP > 0 ? (xp / totalXP) * 100 : 0;
              return (
                <div key={pillar}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
                      <span className="text-xs font-medium text-text-secondary">{config.label} · Lv.{p?.level || 1}</span>
                    </div>
                    <span className="text-xs text-text-tertiary">{xp} XP · {Math.round(pct)}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: config.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </HUDPanel>

        <HUDPanel delay={7}>
          <h3 className="text-sm font-semibold text-text-primary mb-4">Daily Completion</h3>
          <div className="flex items-center justify-center py-4">
            <ProgressRing percentage={completionRate} size={120} strokeWidth={6} value={`${completionRate}%`} label="Daily tasks done" />
          </div>
        </HUDPanel>
      </div>
    </div>
  );
}
