'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { computeFocusScore } from '@/lib/focusAI';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Check, Brain, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

function FocusRing({ percentage, size = 56, stroke = 4, mode }: { percentage: number; size?: number; stroke?: number; mode: 'work' | 'break' }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  let color: string;
  let glow: string;
  if (percentage >= 75) {
    color = '#34d399';
    glow = 'rgba(52,211,153,0.3)';
  } else if (percentage >= 45) {
    color = '#c0c0c0';
    glow = 'rgba(200,200,200,0.3)';
  } else if (percentage >= 20) {
    color = '#fbbf24';
    glow = 'rgba(251,191,36,0.3)';
  } else {
    color = '#f87171';
    glow = 'rgba(248,113,113,0.3)';
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${glow})` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold tabular-nums" style={{ color }}>{percentage}%</span>
      </div>
    </div>
  );
}

export default function DailyIntention() {
  const intention = useStore((s) => s.dailyIntention);
  const setIntention = useStore((s) => s.setDailyIntention);
  const quests = useStore((s) => s.quests);
  const activityLog = useStore((s) => s.activityLog);
  const [input, setInput] = useState('');
  const [expanded, setExpanded] = useState(false);

  const focusScore = useMemo(() => {
    if (!intention) return null;
    return computeFocusScore(intention, quests, activityLog);
  }, [intention, quests, activityLog]);

  if (intention && focusScore) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-xl p-4 mb-3"
      >
        <div className="flex items-start gap-3.5">
          <FocusRing percentage={focusScore.percentage} mode="work" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Brain size={12} className="text-accent" />
              <span className="text-[10px] font-semibold text-accent/70 uppercase tracking-widest">
                AI Focus Analysis
              </span>
              <Sparkles size={10} className="text-accent/40" />
            </div>

            <div className="text-sm text-text-primary font-medium leading-snug mb-1.5">
              &ldquo;{intention}&rdquo;
            </div>

            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                focusScore.percentage >= 75
                  ? 'bg-success-dim text-success'
                  : focusScore.percentage >= 45
                    ? 'bg-accent-dim text-accent'
                    : focusScore.percentage >= 20
                      ? 'bg-warning-dim text-warning'
                      : 'bg-danger-dim text-danger'
              }`}>
                {focusScore.label}
              </span>
            </div>

            <p className="text-xs text-text-tertiary leading-relaxed">{focusScore.insight}</p>

            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[10px] text-text-placeholder hover:text-text-secondary transition-colors mt-1.5 cursor-pointer"
            >
              {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
              {expanded ? 'Hide' : 'Show'} breakdown
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-2 mt-2.5 pt-2.5 border-t border-border">
                    <div className="bg-[rgba(255,255,255,0.02)] rounded-lg px-2.5 py-2">
                      <div className="text-[10px] text-text-placeholder uppercase tracking-wider mb-0.5">Relevant</div>
                      <div className="text-sm font-semibold text-text-primary">
                        {focusScore.breakdown.completedRelevant}
                        <span className="text-text-placeholder font-normal"> / {focusScore.breakdown.relevantTasks}</span>
                      </div>
                    </div>
                    <div className="bg-[rgba(255,255,255,0.02)] rounded-lg px-2.5 py-2">
                      <div className="text-[10px] text-text-placeholder uppercase tracking-wider mb-0.5">Overall</div>
                      <div className="text-sm font-semibold text-text-primary">
                        {focusScore.breakdown.totalCompleted}
                        <span className="text-text-placeholder font-normal"> / {focusScore.breakdown.totalTasks}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setIntention('')}
            className="text-text-placeholder hover:text-text-secondary transition-colors mt-0.5 cursor-pointer"
            title="Change focus"
          >
            <Crosshair size={14} />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex items-center gap-2 mb-3">
      <div className="relative flex-1">
        <Crosshair size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder" />
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="What's your #1 focus today?"
          className="w-full bg-bg-card border border-border rounded-lg pl-8 pr-3 py-2.5 text-sm placeholder:text-text-placeholder"
          onKeyDown={(e) => { if (e.key === 'Enter' && input.trim()) setIntention(input.trim()); }} />
      </div>
      <button onClick={() => { if (input.trim()) setIntention(input.trim()); }}
        disabled={!input.trim()}
        className="w-9 h-9 rounded-lg bg-accent text-white flex items-center justify-center disabled:opacity-30 cursor-pointer transition-opacity">
        <Check size={16} />
      </button>
    </motion.div>
  );
}
