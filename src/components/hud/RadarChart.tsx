'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LifePillar, PILLAR_CONFIG, Pillar } from '@/lib/types';

const PILLAR_ORDER: Pillar[] = ['mind', 'body', 'work', 'wealth', 'spirit', 'social'];

export default function RadarChart({ pillars, size = 200 }: { pillars: LifePillar[]; size?: number }) {
  const center = size / 2;
  const maxRadius = size / 2 - 30;
  const levels = 5;

  const pillarMap = useMemo(() => {
    const map: Record<string, LifePillar> = {};
    pillars.forEach((p) => { map[p.pillar] = p; });
    return map;
  }, [pillars]);

  const maxLevel = Math.max(...pillars.map((p) => p.level), 5);

  const getPoint = (i: number, val: number, max: number) => {
    const angle = (Math.PI * 2 * i) / PILLAR_ORDER.length - Math.PI / 2;
    const r = (val / max) * maxRadius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const gridLines = useMemo(() => {
    const lines = [];
    for (let l = 1; l <= levels; l++) {
      const pts = PILLAR_ORDER.map((_, i) => getPoint(i, l, levels));
      lines.push(pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z');
    }
    return lines;
  }, [size]);

  const axes = useMemo(() => PILLAR_ORDER.map((_, i) => {
    const end = getPoint(i, levels, levels);
    return { x1: center, y1: center, x2: end.x, y2: end.y };
  }), [size]);

  const data = PILLAR_ORDER.map((p, i) => getPoint(i, pillarMap[p] ? Math.min(pillarMap[p].level, maxLevel) : 0, maxLevel));
  const path = data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  const labels = PILLAR_ORDER.map((p, i) => ({ pillar: p, ...getPoint(i, levels + 1.3, levels) }));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c0c0c0" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#888888" stopOpacity={0.06} />
          </linearGradient>
        </defs>
        {gridLines.map((d, i) => <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={1} />)}
        {axes.map((l, i) => <line key={i} {...l} stroke="rgba(255,255,255,0.03)" strokeWidth={1} />)}
        <motion.path d={path} fill="url(#radarFill)" stroke="#c0c0c0" strokeWidth={2}
          initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }} style={{ transformOrigin: `${center}px ${center}px`, filter: 'drop-shadow(0 0 8px rgba(200,200,200,0.15))' }} />
        {data.map((p, i) => (
          <motion.circle key={i} cx={p.x} cy={p.y} r={3} fill="#c0c0c0" stroke="#0a0a0a" strokeWidth={2}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 + i * 0.05 }}
            style={{ filter: 'drop-shadow(0 0 4px rgba(200,200,200,0.3))' }} />
        ))}
      </svg>
      {labels.map(({ pillar, x, y }) => (
        <div key={pillar} className="absolute text-[10px] font-medium text-text-placeholder whitespace-nowrap"
          style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}>
          {PILLAR_CONFIG[pillar].label}
        </div>
      ))}
    </div>
  );
}
