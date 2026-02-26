'use client';

import { useStore } from '@/stores/useStore';
import HUDPanel from '@/components/hud/HUDPanel';
import RadarChart from '@/components/hud/RadarChart';
import { PILLAR_CONFIG, Pillar } from '@/lib/types';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export default function LifeBalanceRadar() {
  const pillars = useStore((s) => s.pillars);

  return (
    <HUDPanel delay={2}>
      <h2 className="text-base font-semibold text-text-primary mb-4">Life Balance</h2>
      <div className="flex flex-col items-center">
        <RadarChart pillars={pillars} size={200} />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 w-full">
          {pillars.map((p) => {
            const config = PILLAR_CONFIG[p.pillar];
            const trend = p.streak > 2 ? 'up' : p.streak === 0 && p.current_xp > 0 ? 'down' : 'neutral';
            return (
              <div key={p.pillar} className="flex items-center gap-2 p-2 rounded-lg bg-bg-secondary">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-text-secondary truncate">{config.label}</div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-text-tertiary">Lv.{p.level}</span>
                    {p.streak > 0 && <span className="text-[10px] text-text-placeholder">· {p.streak}d</span>}
                    {trend === 'up' && <ArrowUp size={10} className="text-success" />}
                    {trend === 'down' && <ArrowDown size={10} className="text-danger" />}
                    {trend === 'neutral' && <Minus size={10} className="text-text-placeholder" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </HUDPanel>
  );
}
