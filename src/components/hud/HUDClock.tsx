'use client';

import { useSyncExternalStore } from 'react';
import { format } from 'date-fns';

// One subscription drives the minute ticks; the snapshot is the formatted
// string (value-compared, so unchanged minutes don't re-render). The server
// snapshot is null — the clock renders nothing in SSR/hydration, exactly as
// the old null-state pattern did, without setState-in-effect.
function subscribe(onTick: () => void): () => void {
  const i = setInterval(onTick, 60_000);
  return () => clearInterval(i);
}

function getSnapshot(): string {
  return format(new Date(), 'EEE, MMM d · h:mm a');
}

function getServerSnapshot(): string | null {
  return null;
}

export default function HUDClock() {
  const label = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!label) return null;
  return <span className="text-sm text-text-tertiary font-medium">{label}</span>;
}
