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
  const xpProgress = getXPProgress(user.total_xp);
  const characterClass = getCharacterClass(pillars);
  const completedQuests = quests.filter((q) => q.completed).length;

  return (
    <HUDPanel delay={3}>
      <h2 className="text-base font-semibold text-text-primary mb-4">Character</h2>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-accent-light text-accent flex items-center justify-center text-lg font-bold flex-shrink-0">
          {level}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text-primary">{characterClass}</div>
          <XPBar percentage={xpProgress.percentage} current={xpProgress.current} required={xpProgress.required} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: <Trophy size={14} />, label: 'Completed', value: completedQuests, color: '#228be6' },
          { icon: <Flame size={14} />, label: 'Streak', value: `${user.current_streak}d`, color: '#fab005' },
          { icon: <Zap size={14} />, label: 'Total XP', value: user.total_xp.toLocaleString(), color: '#7950f2' },
          { icon: <Shield size={14} />, label: 'Shield', value: user.current_streak >= 7 ? 'Active' : 'Off', color: user.current_streak >= 7 ? '#40c057' : '#adb5bd' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2 p-2.5 rounded-lg bg-bg-secondary">
            <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
              {item.icon}
            </div>
            <div>
              <div className="text-sm font-semibold text-text-primary leading-tight">{item.value}</div>
              <div className="text-[11px] text-text-tertiary">{item.label}</div>
            </div>
          </div>
        ))}
      </div>
    </HUDPanel>
  );
}
