'use client';

import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import { prioritizeQuests } from '@/lib/priority';
import { PILLAR_CONFIG, DIFFICULTY_CONFIG, Pillar, Difficulty, Quest } from '@/lib/types';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDLabel from '@/components/hud/HUDLabel';
import HUDButton from '@/components/hud/HUDButton';
import DifficultyBadge from '@/components/hud/DifficultyBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, X, Brain, Dumbbell, Briefcase, TrendingUp, Sparkles, Users } from 'lucide-react';

const PILLAR_ICONS: Record<Pillar, React.ReactNode> = {
  mind: <Brain size={14} />,
  body: <Dumbbell size={14} />,
  work: <Briefcase size={14} />,
  wealth: <TrendingUp size={14} />,
  spirit: <Sparkles size={14} />,
  social: <Users size={14} />,
};

function QuestCard({ quest }: { quest: Quest }) {
  const completeQuest = useStore((s) => s.completeQuest);
  const [xpPopup, setXpPopup] = useState(false);
  const pillarConfig = PILLAR_CONFIG[quest.pillar];

  const handleComplete = useCallback(() => {
    completeQuest(quest.id);
    setXpPopup(true);
    setTimeout(() => setXpPopup(false), 1500);
  }, [quest.id, completeQuest]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10, height: 0 }}
      className={`
        flex items-center gap-3 p-3 border transition-all relative group
        ${quest.completed
          ? 'border-white/5 bg-white/2 opacity-50'
          : 'border-hud-border bg-hud-panel hover:border-hud-border-bright'}
      `}
    >
      <button
        onClick={handleComplete}
        disabled={quest.completed}
        className={`
          w-6 h-6 flex-shrink-0 border-2 flex items-center justify-center transition-all cursor-pointer
          ${quest.completed
            ? 'border-hud-green bg-hud-green/20'
            : 'border-hud-green/30 hover:border-hud-green hover:bg-hud-green/10'}
        `}
      >
        {quest.completed && <Check size={12} className="text-hud-green" />}
      </button>

      <div
        className="w-6 h-6 flex-shrink-0 flex items-center justify-center"
        style={{ color: pillarConfig.color }}
      >
        {PILLAR_ICONS[quest.pillar]}
      </div>

      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${quest.completed ? 'line-through' : ''}`}>
          {quest.title}
        </div>
        <div className="text-[10px] text-hud-text-dim uppercase tracking-[1px]">
          {pillarConfig.label}
        </div>
      </div>

      <DifficultyBadge difficulty={quest.difficulty} />

      <div className="text-[11px] font-[family-name:var(--font-orbitron)] text-hud-green glow-text whitespace-nowrap">
        +{quest.xp_reward} XP
      </div>

      <AnimatePresence>
        {xpPopup && (
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -30 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="absolute right-4 -top-2 text-hud-green font-[family-name:var(--font-orbitron)] text-sm glow-text pointer-events-none"
          >
            +{quest.xp_reward} XP
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function PriorityQueue() {
  const quests = useStore((s) => s.quests);
  const pillars = useStore((s) => s.pillars);
  const todayCheckin = useStore((s) => s.todayCheckin);
  const addQuest = useStore((s) => s.addQuest);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPillar, setNewPillar] = useState<Pillar>('work');
  const [newDifficulty, setNewDifficulty] = useState<Difficulty>('MED');

  const todayQuests = useMemo(() => {
    const incomplete = quests.filter((q) => !q.completed && (q.quest_type === 'daily' || q.quest_type === 'side'));
    const completed = quests.filter((q) => q.completed);
    const prioritized = prioritizeQuests(incomplete, pillars, todayCheckin);
    return [...prioritized, ...completed];
  }, [quests, pillars, todayCheckin]);

  const handleAddQuest = () => {
    if (!newTitle.trim()) return;
    addQuest({
      title: newTitle.trim(),
      description: null,
      pillar: newPillar,
      difficulty: newDifficulty,
      xp_reward: DIFFICULTY_CONFIG[newDifficulty].xp,
      quest_type: 'side',
      is_recurring: false,
      recurrence_rule: null,
      due_date: null,
    });
    setNewTitle('');
    setShowAddForm(false);
  };

  return (
    <HUDPanel delay={2}>
      <div className="flex items-center justify-between mb-1">
        <HUDLabel text="Priority Queue" />
        <HUDButton
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? <X size={12} /> : <><Plus size={12} /> Add Quest</>}
        </HUDButton>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 border border-hud-border p-3 bg-hud-panel"
          >
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Quest title..."
                className="w-full bg-white/5 border border-hud-border px-3 py-2 text-sm text-hud-text placeholder:text-hud-text-dim focus:outline-none focus:border-hud-green/40"
                onKeyDown={(e) => e.key === 'Enter' && handleAddQuest()}
              />
              <div className="flex gap-2 flex-wrap">
                <select
                  value={newPillar}
                  onChange={(e) => setNewPillar(e.target.value as Pillar)}
                  className="bg-white/5 border border-hud-border px-2 py-1 text-xs text-hud-text focus:outline-none focus:border-hud-green/40"
                >
                  {Object.entries(PILLAR_CONFIG).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
                <select
                  value={newDifficulty}
                  onChange={(e) => setNewDifficulty(e.target.value as Difficulty)}
                  className="bg-white/5 border border-hud-border px-2 py-1 text-xs text-hud-text focus:outline-none focus:border-hud-green/40"
                >
                  {Object.entries(DIFFICULTY_CONFIG).map(([key, val]) => (
                    <option key={key} value={key}>{val.label} (+{val.xp} XP)</option>
                  ))}
                </select>
                <HUDButton size="sm" onClick={handleAddQuest}>
                  Create
                </HUDButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-1">
        <AnimatePresence mode="popLayout">
          {todayQuests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </AnimatePresence>
        {todayQuests.length === 0 && (
          <div className="text-center py-8 text-hud-text-dim text-sm">
            No quests loaded. Add one to begin your mission.
          </div>
        )}
      </div>
    </HUDPanel>
  );
}
