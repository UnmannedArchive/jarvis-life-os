'use client';

import { useState } from 'react';
import { useStore } from '@/stores/useStore';
import { PILLAR_CONFIG, Pillar } from '@/lib/types';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDButton from '@/components/hud/HUDButton';
import XPBar from '@/components/hud/XPBar';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Target, Calendar, Award, ChevronDown, ChevronRight, Trash2, Check } from 'lucide-react';
import { differenceInDays } from 'date-fns';

export default function GoalsPage() {
  const goals = useStore((s) => s.goals);
  const setGoals = useStore((s) => s.setGoals);
  const subTasks = useStore((s) => s.subTasks);
  const addSubTask = useStore((s) => s.addSubTask);
  const toggleSubTask = useStore((s) => s.toggleSubTask);
  const deleteSubTask = useStore((s) => s.deleteSubTask);
  const user = useStore((s) => s.user);

  const [showCreate, setShowCreate] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [subTaskInput, setSubTaskInput] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [pillar, setPillar] = useState<Pillar>('work');
  const [targetDate, setTargetDate] = useState('');

  const active = goals.filter((g) => g.status === 'active');
  const completed = goals.filter((g) => g.status === 'completed');

  const handleCreate = () => {
    if (!title.trim()) return;
    setGoals([...goals, {
      id: crypto.randomUUID(), user_id: user?.id || '', title: title.trim(),
      description: desc.trim() || null, pillar, target_date: targetDate || null,
      progress_pct: 0, status: 'active', xp_reward: 500, created_at: new Date().toISOString(),
    }]);
    setTitle(''); setDesc(''); setTargetDate(''); setShowCreate(false);
  };

  const updateProgress = (id: string, pct: number) => {
    setGoals(goals.map((g) => g.id === id ? { ...g, progress_pct: pct, status: pct >= 100 ? 'completed' as const : 'active' as const } : g));
  };

  const handleAddSub = (goalId: string) => {
    if (!subTaskInput.trim()) return;
    addSubTask(goalId, subTaskInput.trim());
    setSubTaskInput('');
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <HUDPanel delay={0}>
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Goals</h1>
          <HUDButton size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New Goal
          </HUDButton>
        </div>

        {active.length === 0 && (
          <div className="text-center py-16">
            <Target size={36} className="text-text-placeholder mx-auto mb-3" />
            <p className="text-text-tertiary text-sm">No goals yet.</p>
            <p className="text-text-placeholder text-xs mt-1">Set a long-term goal to start tracking progress.</p>
            <HUDButton size="sm" className="mt-4" onClick={() => setShowCreate(true)}>Create Goal</HUDButton>
          </div>
        )}

        <div className="space-y-3">
          {active.map((goal) => {
            const config = PILLAR_CONFIG[goal.pillar];
            const expanded = expandedGoal === goal.id;
            const subs = subTasks.filter((t) => t.goalId === goal.id);
            const daysLeft = goal.target_date ? differenceInDays(new Date(goal.target_date), new Date()) : null;

            return (
              <div key={goal.id} className="rounded-xl border border-border bg-[rgba(255,255,255,0.03)] overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <button onClick={() => setExpandedGoal(expanded ? null : goal.id)} className="mt-0.5 text-text-placeholder hover:text-text-secondary cursor-pointer">
                      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-text-primary">{goal.title}</h3>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${config.color}18`, color: config.color }}>
                          {config.label}
                        </span>
                      </div>
                      {goal.description && <p className="text-xs text-text-tertiary mt-0.5">{goal.description}</p>}
                    </div>
                    <button onClick={() => setGoals(goals.filter((g) => g.id !== goal.id))} className="text-text-placeholder hover:text-danger cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <XPBar percentage={goal.progress_pct} current={goal.progress_pct} required={100} color={config.color} height={5} />

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3 text-xs text-text-tertiary">
                      {daysLeft !== null && daysLeft >= 0 && <span className="flex items-center gap-1"><Calendar size={11} /> {daysLeft}d left</span>}
                      <span className="flex items-center gap-1"><Award size={11} /> +{goal.xp_reward} XP</span>
                      {subs.length > 0 && <span>{subs.filter((t) => t.completed).length}/{subs.length} steps</span>}
                    </div>
                    <div className="flex gap-1">
                      {[25, 50, 75, 100].map((pct) => (
                        <button key={pct} onClick={() => updateProgress(goal.id, pct)}
                          className={`text-[10px] font-medium px-2 py-1 rounded-md cursor-pointer transition-all ${
                            goal.progress_pct >= pct ? 'bg-accent-dim text-accent' : 'text-text-placeholder hover:bg-[rgba(255,255,255,0.04)]'
                          }`}>
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {expanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="p-4 pt-0 border-t border-border bg-[rgba(255,255,255,0.02)]">
                        <div className="text-xs font-medium text-text-tertiary mb-2 pt-3">Sub-tasks</div>
                        {subs.length === 0 && <p className="text-xs text-text-placeholder mb-2">Break this goal into smaller steps.</p>}
                        <div className="space-y-1 mb-3">
                          {subs.map((t) => (
                            <div key={t.id} className="flex items-center gap-2 group">
                              <button onClick={() => toggleSubTask(t.id)}
                                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center cursor-pointer ${
                                  t.completed ? 'border-success bg-success' : 'border-border-hover hover:border-accent'
                                }`}>
                                {t.completed && <Check size={8} className="text-white" strokeWidth={3} />}
                              </button>
                              <span className={`text-sm flex-1 ${t.completed ? 'line-through text-text-placeholder' : 'text-text-secondary'}`}>{t.title}</span>
                              <button onClick={() => deleteSubTask(t.id)} className="opacity-0 group-hover:opacity-100 text-text-placeholder hover:text-danger cursor-pointer"><X size={12} /></button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input type="text" value={subTaskInput} onChange={(e) => setSubTaskInput(e.target.value)}
                            placeholder="Add a step..." className="flex-1 bg-[rgba(255,255,255,0.03)] border border-border rounded-xl px-2.5 py-1.5 text-sm placeholder:text-text-placeholder"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSub(goal.id)} />
                          <HUDButton size="sm" variant="secondary" onClick={() => handleAddSub(goal.id)}>Add</HUDButton>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {completed.length > 0 && (
          <div className="mt-6">
            <div className="text-xs font-medium text-text-tertiary mb-2">Completed ({completed.length})</div>
            {completed.map((g) => (
              <div key={g.id} className="flex items-center gap-2 p-3 rounded-xl opacity-50">
                <Award size={14} className="text-success" />
                <span className="text-sm flex-1">{g.title}</span>
                <span className="text-xs text-text-placeholder">+{g.xp_reward} XP</span>
              </div>
            ))}
          </div>
        )}
      </HUDPanel>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-[rgba(255,255,255,0.03)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl border border-border p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">New Goal</h2>
                <button onClick={() => setShowCreate(false)} className="text-text-placeholder hover:text-text-secondary cursor-pointer"><X size={18} /></button>
              </div>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1.5">Title</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's the big goal?"
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm placeholder:text-text-placeholder" autoFocus />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-secondary block mb-1.5">Description</label>
                  <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional details..." rows={2}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm placeholder:text-text-placeholder resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-text-secondary block mb-1.5">Pillar</label>
                    <select value={pillar} onChange={(e) => setPillar(e.target.value as Pillar)}
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm">
                      {Object.entries(PILLAR_CONFIG).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-secondary block mb-1.5">Target Date</label>
                    <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <HUDButton variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</HUDButton>
                  <HUDButton size="sm" onClick={handleCreate}>Create Goal</HUDButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
