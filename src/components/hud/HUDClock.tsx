'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export default function HUDClock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!time) {
    return (
      <div className="font-[family-name:var(--font-orbitron)] text-hud-green text-sm tracking-[3px] glow-text">
        --:--:-- --- // --- --- -- ----
      </div>
    );
  }

  const hours = format(time, 'HH');
  const minutes = format(time, 'mm');
  const seconds = format(time, 'ss');
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace('_', ' ') || 'LOCAL';
  const dateStr = format(time, 'EEE MMM dd yyyy').toUpperCase();

  return (
    <div className="font-[family-name:var(--font-orbitron)] text-hud-green text-sm tracking-[3px] glow-text flex items-center gap-0">
      <span>{hours}</span>
      <span className="clock-separator">:</span>
      <span>{minutes}</span>
      <span className="clock-separator">:</span>
      <span>{seconds}</span>
      <span className="text-hud-green/40 mx-2">//</span>
      <span className="text-hud-text-muted text-[11px]">{dateStr}</span>
    </div>
  );
}
