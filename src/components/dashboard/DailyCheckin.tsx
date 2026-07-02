'use client';

import { useState } from 'react';
import { useStore } from '@/stores/useStore';
import HUDButton from '@/components/hud/HUDButton';
import { motion } from 'framer-motion';
import { Wine, Cigarette, Moon, Activity } from 'lucide-react';
import { encodeCheckinFlags } from '@/lib/checkinFlags';
import { useWhoopData } from '@/hooks/useWhoopData';
import { whoopScoreToLevel } from '@/lib/whoop/insights';

const LEVELS = [
  { value: 1, label: '1', color: '#f87171', hint: 'Poor' },
  { value: 2, label: '2', color: '#fb923c', hint: 'Low' },
  { value: 3, label: '3', color: '#fbbf24', hint: 'Okay' },
  { value: 4, label: '4', color: '#34d399', hint: 'Good' },
  { value: 5, label: '5', color: '#c0c0c0', hint: 'Great' },
];

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex-1" role="group" aria-label={label}>
      <div className="text-xs font-medium text-text-secondary mb-2">{label} <span className="text-text-placeholder font-normal">(1 = Poor, 5 = Great)</span></div>
      <div className="flex gap-1">
        {LEVELS.map((l) => (
          <button
            key={l.value}
            type="button"
            onClick={() => onChange(l.value)}
            aria-label={`${label}: ${l.hint}`}
            aria-pressed={value === l.value}
            className={`flex-1 py-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer border ${
              value === l.value
                ? 'border-accent/30 bg-accent-dim shadow-[0_0_12px_rgba(200,200,200,0.08)]'
                : 'border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.08)]'
            }`}
            style={value === l.value ? { color: l.color } : { color: 'rgba(255,255,255,0.25)' }}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DailyCheckin() {
  const submitCheckin = useStore((s) => s.submitCheckin);

  // WHOOP auto-fill, derived (no effect): Sleep seeds from sleep performance %
  // and Energy from recovery %, unless the user has set an override. These feed
  // the wellbeing subscore of Performance, so the game reflects real biometrics.
  const whoop = useWhoopData();
  const whoopSleepLevel = whoop.today.sleep ? whoopScoreToLevel(whoop.today.sleep.performancePct) : null;
  const whoopEnergyLevel = whoop.today.recovery ? whoopScoreToLevel(whoop.today.recovery.recoveryScore) : null;

  const [sleepOverride, setSleepOverride] = useState<number | null>(null);
  const [energyOverride, setEnergyOverride] = useState<number | null>(null);
  const [mood, setMood] = useState(3);
  const [drankLastNight, setDrankLastNight] = useState(false);
  const [smokedLastNight, setSmokedLastNight] = useState(false);
  const [mLastNight, setMLastNight] = useState(false);

  const sleep = sleepOverride ?? whoopSleepLevel ?? 3;
  const energy = energyOverride ?? whoopEnergyLevel ?? 3;
  const autofilled =
    (sleepOverride === null && whoopSleepLevel !== null) ||
    (energyOverride === null && whoopEnergyLevel !== null);

  const handleSubmit = () => {
    const notes = encodeCheckinFlags({ drank: drankLastNight, smoked: smokedLastNight, m: mLastNight });
    submitCheckin(sleep, energy, mood, notes);
  };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
      className="rounded-xl border border-accent/15 bg-gradient-to-r from-accent/[0.04] to-transparent p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-accent uppercase tracking-wider">Daily Check-In</span>
        {autofilled && (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-success bg-success/10 border border-success/20 rounded-full px-2 py-0.5">
            <Activity size={9} /> Auto-filled from WHOOP
          </span>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <Slider label="Sleep Quality" value={sleep} onChange={setSleepOverride} />
        <Slider label="Energy Level" value={energy} onChange={setEnergyOverride} />
        <Slider label="Mood" value={mood} onChange={setMood} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setDrankLastNight(!drankLastNight)}
            aria-pressed={drankLastNight}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
              drankLastNight
                ? 'border-red-400/30 bg-red-400/10 text-red-400'
                : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-text-placeholder hover:border-[rgba(255,255,255,0.1)]'
            }`}
          >
            <Wine size={14} />
            Drank last night
          </button>
          <button
            type="button"
            onClick={() => setSmokedLastNight(!smokedLastNight)}
            aria-pressed={smokedLastNight}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
              smokedLastNight
                ? 'border-red-400/30 bg-red-400/10 text-red-400'
                : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-text-placeholder hover:border-[rgba(255,255,255,0.1)]'
            }`}
          >
            <Cigarette size={14} />
            Smoked last night
          </button>
          <button
            type="button"
            onClick={() => setMLastNight(!mLastNight)}
            aria-pressed={mLastNight}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
              mLastNight
                ? 'border-red-400/30 bg-red-400/10 text-red-400'
                : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] text-text-placeholder hover:border-[rgba(255,255,255,0.1)]'
            }`}
          >
            <Moon size={14} />
            M last night
          </button>
        </div>
        <HUDButton size="sm" onClick={handleSubmit}>Submit Check-In</HUDButton>
      </div>
    </motion.div>
  );
}
