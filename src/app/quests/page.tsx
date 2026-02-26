'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { Quest, Pillar, Difficulty, QuestType, PILLAR_CONFIG, DIFFICULTY_CONFIG } from '@/lib/types';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDButton from '@/components/hud/HUDButton';
import DifficultyBadge from '@/components/hud/DifficultyBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, X, Trash2 } from 'lucide-react';

const TABS: { key: QuestType; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'side', label: 'One-time' },
  { key: 'epic', label: 'Epic' },
];

export default function QuestsPage() {
  const quests = useStore((s) => s.quests);
  const completeQuest = useStore((s) => s.completeQuest);
  const deleteQuest = useStore((s) => s.deleteQuest);
  const addQuest = useStore((s) => s.addQuest);

  const [activeTab, setActiveTab] = useState<QuestType>('daily');
  const [filterPillar, setFilterPillar] = useState<Pillar | 'all'>('all');
  const [showModal, setShowModal] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPillar, setNewPillar] = useState<Pillar>('work');
  const [newDifficulty, setNewDifficulty] = useState<Difficulty>('MED');
  const [newRecurring, setNewRecurring] = useState(false);

  const filtered = useMemo(() => {
    return quests.filter((q) => {
      if (q.quest_type !== activeTab) return false;
      if (filterPillar !== 'all' && q.pillar !== filterPillar) return false;
      return true;
    });
  }, [quests, activeTab, filterPillar]);

  const incomplete = filtered.filter((q) => !q.completed);
  const completed = filtered.filter((q) => q.completed);

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
    setShowModal(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <HUDPanel delay={0}>
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-lg font-bold text-text-primary">Tasks</h1>
          <HUDButton size="sm" onClick={() => setShowModal(true)}>
            <Plus size={14} /> New Task
          </HUDButton>
        </div>

        <div className="flex items-center gap-3 mb-5 border-b border-border">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-2.5 px-1 text-sm font-medium transition-all cursor-pointer border-b-2 ${
                activeTab === tab.key
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-text-placeholder text-xs">
                {quests.filter((q) => q.quest_type === tab.key).length}
              </span>
            </button>
          ))}

          <div className="ml-auto">
            <select
              value={filterPillar}
              onChange={(e) => setFilterPillar(e.target.value as Pillar | 'all')}
              className="bg-white border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-secondary"
            >
              <option value="all">All pillars</option>
              {Object.entries(PILLAR_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <AnimatePresence mode="popLayout">
            {incomplete.map((quest) => (
              <motion.div
                key={quest.id} layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 p-3 rounded-lg border border-border bg-white hover:border-border-hover transition-all group"
              >
                <button
                  onClick={() => completeQuest(quest.id)}
                  className="w-5 h-5 rounded border-2 border-border-hover hover:border-accent flex items-center justify-center cursor-pointer flex-shrink-0"
                />
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PILLAR_CONFIG[quest.pillar].color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary">{quest.title}</div>
                  {quest.description && <div className="text-xs text-text-tertiary truncate">{quest.description}</div>}
                </div>
                <DifficultyBadge difficulty={quest.difficulty} />
                <span className="text-xs text-text-tertiary">+{quest.xp_reward}</span>
                <button onClick={() => deleteQuest(quest.id)} className="opacity-0 group-hover:opacity-100 text-text-placeholder hover:text-danger transition-all cursor-pointer">
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {completed.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-text-tertiary mb-2">Completed ({completed.length})</div>
              {completed.map((quest) => (
                <div key={quest.id} className="flex items-center gap-3 p-3 rounded-lg opacity-50">
                  <div className="w-5 h-5 rounded border-2 border-success bg-success flex items-center justify-center flex-shrink-0">
                    <Check size={10} className="text-white" strokeWidth={3} />
                  </div>
                  <div className="text-sm line-through text-text-tertiary flex-1">{quest.title}</div>
                  <span className="text-xs text-text-placeholder">+{quest.xp_reward}</span>
                </div>
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">✨</div>
              <p className="text-text-tertiary text-sm">No tasks here yet.</p>
              <p className="text-text-placeholder text-xs mt-1">Create one to get started.</p>
            </div>
          )}
        </div>
      </HUDPanel>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl border border-border p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-semibold text-text-primary">New Task</h2>
                <button onClick={() => setShowModal(false)} className="text-text-placeholder hover:text-text-secondary cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1.5">Title</label>
                  <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="What needs to be done?"
                    className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm placeholder:text-text-placeholder" autoFocus />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1.5">Description</label>
                  <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Optional details..." rows={2}
                    className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm placeholder:text-text-placeholder resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-text-secondary block mb-1.5">Life Pillar</label>
                    <select value={newPillar} onChange={(e) => setNewPillar(e.target.value as Pillar)}
                      className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm">
                      {Object.entries(PILLAR_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-secondary block mb-1.5">Difficulty</label>
                    <select value={newDifficulty} onChange={(e) => setNewDifficulty(e.target.value as Difficulty)}
                      className="w-full bg-white border border-border rounded-lg px-3 py-2 text-sm">
                      {Object.entries(DIFFICULTY_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label} · {v.xp} XP</option>))}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newRecurring} onChange={(e) => setNewRecurring(e.target.checked)} className="accent-[#228be6] w-4 h-4" />
                  <span className="text-sm text-text-secondary">Recurring daily</span>
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <HUDButton variant="ghost" size="sm" onClick={() => setShowModal(false)}>Cancel</HUDButton>
                  <HUDButton size="sm" onClick={handleCreate}>Create Task</HUDButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
