'use client';

import { useState } from 'react';
import { useStore } from '@/stores/useStore';
import HUDButton from '@/components/hud/HUDButton';
import { motion } from 'framer-motion';

const LEVELS = [
  { value: 1, label: '1', color: '#f87171' },
  { value: 2, label: '2', color: '#fb923c' },
  { value: 3, label: '3', color: '#fbbf24' },
  { value: 4, label: '4', color: '#34d399' },
  { value: 5, label: '5', color: '#c0c0c0' },
];

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex-1">
      <div className="text-xs font-medium text-text-secondary mb-2">{label}</div>
      <div className="flex gap-1">
        {LEVELS.map((l) => (
          <button key={l.value} onClick={() => onChange(l.value)}
            className={`flex-1 py-2 rounded-xl text-center text-xs font-bold transition-all cursor-pointer border ${
              value === l.value
                ? 'border-accent/30 bg-accent-dim shadow-[0_0_12px_rgba(200,200,200,0.08)]'
                : 'border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.08)]'
            }`}
            style={value === l.value ? { color: l.color } : { color: 'rgba(255,255,255,0.25)' }}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DailyCheckin() {
  const [sleep, setSleep] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [mood, setMood] = useState(3);
  const submitCheckin = useStore((s) => s.submitCheckin);

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
      className="rounded-xl border border-accent/15 bg-gradient-to-r from-accent/[0.04] to-transparent p-4">
      <div className="text-xs font-semibold text-accent mb-3 uppercase tracking-wider">Daily Check-In</div>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <Slider label="Sleep Quality" value={sleep} onChange={setSleep} />
        <Slider label="Energy Level" value={energy} onChange={setEnergy} />
        <Slider label="Mood" value={mood} onChange={setMood} />
      </div>
      <HUDButton size="sm" onClick={() => submitCheckin(sleep, energy, mood)}>Submit Check-In</HUDButton>
    </motion.div>
  );
}
