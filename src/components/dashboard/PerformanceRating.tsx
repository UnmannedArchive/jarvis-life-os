'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/stores/useStore';
import { computePerformance, Rating, Insight } from '@/lib/performanceAI';
import { PILLAR_CONFIG, Pillar } from '@/lib/types';
import HUDPanel from '@/components/hud/HUDPanel';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Lightbulb, Gauge,
} from 'lucide-react';

const RATING_STYLES: Record<Rating, { color: string; glow: string; bg: string }> = {
  S: { color: '#fbbf24', glow: 'rgba(251,191,36,0.3)', bg: 'rgba(251,191,36,0.08)' },
  A: { color: '#34d399', glow: 'rgba(52,211,153,0.3)', bg: 'rgba(52,211,153,0.08)' },
  B: { color: '#c0c0c0', glow: 'rgba(200,200,200,0.3)', bg: 'rgba(200,200,200,0.08)' },
  C: { color: '#fb923c', glow: 'rgba(251,146,60,0.3)', bg: 'rgba(251,146,60,0.08)' },
  D: { color: '#f87171', glow: 'rgba(248,113,113,0.3)', bg: 'rgba(248,113,113,0.08)' },
  F: { color: '#888888', glow: 'rgba(152,152,168,0.2)', bg: 'rgba(152,152,168,0.06)' },
};

function RatingBadge({ rating, score }: { rating: Rating; score: number }) {
  const style = RATING_STYLES[rating];
  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="relative"
      >
        <svg width={80} height={80} className="-rotate-90">
          <circle cx={40} cy={40} r={34} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={4} />
          <motion.circle
            cx={40} cy={40} r={34} fill="none"
            stroke={style.color} strokeWidth={4} strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 34}
            initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - score / 100) }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{ filter: `drop-shadow(0 0 8px ${style.glow})` }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-2xl font-extrabold"
            style={{ color: style.color, textShadow: `0 0 12px ${style.glow}` }}
          >
            {rating}
          </span>
        </div>
      </motion.div>
      <div className="text-xs font-semibold mt-1" style={{ color: style.color }}>{score}/100</div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'flat' }) {
  if (trend === 'up') return <TrendingUp size={11} className="text-success" />;
  if (trend === 'down') return <TrendingDown size={11} className="text-danger" />;
  return <Minus size={11} className="text-text-placeholder" />;
}

function InsightItem({ insight }: { insight: Insight }) {
  const icon = insight.type === 'strength'
    ? <CheckCircle2 size={13} className="text-success flex-shrink-0 mt-0.5" />
    : insight.type === 'weakness'
      ? <AlertTriangle size={13} className="text-warning flex-shrink-0 mt-0.5" />
      : <Lightbulb size={13} className="text-accent flex-shrink-0 mt-0.5" />;

  const borderColor = insight.type === 'strength'
    ? 'border-success/10'
    : insight.type === 'weakness'
      ? 'border-warning/10'
      : 'border-accent/10';

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex gap-2 p-2.5 rounded-lg border ${borderColor} bg-[rgba(0,0,0,0.4)]`}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <span className="text-xs text-text-secondary leading-relaxed">{insight.text}</span>
        {insight.pillar && (
          <span
            className="inline-block ml-1.5 w-1.5 h-1.5 rounded-full align-middle"
            style={{ backgroundColor: PILLAR_CONFIG[insight.pillar].color }}
          />
        )}
      </div>
    </motion.div>
  );
}

function PillarBar({ pillar, label, score, trend, color }: {
  pillar: Pillar; label: string; score: number; trend: 'up' | 'down' | 'flat'; color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[11px] text-text-secondary w-12 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color, opacity: 0.7 }}
        />
      </div>
      <TrendIcon trend={trend} />
    </div>
  );
}

export default function PerformanceRating() {
  const quests = useStore((s) => s.quests);
  const pillars = useStore((s) => s.pillars);
  const xpHistory = useStore((s) => s.xpHistory);
  const activityLog = useStore((s) => s.activityLog);
  const user = useStore((s) => s.user);
  const consecutiveLogins = useStore((s) => s.consecutiveLogins);
  const [expanded, setExpanded] = useState(false);

  const report = useMemo(() => {
    return computePerformance(
      quests,
      pillars,
      xpHistory,
      activityLog,
      user?.current_streak || 0,
      consecutiveLogins,
    );
  }, [quests, pillars, xpHistory, activityLog, user, consecutiveLogins]);

  const style = RATING_STYLES[report.rating];
  const strengths = report.insights.filter((i) => i.type === 'strength');
  const weaknesses = report.insights.filter((i) => i.type === 'weakness');
  const tips = report.insights.filter((i) => i.type === 'tip');

  return (
    <HUDPanel delay={1}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gauge size={13} className="text-accent drop-shadow-[0_0_6px_rgba(200,200,200,0.3)]" />
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Performance</h2>
        </div>
        <span className="text-[10px] text-text-placeholder uppercase tracking-wider font-medium">
          {report.weeklyTrend === 'improving' ? 'Trending Up' : report.weeklyTrend === 'declining' ? 'Trending Down' : 'Steady'}
        </span>
      </div>

      <div className="flex items-start gap-4 mb-4">
        <RatingBadge rating={report.rating} score={report.score} />
        <div className="flex-1 pt-1">
          <div className="text-sm font-semibold text-text-primary mb-0.5" style={{ color: style.color }}>
            {report.label}
          </div>
          <p className="text-xs text-text-tertiary leading-relaxed mb-2">{report.summary}</p>

          {/* Today mini stats */}
          <div className="flex gap-3">
            <div className="text-center">
              <div className="text-sm font-bold text-text-primary tabular-nums">
                {report.todayStats.completed}/{report.todayStats.total}
              </div>
              <div className="text-[9px] text-text-placeholder uppercase">Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-text-primary tabular-nums">
                {report.todayStats.xpEarned}
              </div>
              <div className="text-[9px] text-text-placeholder uppercase">XP Today</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-text-primary tabular-nums">
                {user?.current_streak || 0}
              </div>
              <div className="text-[9px] text-text-placeholder uppercase">Streak</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pillar breakdown bars */}
      <div className="flex flex-col gap-1.5 mb-3">
        {report.pillarScores.map((ps) => (
          <PillarBar
            key={ps.pillar}
            pillar={ps.pillar}
            label={ps.label}
            score={ps.score}
            trend={ps.trend}
            color={PILLAR_CONFIG[ps.pillar].color}
          />
        ))}
      </div>

      {/* Expand/collapse insights */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[11px] text-text-placeholder hover:text-text-secondary
          transition-colors cursor-pointer w-full justify-center py-1"
      >
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {expanded ? 'Hide insights' : `${report.insights.length} insights`}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-2 mt-2 pt-2 border-t border-border">
              {strengths.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-success uppercase tracking-widest mb-1.5">Strengths</div>
                  <div className="flex flex-col gap-1.5">
                    {strengths.map((ins, i) => <InsightItem key={`s-${i}`} insight={ins} />)}
                  </div>
                </div>
              )}

              {weaknesses.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-warning uppercase tracking-widest mb-1.5">Needs Attention</div>
                  <div className="flex flex-col gap-1.5">
                    {weaknesses.map((ins, i) => <InsightItem key={`w-${i}`} insight={ins} />)}
                  </div>
                </div>
              )}

              {tips.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-accent uppercase tracking-widest mb-1.5">Tips</div>
                  <div className="flex flex-col gap-1.5">
                    {tips.map((ins, i) => <InsightItem key={`t-${i}`} insight={ins} />)}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </HUDPanel>
  );
}
