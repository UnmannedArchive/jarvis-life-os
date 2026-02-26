'use client';

import { useState } from 'react';
import { useStore } from '@/stores/useStore';
import HUDButton from '@/components/hud/HUDButton';
import { motion } from 'framer-motion';

const LEVELS = [
  { value: 1, emoji: '😴', label: 'Low' },
  { value: 2, emoji: '😐', label: 'Below avg' },
  { value: 3, emoji: '🙂', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '🔥', label: 'Great' },
];

function MetricSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex-1">
      <div className="text-xs font-medium text-text-secondary mb-2">{label}</div>
      <div className="flex gap-1">
        {LEVELS.map((l) => (
          <button
            key={l.value}
            onClick={() => onChange(l.value)}
            className={`flex-1 py-2 rounded-lg text-center text-base transition-all cursor-pointer border ${
              value === l.value
                ? 'border-accent bg-accent-light'
                : 'border-border bg-white hover:border-border-hover'
            }`}
          >
            {l.emoji}
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
      className="bg-accent-light/50 border border-accent/20 rounded-lg p-4"
    >
      <div className="text-sm font-semibold text-accent mb-3">Daily Check-In</div>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <MetricSlider label="Sleep Quality" value={sleep} onChange={setSleep} />
        <MetricSlider label="Energy Level" value={energy} onChange={setEnergy} />
        <MetricSlider label="Mood" value={mood} onChange={setMood} />
      </div>
      <HUDButton size="sm" onClick={() => submitCheckin(sleep, energy, mood)}>
        Submit Check-In
      </HUDButton>
    </motion.div>
  );
}
