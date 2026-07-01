'use client';

// WHOOP dashboard widget — today's recovery ring + strain / sleep / HRV / RHR.
// Read-only; data comes from useWhoopData (same cache the rest of the app uses).
// Connect/disconnect lives in Settings, so the empty state links there.

import Link from 'next/link';
import HUDPanel from '@/components/hud/HUDPanel';
import { useWhoopData } from '@/hooks/useWhoopData';
import { recoveryColor } from '@/lib/whoop/insights';
import { Activity, Moon, HeartPulse, Gauge, RefreshCw } from 'lucide-react';

function RecoveryRing({ score }: { score: number }) {
  const color = recoveryColor(score);
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  return (
    <div className="relative w-[68px] h-[68px] flex-shrink-0">
      <svg width="68" height="68" className="-rotate-90">
        <circle cx="34" cy="34" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="34" cy="34" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-base font-black tabular-nums" style={{ color }}>{score}</span>
        <span className="text-[8px] text-text-placeholder uppercase tracking-wide">recov</span>
      </div>
    </div>
  );
}

export default function WhoopWidget() {
  const { connected, loading, error, today, lastSynced, refresh } = useWhoopData();

  if (!connected) {
    return (
      <HUDPanel delay={3}>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} className="text-accent" />
          <span className="text-sm font-semibold text-text-secondary uppercase tracking-wider">WHOOP</span>
        </div>
        <p className="text-xs text-text-tertiary mb-3">
          Connect WHOOP to see your recovery, strain and sleep here.
        </p>
        <Link href="/settings" className="text-xs text-accent underline">Connect in Settings →</Link>
      </HUDPanel>
    );
  }

  const { recovery, sleep, cycle } = today;
  const sleepHours = sleep ? (sleep.asleepMs / 3_600_000).toFixed(1) : null;

  const stats = [
    { icon: <Gauge size={13} />, label: 'Day Strain', value: cycle ? cycle.strain.toFixed(1) : '—', color: '#60a5fa' },
    { icon: <Moon size={13} />, label: 'Sleep', value: sleep ? `${sleep.performancePct}%` : '—', sub: sleepHours ? `${sleepHours}h` : undefined, color: '#a78bfa' },
    { icon: <HeartPulse size={13} />, label: 'HRV', value: recovery ? `${Math.round(recovery.hrvMs)}ms` : '—', color: '#34d399' },
    { icon: <Activity size={13} />, label: 'Resting HR', value: recovery ? `${recovery.restingHeartRate}` : '—', sub: 'bpm', color: '#f87171' },
  ];

  return (
    <HUDPanel delay={3} glow>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold text-text-secondary uppercase tracking-wider">WHOOP</span>
        <button
          onClick={refresh}
          aria-label="Sync WHOOP"
          className="text-text-placeholder hover:text-text-secondary transition-colors cursor-pointer"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        {recovery ? <RecoveryRing score={recovery.recoveryScore} /> : (
          <div className="w-[68px] h-[68px] rounded-full border border-dashed border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[10px] text-text-placeholder flex-shrink-0">no data</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-text-primary leading-tight">
            {recovery ? (recovery.recoveryScore >= 67 ? 'Recovered' : recovery.recoveryScore >= 34 ? 'Adequate' : 'Low recovery') : 'Awaiting data'}
          </div>
          <div className="text-[11px] text-text-placeholder">
            {lastSynced ? `synced ${new Date(lastSynced).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-2 p-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.03)]">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${s.color}18, ${s.color}08)`, color: s.color }}>
              {s.icon}
            </div>
            <div>
              <div className="text-sm font-bold text-text-primary leading-tight tabular-nums">
                {s.value}{s.sub && <span className="text-[10px] font-normal text-text-placeholder ml-1">{s.sub}</span>}
              </div>
              <div className="text-[10px] text-text-placeholder">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {error && <div className="mt-3 text-[11px] text-danger">{error}</div>}
    </HUDPanel>
  );
}
