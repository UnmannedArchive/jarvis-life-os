'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useStore } from '@/stores/useStore';
import { Quest, Pillar, Difficulty, QuestType, PILLAR_CONFIG } from '@/lib/types';
import { estimateXP } from '@/lib/xpAI';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDButton from '@/components/hud/HUDButton';
import DifficultyBadge from '@/components/hud/DifficultyBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, X, Trash2, Search, Calendar, Sparkles, Brain } from 'lucide-react';
import { format, differenceInDays, parseISO, isToday, isTomorrow, isPast } from 'date-fns';

const TABS: { key: QuestType; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'side', label: 'One-time' },
  { key: 'epic', label: 'Epic' },
];

function DueDateLabel({ date }: { date: string }) {
  const d = parseISO(date);
  const past = isPast(d) && !isToday(d);
  const today = isToday(d);
  const tomorrow = isTomorrow(d);
  const daysLeft = differenceInDays(d, new Date());

  let label = format(d, 'MMM d');
  let color = 'text-text-placeholder';

  if (past) { label = 'Overdue'; color = 'text-danger'; }
  else if (today) { label = 'Today'; color = 'text-warning'; }
  else if (tomorrow) { label = 'Tomorrow'; color = 'text-accent'; }
  else if (daysLeft <= 7) { label = `${daysLeft}d left`; color = 'text-text-tertiary'; }

  return (
    <span className={`flex items-center gap-0.5 text-[11px] ${color}`}>
      <Calendar size={10} />{label}
    </span>
  );
}

