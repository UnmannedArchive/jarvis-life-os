'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import { Pillar, PILLAR_CONFIG } from '@/lib/types';
import HUDPanel from '@/components/hud/HUDPanel';
import Hourglass from '@/components/focus/Hourglass';
import { Play, Pause, RotateCcw, Coffee, Zap, Plus, Minus, ChevronUp, ChevronDown } from 'lucide-react';

const PRESETS = [
  { label: '15 min', minutes: 15, type: 'work' },
  { label: '25 min', minutes: 25, type: 'work' },
  { label: '50 min', minutes: 50, type: 'work' },
  { label: '5 min', minutes: 5, type: 'break' },
  { label: '10 min', minutes: 10, type: 'break' },
] as const;

export default function FocusPage() {
  const addLogEntry = useStore((s) => s.addLogEntry);
  const user = useStore((s) => s.user);
  const setUser = useStore((s) => s.setUser);

  const [duration, setDuration] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [pillar, setPillar] = useState<Pillar>('work');
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pct = duration > 0 ? (duration - remaining) / duration : 0;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const totalMins = Math.round(duration / 60);

  const completeSession = useCallback(() => {
    if (mode === 'work') {
      const xp = duration >= 2700 ? 100 : 50;
      addLogEntry('focus_session', `Focus session completed — ${Math.round(duration / 60)} min · ${PILLAR_CONFIG[pillar].label}`, xp, pillar);
      if (user) setUser({ ...user, total_xp: user.total_xp + xp });
      setSessions((s) => s + 1);
    }
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [mode, duration, pillar, addLogEntry, user, setUser]);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) { completeSession(); return 0; }
          return r - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, remaining, completeSession]);

  const adjustTime = (delta: number) => {
    if (running) return;
    const newDuration = Math.max(60, Math.min(7200, duration + delta * 60));
    setDuration(newDuration);
    setRemaining(newDuration);
  };

  const selectPreset = (minutes: number, type: 'work' | 'break') => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setDuration(minutes * 60);
    setRemaining(minutes * 60);
    setMode(type);
  };

  const reset = () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRemaining(duration);
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <HUDPanel delay={0} glow>
        <div className="flex flex-col items-center py-6">
          {/* Mode indicator */}
          <div className="flex items-center gap-2 mb-6">
            {mode === 'work'
              ? <Zap size={16} className="text-accent drop-shadow-[0_0_6px_rgba(200,200,200,0.4)]" />
              : <Coffee size={16} className="text-warning drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]" />}
            <span className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
              {mode === 'work' ? 'Focus Mode' : 'Break Time'}
            </span>
            {sessions > 0 && <span className="text-xs text-text-placeholder ml-1">· {sessions} done</span>}
          </div>

          {/* Hourglass + time display */}
          <div className="relative mb-4 flex flex-col items-center">
            <Hourglass
              progress={pct}
              running={running}
              mode={mode}
              width={180}
              height={300}
            />
          </div>

          {/* Time display with +/- controls */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => adjustTime(-5)}
              disabled={running || duration <= 60}
              className="w-10 h-10 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)]
                flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-[rgba(255,255,255,0.12)]
                transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              <Minus size={16} />
            </button>

            <div className="flex flex-col items-center">
              {!running && (
                <button
                  onClick={() => adjustTime(1)}
                  disabled={duration >= 7200}
                  className="text-text-placeholder hover:text-text-secondary transition-colors disabled:opacity-20 cursor-pointer mb-0.5"
                >
                  <ChevronUp size={14} />
                </button>
              )}
              <div className="text-5xl font-bold text-text-primary tabular-nums tracking-tight">
                {String(mins).padStart(2, '0')}
                <span className="text-text-tertiary animate-pulse">:</span>
                {String(secs).padStart(2, '0')}
              </div>
              <div className="text-xs text-text-placeholder mt-0.5">{totalMins} min session</div>
              {!running && (
                <button
                  onClick={() => adjustTime(-1)}
                  disabled={duration <= 60}
                  className="text-text-placeholder hover:text-text-secondary transition-colors disabled:opacity-20 cursor-pointer mt-0.5"
                >
                  <ChevronDown size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => adjustTime(5)}
              disabled={running || duration >= 7200}
              className="w-10 h-10 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)]
                flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-[rgba(255,255,255,0.12)]
                transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Play / Reset controls */}
          <div className="flex items-center gap-4 mb-6">
            <button onClick={reset}
              className="w-11 h-11 rounded-full flex items-center justify-center text-text-placeholder
                hover:text-text-secondary hover:bg-[rgba(255,255,255,0.04)] transition-all cursor-pointer active:scale-90"
            >
              <RotateCcw size={18} />
            </button>
            <button onClick={() => setRunning(!running)}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                running
                  ? 'bg-danger/20 border border-danger/30 text-danger hover:bg-danger/30 shadow-[0_0_24px_rgba(248,113,113,0.15)]'
                  : mode === 'work'
                    ? 'bg-accent border border-accent/30 text-white hover:bg-accent-hover shadow-[0_0_30px_rgba(200,200,200,0.2)]'
                    : 'bg-warning/80 border border-warning/30 text-black hover:bg-warning shadow-[0_0_30px_rgba(251,191,36,0.2)]'
              }`}
            >
              {running ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
            </button>
            <div className="w-11" />
          </div>

          {/* Presets */}
          <div className="flex gap-2 flex-wrap justify-center mb-5">
            <div className="flex gap-1.5 items-center">
              <Zap size={12} className="text-accent mr-0.5" />
              {PRESETS.filter(p => p.type === 'work').map((p) => (
                <button key={p.label} onClick={() => selectPreset(p.minutes, p.type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                    duration === p.minutes * 60 && mode === p.type
                      ? 'border-accent/30 bg-accent-dim text-accent shadow-[0_0_12px_rgba(200,200,200,0.08)]'
                      : 'border-[rgba(255,255,255,0.04)] text-text-placeholder hover:border-[rgba(255,255,255,0.08)] hover:text-text-secondary'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="w-px h-6 bg-border mx-1" />
            <div className="flex gap-1.5 items-center">
              <Coffee size={12} className="text-warning mr-0.5" />
              {PRESETS.filter(p => p.type === 'break').map((p) => (
                <button key={p.label} onClick={() => selectPreset(p.minutes, p.type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                    duration === p.minutes * 60 && mode === p.type
                      ? 'border-warning/30 bg-warning-dim text-warning shadow-[0_0_12px_rgba(251,191,36,0.08)]'
                      : 'border-[rgba(255,255,255,0.04)] text-text-placeholder hover:border-[rgba(255,255,255,0.08)] hover:text-text-secondary'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pillar selector */}
          {mode === 'work' && (
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-text-placeholder">XP goes to</span>
              <select value={pillar} onChange={(e) => setPillar(e.target.value as Pillar)}
                className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl px-2.5 py-1.5 text-xs text-text-secondary cursor-pointer">
                {Object.entries(PILLAR_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          )}
        </div>
      </HUDPanel>
    </div>
  );
}
