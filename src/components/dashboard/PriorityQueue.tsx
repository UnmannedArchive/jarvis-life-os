'use client';

import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import { useStore } from '@/stores/useStore';
import { prioritizeQuests } from '@/lib/priority';
import { PILLAR_CONFIG, Pillar, Difficulty, Quest } from '@/lib/types';
import { estimateXP } from '@/lib/xpAI';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDButton from '@/components/hud/HUDButton';
import DifficultyBadge from '@/components/hud/DifficultyBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, X, Sparkles, Brain } from 'lucide-react';
import { captureUndoState } from '@/components/hud/UndoToast';

const QuestCard = memo(function QuestCard({ quest }: { quest: Quest }) {
  const completeQuest = useStore((s) => s.completeQuest);
  const [xpPop, setXpPop] = useState(false);
  const cfg = PILLAR_CONFIG[quest.pillar];

  const handle = useCallback(() => {
    if (quest.completed) return;
    captureUndoState(quest.id);
    completeQuest(quest.id);
    setXpPop(true);
    setTimeout(() => setXpPop(false), 1500);
  }, [quest.id, quest.completed, completeQuest]);

  return (
    <div
      className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all relative group ${
        quest.completed
          ? 'bg-[rgba(0,0,0,0.3)] border-[rgba(255,255,255,0.03)] opacity-40'
          : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.03)]'
      }`}>
      <button onClick={handle} disabled={quest.completed}
        className={`w-[18px] h-[18px] rounded-md flex-shrink-0 border-[1.5px] flex items-center justify-center transition-all cursor-pointer ${
          quest.completed
            ? 'border-success bg-success shadow-[0_0_8px_rgba(52,211,153,0.2)]'
            : 'border-[rgba(255,255,255,0.12)] hover:border-accent hover:shadow-[0_0_8px_rgba(200,200,200,0.15)]'
        }`}>
        {quest.completed && <Check size={9} className="text-white" strokeWidth={3} />}
      </button>
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-[0_0_6px_currentColor]" style={{ backgroundColor: cfg.color, color: cfg.color }} />
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${quest.completed ? 'line-through text-text-placeholder' : 'text-text-primary'}`}>{quest.title}</div>
      </div>
      <DifficultyBadge difficulty={quest.difficulty} />
      <span className="text-xs font-medium text-text-placeholder whitespace-nowrap tabular-nums">+{quest.xp_reward}</span>
      <AnimatePresence>
        {xpPop && (
          <motion.div initial={{ opacity: 1, y: 0, scale: 1 }} animate={{ opacity: 0, y: -28, scale: 1.1 }} exit={{ opacity: 0 }}
            className="absolute right-4 -top-2 font-bold text-sm pointer-events-none gradient-text">
            +{quest.xp_reward} XP
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default function PriorityQueue() {
  const quests = useStore((s) => s.quests);
  const pillars = useStore((s) => s.pillars);
  const todayCheckin = useStore((s) => s.todayCheckin);
  const addQuest = useStore((s) => s.addQuest);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [pillar, setPillar] = useState<Pillar>('work');
  const [type, setType] = useState<'daily' | 'side'>('daily');
  const [aiEstimate, setAiEstimate] = useState<{ xp: number; difficulty: Difficulty; reasoning: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (title.trim().length >= 3) {
      debounceRef.current = setTimeout(() => {
        setAiEstimate(estimateXP(title.trim(), null, pillar, type));
      }, 250);
    } else {
      setAiEstimate(null);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [title, pillar, type]);

  const list = useMemo(() => {
    const a = quests.filter((q) => !q.completed && (q.quest_type === 'daily' || q.quest_type === 'side'));
    const d = quests.filter((q) => q.completed);
    return [...prioritizeQuests(a, pillars, todayCheckin), ...d];
  }, [quests, pillars, todayCheckin]);

  const handleAdd = () => {
    if (!title.trim()) return;
    const est = aiEstimate || estimateXP(title.trim(), null, pillar, type);
    addQuest({ title: title.trim(), description: null, pillar, difficulty: est.difficulty,
      xp_reward: est.xp, quest_type: type,
      is_recurring: type === 'daily', recurrence_rule: type === 'daily' ? 'daily' : null, due_date: null });
    setTitle(''); setShowAdd(false); setAiEstimate(null);
  };

  return (
    <HUDPanel delay={1}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Today&apos;s Tasks</h2>
        <HUDButton size="sm" variant="secondary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? <X size={14} /> : <><Plus size={14} /> Add Task</>}
        </HUDButton>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="mb-4 rounded-xl border border-[rgba(255,255,255,0.06)] p-4 bg-[rgba(255,255,255,0.02)]">
            <div className="flex flex-col gap-3">
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="What do you need to do?" autoFocus
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-placeholder"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()} />

              {aiEstimate && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-dim/50 border border-accent/10">
                  <Brain size={12} className="text-accent flex-shrink-0" />
                  <span className="text-[11px] text-accent/80 font-medium">AI:</span>
                  <DifficultyBadge difficulty={aiEstimate.difficulty} />
                  <span className="text-xs font-semibold text-accent tabular-nums">+{aiEstimate.xp} XP</span>
                  <span className="text-[10px] text-text-tertiary ml-auto">{aiEstimate.reasoning}</span>
                </motion.div>
              )}

              <div className="flex gap-2 flex-wrap items-center">
                <select value={type} onChange={(e) => setType(e.target.value as 'daily' | 'side')}
                  className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl px-2.5 py-1.5 text-sm text-text-secondary">
                  <option value="daily">Daily (recurring)</option>
                  <option value="side">One-time</option>
                </select>
                <select value={pillar} onChange={(e) => setPillar(e.target.value as Pillar)}
                  className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl px-2.5 py-1.5 text-sm text-text-secondary">
                  {Object.entries(PILLAR_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <HUDButton size="sm" onClick={handleAdd}>Create</HUDButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-1.5">
          {list.map((q) => <QuestCard key={q.id} quest={q} />)}
        {list.length === 0 && (
          <div className="text-center py-14">
            <Sparkles size={28} className="mx-auto mb-3 text-text-placeholder opacity-20" />
            <p className="text-text-tertiary text-sm">No tasks yet.</p>
            <p className="text-text-placeholder text-xs mt-1">Click &quot;Add Task&quot; to get started.</p>
          </div>
        )}
      </div>
    </HUDPanel>
  );
}
