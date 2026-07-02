'use client';

import { useStore } from '@/stores/useStore';
import HUDPanel from '@/components/hud/HUDPanel';
import RadarChart from '@/components/hud/RadarChart';
import { PILLAR_CONFIG } from '@/lib/types';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export default function LifeBalanceRadar() {
  const pillars = useStore((s) => s.pillars);
  // Pillars are seeded at level 1 / 0 XP, so "has data" means real earned XP,
  // not mere existence — otherwise the empty state would never show.
  const hasAnyData = pillars.some((p) => p.current_xp > 0);

  return (
    <HUDPanel delay={2}>
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Life Balance</h2>
      <div className="flex flex-col items-center">
        {!hasAnyData ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center" style={{ minHeight: 190 }}>
            <RadarChart pillars={pillars} size={190} empty />
            <p className="text-xs text-text-tertiary mt-3 max-w-[200px]">Complete tasks to see your life balance across Mind, Body, Work, Wealth, Spirit, and Social.</p>
          </div>
        ) : (
          <RadarChart pillars={pillars} size={190} />
        )}
        {pillars.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-4 w-full">
          {pillars.map((p) => {
            const cfg = PILLAR_CONFIG[p.pillar];
            const trend = p.streak > 2 ? 'up' : p.streak === 0 && p.current_xp > 0 ? 'down' : 'neutral';
            return (
              <div key={p.pillar} className="flex items-center gap-2 p-2 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.03)]">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-[0_0_4px_currentColor]" style={{ backgroundColor: cfg.color, color: cfg.color }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-medium text-text-secondary truncate">{cfg.label}</div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-text-placeholder tabular-nums">Lv.{p.level}</span>
                    {p.streak > 0 && <span className="text-[10px] text-text-placeholder">· {p.streak}d</span>}
                    {trend === 'up' && <ArrowUp size={9} className="text-success" />}
                    {trend === 'down' && <ArrowDown size={9} className="text-danger" />}
                    {trend === 'neutral' && <Minus size={9} className="text-text-placeholder" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </HUDPanel>
  );
}
