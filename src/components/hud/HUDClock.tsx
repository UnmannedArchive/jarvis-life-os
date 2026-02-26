'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

export default function HUDClock() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(new Date());
    const interval = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  if (!time) return null;

  return (
    <span className="text-sm text-text-tertiary font-medium">
      {format(time, 'EEE, MMM d · h:mm a')}
    </span>
  );
}
