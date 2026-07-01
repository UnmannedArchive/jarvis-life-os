'use client';

import { useState, useMemo, useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import { classifyPlannedTasks } from '@/lib/planAI';
import { planDay, orderTasksHeuristic } from '@/lib/planDay';
import { appliesOn } from '@/lib/recurring';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { PILLAR_CONFIG, Pillar, Difficulty, QuestType } from '@/lib/types';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDButton from '@/components/hud/HUDButton';
import DifficultyBadge from '@/components/hud/DifficultyBadge';
import { motion, AnimatePresence } from 'framer-motion';
import { ListChecks, Sparkles, Wand2, Plus, X, Repeat, Trash2, Loader2, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';

/** One task in the AI-ordered plan, enriched with gamified metadata. */
interface OrderedItem {
  id: string;
  title: string;
  /** Why the planner placed this task here. */
  reason: string;
  pillar: Pillar;
  difficulty: Difficulty;
  xp: number;
  questType: QuestType;
  /** Seeded from a recurring task. */
  recurring: boolean;
  /** UI-only — user can flip off to skip without removing. */
  selected: boolean;
}

/**
 * Enrich a bare task title with pillar / difficulty / XP using the existing
 * heuristic classifier, so the ordered plan keeps the app's gamified styling.
 */
function enrich(title: string, reason: string, recurring: boolean, index: number): OrderedItem {
  const [classified] = classifyPlannedTasks(title);
  const pillar = classified?.pillar ?? 'work';
  const difficulty = classified?.difficulty ?? 'MED';
  const xp = classified?.xp ?? 20;
  const questType: QuestType = recurring ? 'daily' : classified?.questType ?? 'side';
  return {
    id: `ord-${index}-${title.slice(0, 12).replace(/\W+/g, '_')}`,
    title,
    reason,
    pillar,
    difficulty,
    xp,
    questType,
    recurring,
    selected: true,
  };
}

export default function TodayPlanner() {
  const addQuest = useStore((s) => s.addQuest);
  const recurringTasks = useStore((s) => s.recurringTasks);

  const [input, setInput] = useState('');
  const [items, setItems] = useState<OrderedItem[]>([]);
  const [planning, setPlanning] = useState(false);
  const [adding, setAdding] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  // Recurring tasks the user dismissed for today (session only).
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Voice input — speak and the words fill the textarea. The transcript is the
  // accumulated session text, so replace when it extends what's there, else append.
  const handleVoice = useCallback((transcript: string) => {
    setInput((prev) => {
      if (prev && transcript.toLowerCase().startsWith(prev.trim().toLowerCase())) return transcript;
      return prev ? `${prev} ${transcript}` : transcript;
    });
  }, []);
  const handleVoiceError = useCallback((code: string) => {
    if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'start-failed') {
      toast('Microphone blocked', {
        description:
          'Allow mic access: click the 🎤/lock icon in the address bar → Allow, and check macOS Settings → Privacy → Microphone → Chrome. Then tap the mic again.',
      });
    } else if (code === 'no-speech') {
      toast("Didn't catch that", { description: 'No speech detected — tap the mic and speak clearly.' });
    } else if (code === 'network') {
      toast('Voice needs a connection', { description: 'Speech recognition is offline. Check your internet and retry.' });
    } else if (code !== 'aborted') {
      toast('Voice input error', { description: code });
    }
  }, []);
  const { isListening, supported: voiceSupported, toggle: toggleVoice } = useSpeechToText(
    handleVoice,
    handleVoiceError,
  );

  // Recurring tasks that apply to today, minus any dismissed this session.
  const todaysRecurring = useMemo(() => {
    const today = new Date();
    return recurringTasks.filter((t) => appliesOn(t, today) && !dismissed.has(t.id));
  }, [recurringTasks, dismissed]);

  const handlePlan = useCallback(async () => {
    // Merge recurring tasks + free-text into one list before ordering.
    const recurringNames = todaysRecurring.map((t) => t.name.trim()).filter(Boolean);
    const recurringSet = new Set(recurringNames.map((n) => n.toLowerCase()));
    const merged = [...recurringNames, input.trim()].filter(Boolean).join('\n');

    if (!merged.trim()) {
      toast('Nothing to plan', { description: 'Type a few tasks or add recurring ones first.' });
      return;
    }

    setPlanning(true);
    setUsedFallback(false);

    let ordered: { task: string; reason: string }[];
    try {
      ordered = await planDay(merged);
    } catch {
      // No API key / endpoint failure → order locally so the feature still works.
      ordered = orderTasksHeuristic(merged);
      setUsedFallback(true);
      if (ordered.length > 0) {
        toast('Ordered locally', {
          description: 'AI planner unavailable — sorted with built-in logic. Add an API key for smarter ordering.',
        });
      }
    }

    if (ordered.length === 0) {
      toast('Could not parse any tasks', { description: 'Try listing them more plainly.' });
      setPlanning(false);
      return;
    }

    setItems(
      ordered.map((o, i) =>
        enrich(o.task, o.reason, recurringSet.has(o.task.trim().toLowerCase()), i),
      ),
    );
    setPlanning(false);
  }, [input, todaysRecurring]);

  const selectedCount = items.filter((i) => i.selected).length;
  const totalXP = items.filter((i) => i.selected).reduce((s, i) => s + i.xp, 0);

  const toggleItem = useCallback((id: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  const handleAddAll = useCallback(() => {
    const toAdd = items.filter((i) => i.selected);
    if (toAdd.length === 0) {
      toast('Nothing selected', { description: 'Toggle on at least one task before adding.' });
      return;
    }
    setAdding(true);
    // Added in plan order; the store assigns sort_order sequentially.
    for (const item of toAdd) {
      addQuest({
        title: item.title,
        description: null,
        pillar: item.pillar,
        difficulty: item.difficulty,
        xp_reward: item.xp,
        quest_type: item.questType,
        is_recurring: item.questType === 'daily',
        recurrence_rule: item.questType === 'daily' ? 'daily' : null,
        due_date: null,
      });
    }
    toast.success(`Added ${toAdd.length} task${toAdd.length === 1 ? '' : 's'} in order`, {
      description: `+${toAdd.reduce((s, i) => s + i.xp, 0)} XP available.`,
    });
    setInput('');
    setItems([]);
    setAdding(false);
  }, [items, addQuest]);

  const handleClear = useCallback(() => {
    setInput('');
    setItems([]);
    setUsedFallback(false);
  }, []);

  return (
    <HUDPanel delay={0.3}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-accent/15 flex items-center justify-center">
            <ListChecks size={13} className="text-accent drop-shadow-[0_0_6px_rgba(200,200,200,0.3)]" />
          </div>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Today&apos;s Plan</h2>
          <span className="text-[10px] text-text-placeholder uppercase tracking-wider font-medium ml-1">
            Plan my day
          </span>
        </div>
        {(items.length > 0 || input) && (
          <button
            onClick={handleClear}
            className="text-[11px] text-text-placeholder hover:text-text-secondary transition-colors cursor-pointer flex items-center gap-1"
          >
            <Trash2 size={11} /> Clear
          </button>
        )}
      </div>

      {/* Recurring tasks auto-added for today */}
      {todaysRecurring.length > 0 && (
        <div className="mb-2.5 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-text-placeholder uppercase tracking-wider mr-1 flex items-center gap-1">
            <Repeat size={9} /> Auto-added today
          </span>
          {todaysRecurring.map((t) => (
            <span
              key={t.id}
              className="group inline-flex items-center gap-1 text-[11px] text-text-secondary
                bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-full pl-2.5 pr-1.5 py-0.5"
            >
              {t.name}
              <button
                onClick={() => setDismissed((prev) => new Set(prev).add(t.id))}
                aria-label={`Skip ${t.name} today`}
                className="text-text-placeholder hover:text-danger transition-colors cursor-pointer"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div
        className={`relative rounded-xl border transition-colors ${
          isListening ? 'border-accent/40 ring-2 ring-accent/15' : 'border-[rgba(255,255,255,0.06)]'
        }`}
      >
        <Wand2 size={13} className="absolute left-3 top-3 text-text-placeholder pointer-events-none" />
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            'What do you want to get done today? Just type freely — or tap the mic and speak.\n  e.g. "gym, finish the deck for Valence, reply to the optometry client, grocery run"'
          }
          rows={5}
          className="w-full bg-[rgba(255,255,255,0.02)] rounded-xl border-0
            pl-9 pr-12 py-2.5 text-sm text-text-primary placeholder:text-text-placeholder
            focus:outline-none focus:bg-[rgba(255,255,255,0.03)]
            resize-y min-h-[110px] leading-relaxed"
        />
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleVoice}
            aria-pressed={isListening}
            title={isListening ? 'Stop listening' : 'Speak — your words fill the box'}
            aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
            className={`absolute right-2 bottom-2 flex items-center justify-center w-9 h-9 rounded-lg transition-all cursor-pointer ${
              isListening
                ? 'bg-danger/25 text-danger shadow-[0_0_12px_rgba(248,113,113,0.3)] animate-pulse'
                : 'bg-[rgba(255,255,255,0.06)] text-text-tertiary hover:text-accent hover:bg-accent/10'
            }`}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mt-2.5">
        <span className="text-[10px] text-text-placeholder">
          {isListening ? 'Listening… tap the mic to stop' : ''}
        </span>
        <HUDButton size="sm" onClick={handlePlan} disabled={planning}>
          {planning ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {planning ? 'Planning…' : 'Plan my day'}
        </HUDButton>
      </div>

      {/* Ordered result */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex items-center justify-between mb-2 px-1">
              <div className="flex items-center gap-1.5 text-[11px] text-text-placeholder">
                <Sparkles size={11} className="text-accent" />
                <span>
                  Most efficient order ·{' '}
                  <span className="text-text-secondary font-semibold tabular-nums">{items.length}</span> task
                  {items.length === 1 ? '' : 's'}
                </span>
              </div>
              {usedFallback && (
                <span className="text-[10px] text-text-placeholder uppercase tracking-wider">Local ordering</span>
              )}
            </div>

            <ol className="flex flex-col gap-1.5">
              {items.map((item, idx) => (
                <OrderedRow key={item.id} item={item} index={idx} onToggle={toggleItem} onRemove={removeItem} />
              ))}
            </ol>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <div className="text-[11px] text-text-placeholder">
                <span className="text-text-secondary font-semibold tabular-nums">{selectedCount}</span> selected ·{' '}
                <span className="text-accent font-semibold tabular-nums">+{totalXP} XP</span>
              </div>
              <HUDButton size="sm" onClick={handleAddAll} disabled={adding || selectedCount === 0}>
                <Plus size={13} /> Add {selectedCount} in order
              </HUDButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </HUDPanel>
  );
}

function OrderedRow({
  item,
  index,
  onToggle,
  onRemove,
}: {
  item: OrderedItem;
  index: number;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const cfg = PILLAR_CONFIG[item.pillar];
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: item.selected ? 1 : 0.4, y: 0 }}
      className="flex items-start gap-2.5 px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.04)]
        bg-[rgba(0,0,0,0.2)] hover:bg-[rgba(255,255,255,0.02)] transition-colors group"
    >
      {/* Order number badge */}
      <span
        className="mt-0.5 w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold tabular-nums"
        style={{ backgroundColor: `${cfg.color}1f`, color: cfg.color }}
      >
        {index + 1}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-sm min-w-0 truncate ${
              item.selected ? 'text-text-primary' : 'text-text-placeholder line-through'
            }`}
            title={item.title}
          >
            {item.title}
          </span>
          {item.recurring && (
            <Repeat size={10} className="text-accent flex-shrink-0" aria-label="Recurring task" />
          )}
        </div>
        {item.reason && (
          <p className="text-[11px] text-text-placeholder leading-snug mt-0.5">{item.reason}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
        <DifficultyBadge difficulty={item.difficulty} />
        <span className="text-xs font-medium text-text-placeholder whitespace-nowrap tabular-nums">+{item.xp}</span>
        <button
          onClick={() => onToggle(item.id)}
          aria-pressed={item.selected}
          aria-label={item.selected ? 'Skip this task' : 'Include this task'}
          className={`w-[16px] h-[16px] rounded-md flex-shrink-0 border-[1.5px] flex items-center justify-center
            transition-all cursor-pointer ${
              item.selected
                ? 'border-accent bg-accent/20 shadow-[0_0_6px_rgba(200,200,200,0.15)]'
                : 'border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)]'
            }`}
        >
          {item.selected && <span className="w-1.5 h-1.5 rounded-sm bg-accent" />}
        </button>
        <button
          onClick={() => onRemove(item.id)}
          aria-label="Remove this task"
          className="text-text-placeholder hover:text-danger transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
        >
          <X size={12} />
        </button>
      </div>
    </motion.li>
  );
}