export default function QuestsPage() {
  const quests = useStore((s) => s.quests);
  const completeQuest = useStore((s) => s.completeQuest);
  const deleteQuest = useStore((s) => s.deleteQuest);
  const addQuest = useStore((s) => s.addQuest);

  const [activeTab, setActiveTab] = useState<QuestType>('daily');
  const [filterPillar, setFilterPillar] = useState<Pillar | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPillar, setNewPillar] = useState<Pillar>('work');
  const [newRecurring, setNewRecurring] = useState(false);
  const [newDueDate, setNewDueDate] = useState('');
  const [aiEstimate, setAiEstimate] = useState<{ xp: number; difficulty: Difficulty; reasoning: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (newTitle.trim().length >= 3) {
      debounceRef.current = setTimeout(() => {
        setAiEstimate(estimateXP(newTitle.trim(), newDesc.trim() || null, newPillar, activeTab));
      }, 250);
    } else {
      setAiEstimate(null);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [newTitle, newDesc, newPillar, activeTab]);

  const filtered = useMemo(() => {
    return quests.filter((q) => {
      if (q.quest_type !== activeTab) return false;
      if (filterPillar !== 'all' && q.pillar !== filterPillar) return false;
      if (searchQuery && !q.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [quests, activeTab, filterPillar, searchQuery]);

  const incomplete = filtered.filter((q) => !q.completed);
  const completed = filtered.filter((q) => q.completed);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    const est = aiEstimate || estimateXP(newTitle.trim(), newDesc.trim() || null, newPillar, activeTab);
    addQuest({
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      pillar: newPillar,
      difficulty: est.difficulty,
      xp_reward: est.xp,
      quest_type: activeTab,
      is_recurring: newRecurring,
      recurrence_rule: newRecurring ? 'daily' : null,
      due_date: newDueDate || null,
    });
    setNewTitle(''); setNewDesc(''); setNewDueDate(''); setShowModal(false);
    setAiEstimate(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setAiEstimate(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <HUDPanel delay={0}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Tasks</h1>
          <HUDButton size="sm" onClick={() => setShowModal(true)}>
            <Plus size={14} /> New Task
          </HUDButton>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-placeholder" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full bg-[rgba(255,255,255,0.04)] border border-border rounded-xl pl-8 pr-3 py-2 text-sm placeholder:text-text-placeholder" />
          </div>
          <select value={filterPillar} onChange={(e) => setFilterPillar(e.target.value as Pillar | 'all')}
            className="bg-[rgba(255,255,255,0.04)] border border-border rounded-xl px-2.5 py-2 text-xs text-text-secondary">
            <option value="all">All pillars</option>
            {Object.entries(PILLAR_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3 mb-5 border-b border-border">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`pb-2.5 px-1 text-sm font-medium transition-all cursor-pointer border-b-2 ${
                activeTab === tab.key ? 'border-accent text-accent' : 'border-transparent text-text-tertiary hover:text-text-secondary'
              }`}>
              {tab.label}
              <span className="ml-1.5 text-text-placeholder text-xs">
                {quests.filter((q) => q.quest_type === tab.key).length}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
            {incomplete.map((quest) => (
              <div key={quest.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-[rgba(255,255,255,0.03)] hover:border-border-hover transition-all group">
                <button onClick={() => completeQuest(quest.id)}
                  className="w-5 h-5 rounded border-2 border-border-hover hover:border-accent flex items-center justify-center cursor-pointer flex-shrink-0" />
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PILLAR_CONFIG[quest.pillar].color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary">{quest.title}</div>
                  {quest.description && <div className="text-xs text-text-tertiary truncate">{quest.description}</div>}
                </div>
                {quest.due_date && <DueDateLabel date={quest.due_date} />}
                <DifficultyBadge difficulty={quest.difficulty} />
                <span className="text-xs text-text-tertiary">+{quest.xp_reward}</span>
                <button onClick={() => deleteQuest(quest.id)}
                  className="opacity-0 group-hover:opacity-100 text-text-placeholder hover:text-danger transition-all cursor-pointer">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

          {completed.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-text-tertiary mb-2">Completed ({completed.length})</div>
              {completed.map((quest) => (
                <div key={quest.id} className="flex items-center gap-3 p-3 rounded-xl opacity-50">
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
              <Sparkles size={32} className="mx-auto mb-3 text-text-placeholder opacity-30" />
              <p className="text-text-tertiary text-sm">
                {searchQuery ? 'No matching tasks found.' : 'No tasks here yet.'}
              </p>
              <p className="text-text-placeholder text-xs mt-1">
                {searchQuery ? 'Try a different search term.' : 'Create one to get started.'}
              </p>
            </div>
          )}
        </div>
      </HUDPanel>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={handleCloseModal}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[rgba(255,255,255,0.03)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl border border-border p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">New Task</h2>
                <button onClick={handleCloseModal} className="text-text-placeholder hover:text-text-secondary cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1.5">Title</label>
                  <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="What needs to be done?" autoFocus
                    className="w-full bg-[rgba(255,255,255,0.04)] border border-border rounded-xl px-3 py-2 text-sm placeholder:text-text-placeholder"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1.5">Description</label>
                  <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Optional details..." rows={2}
                    className="w-full bg-[rgba(255,255,255,0.04)] border border-border rounded-xl px-3 py-2 text-sm placeholder:text-text-placeholder resize-none" />
                </div>

                {aiEstimate && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-accent/15 bg-accent-dim/40 p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Brain size={13} className="text-accent" />
                      <span className="text-[11px] font-semibold text-accent uppercase tracking-wider">AI XP Estimate</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <DifficultyBadge difficulty={aiEstimate.difficulty} />
                      <span className="text-lg font-bold text-text-primary tabular-nums">+{aiEstimate.xp} XP</span>
                      <span className="text-[11px] text-text-tertiary ml-auto">{aiEstimate.reasoning}</span>
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-text-secondary block mb-1.5">Life Pillar</label>
                    <select value={newPillar} onChange={(e) => setNewPillar(e.target.value as Pillar)}
                      className="w-full bg-[rgba(255,255,255,0.04)] border border-border rounded-xl px-3 py-2 text-sm">
                      {Object.entries(PILLAR_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-secondary block mb-1.5">Due Date</label>
                    <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)}
                      className="w-full bg-[rgba(255,255,255,0.04)] border border-border rounded-xl px-3 py-2 text-sm" />
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={newRecurring} onChange={(e) => setNewRecurring(e.target.checked)} className="accent-accent w-4 h-4" />
                  <span className="text-sm text-text-secondary">Recurring daily</span>
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <HUDButton variant="ghost" size="sm" onClick={handleCloseModal}>Cancel</HUDButton>
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
