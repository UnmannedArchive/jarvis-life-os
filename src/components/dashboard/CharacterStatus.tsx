'use client';

import { useStore } from '@/stores/useStore';
import { getLevelFromXP, getXPProgress, getCharacterClass } from '@/lib/xp';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDLabel from '@/components/hud/HUDLabel';
import XPBar from '@/components/hud/XPBar';
import StatCard from '@/components/hud/StatCard';
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
    <HUDPanel delay={4}>
      <HUDLabel text="Character Status" />

      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-16 h-16 border-2 border-hud-green/40 flex items-center justify-center flex-shrink-0"
          style={{ boxShadow: '0 0 20px rgba(0,255,136,0.15)' }}
        >
          <span className="font-[family-name:var(--font-orbitron)] text-2xl text-hud-green glow-text">
            {level}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[3px] text-hud-cyan glow-text-cyan uppercase mb-1">
            CLASS: {characterClass} // LEVEL {level}
          </div>
          <XPBar
            percentage={xpProgress.percentage}
            current={xpProgress.current}
            required={xpProgress.required}
            label="XP Progress"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<Trophy size={14} />}
          label="Completed"
          value={completedQuests}
          sublabel="quests total"
          color="#00ff88"
          delay={5}
        />
        <StatCard
          icon={<Flame size={14} />}
          label="Streak"
          value={`${user.current_streak}d`}
          sublabel={`best: ${user.longest_streak}d`}
          color="#ffd740"
          delay={6}
        />
        <StatCard
          icon={<Zap size={14} />}
          label="Total XP"
          value={user.total_xp.toLocaleString()}
          color="#00e5ff"
          delay={7}
        />
        <StatCard
          icon={<Shield size={14} />}
          label="Shield"
          value={user.current_streak >= 7 ? 'ACTIVE' : 'OFF'}
          sublabel={user.current_streak >= 7 ? '1 miss allowed' : 'Need 7d streak'}
          color={user.current_streak >= 7 ? '#00ff88' : '#7fba9a'}
          delay={8}
        />
      </div>
    </HUDPanel>
  );
}
