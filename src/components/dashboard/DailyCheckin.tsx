'use client';

import { useState } from 'react';
import { useStore } from '@/stores/useStore';
import HUDButton from '@/components/hud/HUDButton';
import { motion } from 'framer-motion';

const EMOJIS = ['😴', '😐', '🙂', '😊', '🔥'];

interface SliderProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
}

function MetricSlider({ label, value, onChange }: SliderProps) {
  return (
    <div className="flex-1 min-w-0">
      <div className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-muted mb-2">
        {label}
      </div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((val) => (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={`
              flex-1 py-1.5 text-center text-sm border transition-all cursor-pointer
              ${value === val
                ? 'border-hud-green/50 bg-hud-green/15 text-hud-green'
                : 'border-white/5 bg-white/3 text-hud-text-dim hover:border-hud-green/20 hover:bg-hud-green/5'}
            `}
          >
            {EMOJIS[val - 1]}
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
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="border border-hud-cyan/20 bg-hud-cyan/5 p-3 mt-2"
    >
      <div className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-cyan mb-3 glow-text-cyan">
        ◆ Daily Pulse Check-In
      </div>
      <div className="flex flex-col sm:flex-row gap-4 mb-3">
        <MetricSlider label="Sleep Quality" value={sleep} onChange={setSleep} />
        <MetricSlider label="Energy Level" value={energy} onChange={setEnergy} />
        <MetricSlider label="Mood" value={mood} onChange={setMood} />
      </div>
      <HUDButton
        variant="secondary"
        size="sm"
        onClick={() => submitCheckin(sleep, energy, mood)}
      >
        Submit Check-In
      </HUDButton>
    </motion.div>
  );
}
