'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { Quest, Pillar, Difficulty, QuestType, PILLAR_CONFIG, DIFFICULTY_CONFIG } from '@/lib/types';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDLabel from '@/components/hud/HUDLabel';
import HUDButton from '@/components/hud/HUDButton';
import DifficultyBadge from '@/components/hud/DifficultyBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, X, Trash2, Brain, Dumbbell, Briefcase, TrendingUp, Sparkles, Users, Filter } from 'lucide-react';

const PILLAR_ICONS: Record<Pillar, React.ReactNode> = {
  mind: <Brain size={14} />,
  body: <Dumbbell size={14} />,
  work: <Briefcase size={14} />,
  wealth: <TrendingUp size={14} />,
  spirit: <Sparkles size={14} />,
  social: <Users size={14} />,
};

const TABS: { key: QuestType; label: string }[] = [
  { key: 'daily', label: 'Daily Quests' },
  { key: 'side', label: 'Side Quests' },
  { key: 'epic', label: 'Epic Quests' },
];

export default function QuestsPage() {
  const quests = useStore((s) => s.quests);
  const completeQuest = useStore((s) => s.completeQuest);
  const deleteQuest = useStore((s) => s.deleteQuest);
  const addQuest = useStore((s) => s.addQuest);

  const [activeTab, setActiveTab] = useState<QuestType>('daily');
  const [filterPillar, setFilterPillar] = useState<Pillar | 'all'>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPillar, setNewPillar] = useState<Pillar>('work');
  const [newDifficulty, setNewDifficulty] = useState<Difficulty>('MED');
  const [newRecurring, setNewRecurring] = useState(false);

  const filteredQuests = useMemo(() => {
    return quests.filter((q) => {
      if (q.quest_type !== activeTab) return false;
      if (filterPillar !== 'all' && q.pillar !== filterPillar) return false;
      if (filterDifficulty !== 'all' && q.difficulty !== filterDifficulty) return false;
      return true;
    });
  }, [quests, activeTab, filterPillar, filterDifficulty]);

  const incomplete = filteredQuests.filter((q) => !q.completed);
  const completed = filteredQuests.filter((q) => q.completed);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    addQuest({
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      pillar: newPillar,
      difficulty: newDifficulty,
      xp_reward: DIFFICULTY_CONFIG[newDifficulty].xp,
      quest_type: activeTab,
      is_recurring: newRecurring,
      recurrence_rule: newRecurring ? 'daily' : null,
      due_date: null,
    });
    setNewTitle('');
    setNewDesc('');
    setShowAddModal(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <HUDPanel delay={0}>
        <div className="flex items-center justify-between mb-4">
          <HUDLabel text="Quest Log" />
          <HUDButton size="sm" onClick={() => setShowAddModal(true)}>
            <Plus size={12} className="inline mr-1" /> New Quest
          </HUDButton>
        </div>

        <div className="flex gap-1 mb-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-4 py-2 text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase
                border transition-all cursor-pointer
                ${activeTab === tab.key
                  ? 'border-hud-green/40 bg-hud-green/10 text-hud-green'
                  : 'border-transparent text-hud-text-muted hover:text-hud-green hover:border-hud-green/20'}
              `}
            >
              {tab.label}
              <span className="ml-2 text-hud-text-dim">
                ({quests.filter((q) => q.quest_type === tab.key).length})
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-4 flex-wrap items-center">
          <Filter size={12} className="text-hud-text-dim" />
          <select
            value={filterPillar}
            onChange={(e) => setFilterPillar(e.target.value as Pillar | 'all')}
            className="bg-white/5 border border-hud-border px-2 py-1 text-xs text-hud-text focus:outline-none focus:border-hud-green/40"
          >
            <option value="all">All Pillars</option>
            {Object.entries(PILLAR_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value as Difficulty | 'all')}
            className="bg-white/5 border border-hud-border px-2 py-1 text-xs text-hud-text focus:outline-none focus:border-hud-green/40"
          >
            <option value="all">All Difficulties</option>
            {Object.entries(DIFFICULTY_CONFIG).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <AnimatePresence mode="popLayout">
            {incomplete.map((quest) => (
              <motion.div
                key={quest.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 p-3 border border-hud-border bg-hud-panel hover:border-hud-border-bright transition-all group"
              >
                <button
                  onClick={() => completeQuest(quest.id)}
                  className="w-6 h-6 flex-shrink-0 border-2 border-hud-green/30 hover:border-hud-green hover:bg-hud-green/10 flex items-center justify-center transition-all cursor-pointer"
                />
                <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center" style={{ color: PILLAR_CONFIG[quest.pillar].color }}>
                  {PILLAR_ICONS[quest.pillar]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{quest.title}</div>
                  {quest.description && (
                    <div className="text-[11px] text-hud-text-dim truncate">{quest.description}</div>
                  )}
                </div>
                <DifficultyBadge difficulty={quest.difficulty} />
                <div className="text-[11px] font-[family-name:var(--font-orbitron)] text-hud-green glow-text">
                  +{quest.xp_reward}
                </div>
                <button
                  onClick={() => deleteQuest(quest.id)}
                  className="opacity-0 group-hover:opacity-100 text-hud-danger/50 hover:text-hud-danger transition-all cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {completed.length > 0 && (
            <>
              <div className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-dim mt-4 mb-2">
                Completed ({completed.length})
              </div>
              {completed.map((quest) => (
                <div
                  key={quest.id}
                  className="flex items-center gap-3 p-3 border border-white/5 bg-white/2 opacity-50"
                >
                  <div className="w-6 h-6 flex-shrink-0 border-2 border-hud-green bg-hud-green/20 flex items-center justify-center">
                    <Check size={12} className="text-hud-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm line-through truncate">{quest.title}</div>
                  </div>
                  <div className="text-[11px] font-[family-name:var(--font-orbitron)] text-hud-green/50">
                    +{quest.xp_reward}
                  </div>
                </div>
              ))}
            </>
          )}

          {filteredQuests.length === 0 && (
            <div className="text-center py-12 text-hud-text-dim text-sm">
              No quests in this category. Create one to begin.
            </div>
          )}
        </div>
      </HUDPanel>

      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="hud-panel hud-panel-inner p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <HUDLabel text="Create Quest" />
                <button onClick={() => setShowAddModal(false)} className="text-hud-text-dim hover:text-hud-text cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-muted block mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Quest title..."
                    className="w-full bg-white/5 border border-hud-border px-3 py-2 text-sm text-hud-text placeholder:text-hud-text-dim focus:outline-none focus:border-hud-green/40"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-muted block mb-1">
                    Description
                  </label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Optional description..."
                    rows={2}
                    className="w-full bg-white/5 border border-hud-border px-3 py-2 text-sm text-hud-text placeholder:text-hud-text-dim focus:outline-none focus:border-hud-green/40 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-muted block mb-1">
                      Pillar
                    </label>
                    <select
                      value={newPillar}
                      onChange={(e) => setNewPillar(e.target.value as Pillar)}
                      className="w-full bg-white/5 border border-hud-border px-3 py-2 text-sm text-hud-text focus:outline-none focus:border-hud-green/40"
                    >
                      {Object.entries(PILLAR_CONFIG).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-muted block mb-1">
                      Difficulty
                    </label>
                    <select
                      value={newDifficulty}
                      onChange={(e) => setNewDifficulty(e.target.value as Difficulty)}
                      className="w-full bg-white/5 border border-hud-border px-3 py-2 text-sm text-hud-text focus:outline-none focus:border-hud-green/40"
                    >
                      {Object.entries(DIFFICULTY_CONFIG).map(([key, val]) => (
                        <option key={key} value={key}>{val.label} (+{val.xp} XP)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newRecurring}
                    onChange={(e) => setNewRecurring(e.target.checked)}
                    className="accent-[#00ff88]"
                  />
                  <span className="text-xs text-hud-text-muted">Recurring (resets daily)</span>
                </label>

                <div className="flex justify-end gap-2 mt-2">
                  <HUDButton variant="secondary" size="sm" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </HUDButton>
                  <HUDButton size="sm" onClick={handleCreate}>
                    Create Quest
                  </HUDButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
