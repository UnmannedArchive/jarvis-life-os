'use client';

import { useState } from 'react';
import { useStore } from '@/stores/useStore';
import { PILLAR_CONFIG, Pillar } from '@/lib/types';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDLabel from '@/components/hud/HUDLabel';
import HUDButton from '@/components/hud/HUDButton';
import XPBar from '@/components/hud/XPBar';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Target, Calendar, Award, ChevronDown, ChevronRight, Trash2, Check } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function GoalsPage() {
  const goals = useStore((s) => s.goals);
  const setGoals = useStore((s) => s.setGoals);
  const subTasks = useStore((s) => s.subTasks);
  const addSubTask = useStore((s) => s.addSubTask);
  const toggleSubTask = useStore((s) => s.toggleSubTask);
  const deleteSubTask = useStore((s) => s.deleteSubTask);
  const addLogEntry = useStore((s) => s.addLogEntry);
  const user = useStore((s) => s.user);

  const [showCreate, setShowCreate] = useState(false);
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [pillar, setPillar] = useState<Pillar>('work');
  const [targetDate, setTargetDate] = useState('');

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  const handleCreate = () => {
    if (!title.trim()) return;
    const newGoal = {
      id: crypto.randomUUID(),
      user_id: user?.id || '',
      title: title.trim(),
      description: desc.trim() || null,
      pillar,
      target_date: targetDate || null,
      progress_pct: 0,
      status: 'active' as const,
      xp_reward: 500,
      created_at: new Date().toISOString(),
    };
    setGoals([...goals, newGoal]);
    addLogEntry('system', `SYSTEM — New epic quest created: "${title.trim()}"`, 0);
    setTitle('');
    setDesc('');
    setTargetDate('');
    setShowCreate(false);
  };

  const updateProgress = (id: string, progress: number) => {
    const goal = goals.find((g) => g.id === id);
    setGoals(
      goals.map((g) =>
        g.id === id
          ? { ...g, progress_pct: progress, status: progress >= 100 ? 'completed' as const : 'active' as const }
          : g,
      ),
    );
    if (progress >= 100 && goal) {
      addLogEntry('quest_completed', `EPIC QUEST COMPLETE — "${goal.title}" // +${goal.xp_reward} XP`, goal.xp_reward, goal.pillar);
    }
  };

  const deleteGoal = (id: string) => {
    setGoals(goals.filter((g) => g.id !== id));
  };

  const handleAddSubTask = (goalId: string) => {
    if (!newSubTaskTitle.trim()) return;
    addSubTask(goalId, newSubTaskTitle.trim());
    setNewSubTaskTitle('');
  };

  const getGoalSubTasks = (goalId: string) => subTasks.filter((t) => t.goalId === goalId);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <HUDPanel delay={0}>
        <div className="flex items-center justify-between mb-4">
          <HUDLabel text="Epic Quests — Goals" />
          <HUDButton size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={12} className="inline mr-1" /> New Goal
          </HUDButton>
        </div>

        {activeGoals.length === 0 && !showCreate && (
          <div className="text-center py-16">
            <Target size={40} className="text-hud-green/20 mx-auto mb-4" />
            <p className="text-hud-text-muted text-sm">No active goals. Set an epic quest to pursue.</p>
            <HUDButton size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
              Create Your First Goal
            </HUDButton>
          </div>
        )}

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {activeGoals.map((goal) => {
              const config = PILLAR_CONFIG[goal.pillar];
              const isExpanded = expandedGoal === goal.id;
              const goalSubTasks = getGoalSubTasks(goal.id);
              const completedSubs = goalSubTasks.filter((t) => t.completed).length;
              const daysLeft = goal.target_date
                ? differenceInDays(new Date(goal.target_date), new Date())
                : null;

              return (
                <motion.div
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="border border-hud-border bg-hud-panel overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <button
                          onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                          className="mt-1 text-hud-text-muted hover:text-hud-green transition-colors cursor-pointer flex-shrink-0"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-hud-text">{goal.title}</h3>
                          {goal.description && (
                            <p className="text-[12px] text-hud-text-dim mt-0.5">{goal.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className="text-[9px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase px-2 py-0.5 border"
                          style={{ color: config.color, borderColor: `${config.color}33`, backgroundColor: `${config.color}11` }}
                        >
                          {config.label}
                        </span>
                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="text-hud-text-dim hover:text-hud-danger transition-colors cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    <XPBar
                      percentage={goal.progress_pct}
                      current={goal.progress_pct}
                      required={100}
                      label="Progress"
                      color={config.color}
                    />

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3 text-[10px] text-hud-text-dim">
                        {goal.target_date && (
                          <span className="flex items-center gap-1">
                            <Calendar size={10} />
                            {daysLeft !== null && daysLeft >= 0
                              ? `${daysLeft}d remaining`
                              : format(new Date(goal.target_date), 'MMM d, yyyy')}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Award size={10} />
                          +{goal.xp_reward} XP
                        </span>
                        {goalSubTasks.length > 0 && (
                          <span>{completedSubs}/{goalSubTasks.length} sub-tasks</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {[25, 50, 75, 100].map((pct) => (
                          <button
                            key={pct}
                            onClick={() => updateProgress(goal.id, pct)}
                            className={`text-[9px] font-[family-name:var(--font-orbitron)] px-2 py-1 border cursor-pointer transition-all
                              ${goal.progress_pct >= pct
                                ? 'border-hud-green/40 bg-hud-green/15 text-hud-green'
                                : 'border-white/10 text-hud-text-dim hover:border-hud-green/20'}
                            `}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-hud-border/50 overflow-hidden"
                      >
                        <div className="p-4 bg-white/[0.01]">
                          <div className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-muted mb-2">
                            Sub-Tasks & Milestones
                          </div>

                          <div className="space-y-1 mb-3">
                            {goalSubTasks.length === 0 && (
                              <p className="text-[11px] text-hud-text-dim py-2">
                                No sub-tasks yet. Break this goal into smaller steps.
                              </p>
                            )}
                            {goalSubTasks.map((task) => (
                              <div key={task.id} className="flex items-center gap-2 py-1 group">
                                <button
                                  onClick={() => toggleSubTask(task.id)}
                                  className={`w-4 h-4 border flex-shrink-0 flex items-center justify-center cursor-pointer transition-all
                                    ${task.completed
                                      ? 'border-hud-green bg-hud-green/20'
                                      : 'border-hud-green/30 hover:border-hud-green'}
                                  `}
                                >
                                  {task.completed && <Check size={8} className="text-hud-green" />}
                                </button>
                                <span className={`text-sm flex-1 ${task.completed ? 'line-through text-hud-text-dim' : 'text-hud-text'}`}>
                                  {task.title}
                                </span>
                                <button
                                  onClick={() => deleteSubTask(task.id)}
                                  className="opacity-0 group-hover:opacity-100 text-hud-text-dim hover:text-hud-danger transition-all cursor-pointer"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newSubTaskTitle}
                              onChange={(e) => setNewSubTaskTitle(e.target.value)}
                              placeholder="Add a sub-task..."
                              className="flex-1 bg-white/5 border border-hud-border px-2 py-1.5 text-sm text-hud-text placeholder:text-hud-text-dim focus:outline-none focus:border-hud-green/40"
                              onKeyDown={(e) => e.key === 'Enter' && handleAddSubTask(goal.id)}
                            />
                            <HUDButton size="sm" onClick={() => handleAddSubTask(goal.id)}>
                              Add
                            </HUDButton>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {completedGoals.length > 0 && (
          <div className="mt-6">
            <HUDLabel text="Completed Epic Quests" />
            <div className="space-y-2">
              {completedGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-center gap-3 p-3 border border-hud-green/10 bg-hud-green/[0.03]"
                >
                  <div className="w-6 h-6 border border-hud-green/30 bg-hud-green/10 flex items-center justify-center flex-shrink-0">
                    <Award size={12} className="text-hud-green" />
                  </div>
                  <span className="text-sm flex-1 text-hud-text-muted">{goal.title}</span>
                  <span className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase px-2 py-0.5 border border-hud-green/20 text-hud-green bg-hud-green/5">
                    +{goal.xp_reward} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </HUDPanel>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="hud-panel hud-panel-inner p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <HUDLabel text="New Epic Quest" />
                <button onClick={() => setShowCreate(false)} className="text-hud-text-dim hover:text-hud-text cursor-pointer">
                  <X size={16} />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-muted block mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What's your epic quest?"
                    className="w-full bg-white/5 border border-hud-border px-3 py-2 text-sm text-hud-text placeholder:text-hud-text-dim focus:outline-none focus:border-hud-green/40"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-muted block mb-1">Description</label>
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="Describe the mission..."
                    rows={2}
                    className="w-full bg-white/5 border border-hud-border px-3 py-2 text-sm text-hud-text placeholder:text-hud-text-dim focus:outline-none focus:border-hud-green/40 resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-muted block mb-1">Pillar</label>
                    <select
                      value={pillar}
                      onChange={(e) => setPillar(e.target.value as Pillar)}
                      className="w-full bg-white/5 border border-hud-border px-3 py-2 text-sm text-hud-text focus:outline-none focus:border-hud-green/40"
                    >
                      {Object.entries(PILLAR_CONFIG).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-muted block mb-1">Target Date</label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full bg-white/5 border border-hud-border px-3 py-2 text-sm text-hud-text focus:outline-none focus:border-hud-green/40"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <HUDButton variant="secondary" size="sm" onClick={() => setShowCreate(false)}>
                    Cancel
                  </HUDButton>
                  <HUDButton size="sm" onClick={handleCreate}>
                    Create Epic Quest
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
