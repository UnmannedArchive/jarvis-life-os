'use client';

import { useState, useEffect, useCallback } from 'react';
import { useStore, XPHistoryEntry } from '@/stores/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Undo2 } from 'lucide-react';
import { Quest, User, LifePillar, ActivityLogEntry, ActivityFeedEntry } from '@/lib/types';

// completeQuest fans out into pillar XP/streaks, total XP, character class,
// xpHistory, the activity log, and the activity feed — so undo restores a
// snapshot of all of those, not just total_xp (which silently left ghost
// pillar XP behind). The window is 5s and a new completion replaces the
// snapshot, so wholesale slice restore is safe in practice.
interface UndoState {
  quest: Quest;
  snapshot: {
    user: User | null;
    pillars: LifePillar[];
    xpHistory: XPHistoryEntry[];
    activityLog: ActivityLogEntry[];
    activityFeed: ActivityFeedEntry[];
  };
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

  undoStack = {
    quest: { ...quest },
    snapshot: {
      user: state.user,
      pillars: state.pillars,
      xpHistory: state.xpHistory,
      activityLog: state.activityLog,
      activityFeed: state.activityFeed,
    },
    timeout,
  };
  setGlobalUndo?.(undoStack);
}

export default function UndoToast() {
  const [current, setCurrent] = useState<UndoState | null>(null);

  useEffect(() => { setGlobalUndo = setCurrent; return () => { setGlobalUndo = null; }; }, []);

  const handleUndo = useCallback(() => {
    if (!current) return;
    useStore.setState({
      ...current.snapshot,
      // Other quests may have changed in the window; only this one reverts.
      quests: useStore.getState().quests.map((q) =>
        q.id === current.quest.id ? { ...current.quest, completed: false, completed_at: null } : q
      ),
    });
    clearTimeout(current.timeout);
    undoStack = null;
    setCurrent(null);
  }, [current]);

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
