'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2 } from 'lucide-react';
import { Quest } from '@/lib/types';

interface UndoState {
  quest: Quest;
  previousXP: number;
  timeout: ReturnType<typeof setTimeout>;
}

let undoStack: UndoState | null = null;
let setGlobalUndo: ((v: UndoState | null) => void) | null = null;

export function captureUndoState(questId: string) {
  const state = useStore.getState();
  const quest = state.quests.find((q) => q.id === questId);
  if (!quest || quest.completed) return;

  if (undoStack?.timeout) clearTimeout(undoStack.timeout);

  const timeout = setTimeout(() => {
    undoStack = null;
    setGlobalUndo?.(null);
  }, 5000);

  undoStack = { quest: { ...quest }, previousXP: state.user?.total_xp || 0, timeout };
  setGlobalUndo?.(undoStack);
}

export default function UndoToast() {
  const [current, setCurrent] = useState<UndoState | null>(null);
  const setQuests = useStore((s) => s.setQuests);
  const setUser = useStore((s) => s.setUser);
  const user = useStore((s) => s.user);
  const quests = useStore((s) => s.quests);

  useEffect(() => { setGlobalUndo = setCurrent; return () => { setGlobalUndo = null; }; }, []);

  const handleUndo = useCallback(() => {
    if (!current || !user) return;
    const restored = quests.map((q) =>
      q.id === current.quest.id ? { ...current.quest, completed: false, completed_at: null } : q
    );
    setQuests(restored);
    setUser({ ...user, total_xp: current.previousXP });
    if (current.timeout) clearTimeout(current.timeout);
    undoStack = null;
    setCurrent(null);
  }, [current, user, quests, setQuests, setUser]);

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[80]"
        >
          <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
            <span className="text-sm text-text-secondary">Task completed</span>
            <button onClick={handleUndo}
              className="flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-hover transition-colors cursor-pointer">
              <Undo2 size={14} /> Undo
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
