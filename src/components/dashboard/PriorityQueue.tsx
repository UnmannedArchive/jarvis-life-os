'use client';

import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import { prioritizeQuests } from '@/lib/priority';
import { PILLAR_CONFIG, DIFFICULTY_CONFIG, Pillar, Difficulty, Quest } from '@/lib/types';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDButton from '@/components/hud/HUDButton';
import DifficultyBadge from '@/components/hud/DifficultyBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, X } from 'lucide-react';

function QuestCard({ quest }: { quest: Quest }) {
  const completeQuest = useStore((s) => s.completeQuest);
  const [xpPopup, setXpPopup] = useState(false);
  const pillarConfig = PILLAR_CONFIG[quest.pillar];

  const handleComplete = useCallback(() => {
    if (quest.completed) return;
    completeQuest(quest.id);
    setXpPopup(true);
    setTimeout(() => setXpPopup(false), 1500);
  }, [quest.id, quest.completed, completeQuest]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all relative group ${
        quest.completed
          ? 'bg-bg-secondary border-border opacity-60'
          : 'bg-white border-border hover:border-border-hover hover:shadow-sm'
      }`}
    >
      <button
        onClick={handleComplete}
        disabled={quest.completed}
        className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all cursor-pointer ${
          quest.completed
            ? 'border-success bg-success'
            : 'border-border-hover hover:border-accent'
        }`}
      >
        {quest.completed && <Check size={10} className="text-white" strokeWidth={3} />}
      </button>

      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: pillarConfig.color }}
      />

      <div className="flex-1 min-w-0">
        <div className={`text-sm ${quest.completed ? 'line-through text-text-tertiary' : 'text-text-primary'}`}>
          {quest.title}
        </div>
      </div>

      <DifficultyBadge difficulty={quest.difficulty} />

      <span className="text-xs font-medium text-text-tertiary whitespace-nowrap">
        +{quest.xp_reward} XP
      </span>

      <AnimatePresence>
        {xpPopup && (
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -24 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute right-4 -top-2 text-accent font-semibold text-sm pointer-events-none"
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
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPillar, setNewPillar] = useState<Pillar>('work');
  const [newDifficulty, setNewDifficulty] = useState<Difficulty>('MED');
  const [newType, setNewType] = useState<'daily' | 'side'>('daily');

  const todayQuests = useMemo(() => {
    const active = quests.filter((q) => !q.completed && (q.quest_type === 'daily' || q.quest_type === 'side'));
    const done = quests.filter((q) => q.completed);
    return [...prioritizeQuests(active, pillars, todayCheckin), ...done];
  }, [quests, pillars, todayCheckin]);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addQuest({
      title: newTitle.trim(),
      description: null,
      pillar: newPillar,
      difficulty: newDifficulty,
      xp_reward: DIFFICULTY_CONFIG[newDifficulty].xp,
      quest_type: newType,
      is_recurring: newType === 'daily',
      recurrence_rule: newType === 'daily' ? 'daily' : null,
      due_date: null,
    });
    setNewTitle('');
    setShowAdd(false);
  };

  return (
    <HUDPanel delay={1}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-text-primary">Today&apos;s Tasks</h2>
        <HUDButton size="sm" variant="secondary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? <X size={14} /> : <><Plus size={14} /> Add Task</>}
        </HUDButton>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 rounded-lg border border-border p-4 bg-bg-secondary"
          >
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="What do you need to do?"
                className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
              <div className="flex gap-2 flex-wrap items-center">
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as 'daily' | 'side')}
                  className="bg-white border border-border rounded-lg px-2.5 py-1.5 text-sm text-text-secondary"
                >
                  <option value="daily">Daily (recurring)</option>
                  <option value="side">One-time</option>
                </select>
                <select
                  value={newPillar}
                  onChange={(e) => setNewPillar(e.target.value as Pillar)}
                  className="bg-white border border-border rounded-lg px-2.5 py-1.5 text-sm text-text-secondary"
                >
                  {Object.entries(PILLAR_CONFIG).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
                <select
                  value={newDifficulty}
                  onChange={(e) => setNewDifficulty(e.target.value as Difficulty)}
                  className="bg-white border border-border rounded-lg px-2.5 py-1.5 text-sm text-text-secondary"
                >
                  {Object.entries(DIFFICULTY_CONFIG).map(([key, val]) => (
                    <option key={key} value={key}>{val.label} · {val.xp} XP</option>
                  ))}
                </select>
                <HUDButton size="sm" onClick={handleAdd}>Create</HUDButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-1.5">
        <AnimatePresence mode="popLayout">
          {todayQuests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </AnimatePresence>
        {todayQuests.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-text-tertiary text-sm">No tasks yet.</p>
            <p className="text-text-placeholder text-xs mt-1">Click &quot;Add Task&quot; to create your first one.</p>
          </div>
        )}
      </div>
    </HUDPanel>
  );
}
