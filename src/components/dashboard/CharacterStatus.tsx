'use client';

import { useStore } from '@/stores/useStore';
import { getLevelFromXP, getXPProgress, getCharacterClass } from '@/lib/xp';
import HUDPanel from '@/components/hud/HUDPanel';
import XPBar from '@/components/hud/XPBar';
import { Shield, Flame, Trophy, Zap } from 'lucide-react';

export default function CharacterStatus() {
  const user = useStore((s) => s.user);
  const pillars = useStore((s) => s.pillars);
  const quests = useStore((s) => s.quests);
  if (!user) return null;

  const level = getLevelFromXP(user.total_xp);
  const xp = getXPProgress(user.total_xp);
  const cls = getCharacterClass(pillars);
  const done = quests.filter((q) => q.completed).length;

  return (
    <HUDPanel delay={3} glow>
      <h2 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wider">Character</h2>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-purple/15 border border-accent/10 flex items-center justify-center text-xl font-black text-accent shadow-[0_0_24px_rgba(200,200,200,0.1)] flex-shrink-0">
          {level}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold text-text-primary">{cls}</div>
          <div className="text-xs text-text-tertiary mb-1.5">Level {level}</div>
          <XPBar percentage={xp.percentage} current={xp.current} required={xp.required} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: <Trophy size={13} />, label: 'Completed', value: done, color: '#c0c0c0' },
          { icon: <Flame size={13} />, label: 'Streak', value: `${user.current_streak}d`, color: '#fbbf24' },
          { icon: <Zap size={13} />, label: 'Total XP', value: user.total_xp.toLocaleString(), color: '#888888' },
          { icon: <Shield size={13} />, label: 'Shield', value: user.current_streak >= 7 ? 'Active' : 'Off', color: user.current_streak >= 7 ? '#34d399' : '#555555' },
        ].map((i) => (
          <div key={i.label} className="flex items-center gap-2 p-2.5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.03)] group hover:border-[rgba(255,255,255,0.06)] transition-all">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110"
              style={{ background: `linear-gradient(135deg, ${i.color}18, ${i.color}08)`, color: i.color }}>
              {i.icon}
            </div>
            <div>
              <div className="text-sm font-bold text-text-primary leading-tight tabular-nums">{i.value}</div>
              <div className="text-[10px] text-text-placeholder">{i.label}</div>
            </div>
          </div>
        ))}
      </div>
    </HUDPanel>
  );
}
