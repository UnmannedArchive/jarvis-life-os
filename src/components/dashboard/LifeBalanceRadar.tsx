'use client';

import { useStore } from '@/stores/useStore';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDLabel from '@/components/hud/HUDLabel';
import RadarChart from '@/components/hud/RadarChart';
import { PILLAR_CONFIG, Pillar } from '@/lib/types';
import { getLevelFromXP } from '@/lib/xp';
import { Brain, Dumbbell, Briefcase, TrendingUp, Sparkles, Users, ArrowUp, ArrowDown, Minus } from 'lucide-react';

const PILLAR_ICONS: Record<Pillar, React.ReactNode> = {
  mind: <Brain size={14} />,
  body: <Dumbbell size={14} />,
  work: <Briefcase size={14} />,
  wealth: <TrendingUp size={14} />,
  spirit: <Sparkles size={14} />,
  social: <Users size={14} />,
};

export default function LifeBalanceRadar() {
  const pillars = useStore((s) => s.pillars);

  return (
    <HUDPanel delay={3}>
      <HUDLabel text="Life Balance" />
      <div className="flex flex-col items-center">
        <RadarChart pillars={pillars} size={220} />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 w-full">
          {pillars.map((p) => {
            const config = PILLAR_CONFIG[p.pillar];
            const trend = p.streak > 3 ? 'up' : p.streak === 0 ? 'down' : 'neutral';

            return (
              <div
                key={p.pillar}
                className="flex items-center gap-2 p-2 border border-white/5 bg-white/2"
              >
                <div
                  className="w-6 h-6 flex items-center justify-center flex-shrink-0"
                  style={{ color: config.color }}
                >
                  {PILLAR_ICONS[p.pillar]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-[family-name:var(--font-orbitron)] tracking-[1px] uppercase text-hud-text-muted truncate">
                    {config.label}
                  </div>
                  <div className="flex items-center gap-1">
                    <span
                      className="text-xs font-[family-name:var(--font-orbitron)]"
                      style={{ color: config.color }}
                    >
                      LV{p.level}
                    </span>
                    <span className="text-[9px] text-hud-text-dim">
                      {p.streak}d
                    </span>
                    {trend === 'up' && <ArrowUp size={10} className="text-hud-green" />}
                    {trend === 'down' && <ArrowDown size={10} className="text-hud-danger" />}
                    {trend === 'neutral' && <Minus size={10} className="text-hud-text-dim" />}
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
