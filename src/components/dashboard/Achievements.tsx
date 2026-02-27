'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/stores/useStore';
import { ACHIEVEMENTS, getUnlockedAchievements, getLockedAchievements, getAchievementProgress, AchievementContext, Achievement } from '@/lib/achievements';
import { getLevelFromXP } from '@/lib/xp';
import HUDPanel from '@/components/hud/HUDPanel';
import { motion } from 'framer-motion';
import {
  Trophy, Zap, Target, Hash, Cpu, Sparkles, Flame, Calendar, Swords, Crown,
  Star, Stars, Orbit, Gem, TrendingUp, Award, Crosshair, Medal, Rocket,
  Scale, Microscope, Landmark, Lock,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Zap, Target, Hash, Cpu, Sparkles, Flame, Calendar, Swords, Crown, Trophy,
  Star, Stars, Orbit, Gem, TrendingUp, Award, Crosshair, Medal, Rocket,
  Scale, Microscope, Landmark,
};

function AchievementIcon({ name, unlocked, size = 16 }: { name: string; unlocked: boolean; size?: number }) {
  const Icon = ICON_MAP[name];
  if (!Icon) return <Lock size={size} className="text-text-placeholder" />;

  if (!unlocked) return <Lock size={size} className="text-text-placeholder" />;

  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-accent/20 to-purple/15 shadow-[0_0_10px_rgba(200,200,200,0.1)]">
      <Icon size={size} className="text-accent" />
    </div>
  );
}

function AchievementCard({ achievement, unlocked, progress }: { achievement: Achievement; unlocked: boolean; progress: number }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className={`relative p-3 rounded-xl border transition-all ${
        unlocked
          ? 'border-accent/15 bg-gradient-to-r from-accent/[0.06] to-purple/[0.04] shadow-[0_0_16px_rgba(200,200,200,0.04)]'
          : 'border-[rgba(255,255,255,0.03)] bg-[rgba(0,0,0,0.4)] opacity-50'
      }`}>
      <div className="flex items-center gap-2.5">
        <div className="flex-shrink-0">
          <AchievementIcon name={achievement.icon} unlocked={unlocked} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={`text-xs font-semibold ${unlocked ? 'text-text-primary' : 'text-text-placeholder'}`}>
            {achievement.title}
          </div>
          <div className="text-[11px] text-text-placeholder">{achievement.description}</div>
        </div>
      </div>
      {!unlocked && progress > 0 && (
        <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <div className="h-full rounded-full transition-all" style={{
            width: `${progress * 100}%`,
            background: 'linear-gradient(90deg, rgba(200,200,200,0.3), rgba(150,150,150,0.3))',
          }} />
        </div>
      )}
    </motion.div>
  );
}

export default function Achievements() {
  const user = useStore((s) => s.user);
  const quests = useStore((s) => s.quests);
  const pillars = useStore((s) => s.pillars);
  const goals = useStore((s) => s.goals);
  const subTasks = useStore((s) => s.subTasks);
  const todayCheckin = useStore((s) => s.todayCheckin);
  const [showAll, setShowAll] = useState(false);

  const ctx: AchievementContext = useMemo(() => {
    const dailyQuests = quests.filter((q) => q.quest_type === 'daily');
    return {
      totalXP: user?.total_xp || 0, currentStreak: user?.current_streak || 0,
      longestStreak: user?.longest_streak || 0, tasksCompleted: quests.filter((q) => q.completed).length,
      dailyTasksCompleted: dailyQuests.filter((q) => q.completed).length, totalDailyTasks: dailyQuests.length,
      goalsCompleted: goals.filter((g) => g.status === 'completed').length, goalsCreated: goals.length,
      pillars, quests, subTasks, checkedIn: !!todayCheckin, level: user ? getLevelFromXP(user.total_xp) : 1,
    };
  }, [user, quests, pillars, goals, subTasks, todayCheckin]);

  const unlocked = getUnlockedAchievements(ctx);
  const locked = getLockedAchievements(ctx);
  const displayLocked = showAll ? locked : locked.slice(0, 3);

  return (
    <HUDPanel delay={4}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy size={13} className="text-accent drop-shadow-[0_0_6px_rgba(200,200,200,0.3)]" />
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Achievements</h2>
        </div>
        <span className="text-xs text-text-placeholder font-medium tabular-nums">{unlocked.length}/{ACHIEVEMENTS.length}</span>
      </div>

      {unlocked.length === 0 && (
        <div className="text-center py-5">
          <Trophy size={28} className="mx-auto mb-1.5 text-text-placeholder opacity-30" />
          <p className="text-xs text-text-placeholder">Complete tasks to unlock.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-1.5">
        {unlocked.map((a) => <AchievementCard key={a.id} achievement={a} unlocked progress={1} />)}
        {displayLocked.map((a) => <AchievementCard key={a.id} achievement={a} unlocked={false} progress={getAchievementProgress(a, ctx)} />)}
      </div>

      {locked.length > 3 && (
        <button onClick={() => setShowAll(!showAll)}
          className="w-full mt-2.5 text-xs text-text-placeholder hover:text-accent transition-colors cursor-pointer py-1">
          {showAll ? 'Show less' : `Show all ${locked.length} locked`}
        </button>
      )}
    </HUDPanel>
  );
}
