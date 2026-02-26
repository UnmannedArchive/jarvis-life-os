'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { LifePillar, PILLAR_CONFIG, Pillar } from '@/lib/types';

interface RadarChartProps {
  pillars: LifePillar[];
  size?: number;
}

const PILLAR_ORDER: Pillar[] = ['mind', 'body', 'work', 'wealth', 'spirit', 'social'];

export default function RadarChart({ pillars, size = 240 }: RadarChartProps) {
  const center = size / 2;
  const maxRadius = size / 2 - 30;
  const levels = 5;

  const pillarMap = useMemo(() => {
    const map: Record<string, LifePillar> = {};
    pillars.forEach((p) => { map[p.pillar] = p; });
    return map;
  }, [pillars]);

  const maxLevel = Math.max(...pillars.map((p) => p.level), 5);

  const getPoint = (index: number, value: number, max: number) => {
    const angle = (Math.PI * 2 * index) / PILLAR_ORDER.length - Math.PI / 2;
    const radius = (value / max) * maxRadius;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  const gridLines = useMemo(() => {
    const lines = [];
    for (let level = 1; level <= levels; level++) {
      const points = PILLAR_ORDER.map((_, i) =>
        getPoint(i, level, levels),
      );
      const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
      lines.push(path);
    }
    return lines;
  }, [size]);

  const axisLines = useMemo(
    () =>
      PILLAR_ORDER.map((_, i) => {
        const end = getPoint(i, levels, levels);
        return { x1: center, y1: center, x2: end.x, y2: end.y };
      }),
    [size],
  );

  const dataPoints = PILLAR_ORDER.map((pillar, i) => {
    const p = pillarMap[pillar];
    const value = p ? Math.min(p.level, maxLevel) : 0;
    return getPoint(i, value, maxLevel);
  });

  const dataPath =
    dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  const labelPositions = PILLAR_ORDER.map((pillar, i) => {
    const point = getPoint(i, levels + 1.2, levels);
    return { pillar, ...point };
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {gridLines.map((path, i) => (
          <path
            key={i}
            d={path}
            fill="none"
            stroke="rgba(0,255,136,0.08)"
            strokeWidth={1}
          />
        ))}

        {axisLines.map((line, i) => (
          <line
            key={i}
            {...line}
            stroke="rgba(0,255,136,0.1)"
            strokeWidth={1}
          />
        ))}

        <motion.path
          d={dataPath}
          fill="rgba(0,255,136,0.1)"
          stroke="#00ff88"
          strokeWidth={2}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            transformOrigin: `${center}px ${center}px`,
            filter: 'drop-shadow(0 0 6px rgba(0,255,136,0.4))',
          }}
        />

        {dataPoints.map((point, i) => (
          <motion.circle
            key={i}
            cx={point.x}
            cy={point.y}
            r={3}
            fill="#00ff88"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.8 + i * 0.1 }}
            style={{ filter: 'drop-shadow(0 0 4px rgba(0,255,136,0.6))' }}
          />
        ))}
      </svg>

      {labelPositions.map(({ pillar, x, y }) => {
        const config = PILLAR_CONFIG[pillar];
        return (
          <div
            key={pillar}
            className="absolute text-[9px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase whitespace-nowrap"
            style={{
              left: x,
              top: y,
              transform: 'translate(-50%, -50%)',
              color: config.color,
              textShadow: `0 0 6px ${config.color}44`,
            }}
          >
            {config.label}
          </div>
        );
      })}
    </div>
  );
}
