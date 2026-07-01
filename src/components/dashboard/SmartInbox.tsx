'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Check, AlertCircle, Undo2 } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { routeInput, dispatchRouteDecision } from '@/lib/inputRouter';
import type { ClassifyResponse } from '@/lib/inputRouter';

type Status =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'success'; destination: string; rationale: string; undo: () => void }
  | { kind: 'error'; message: string };

const PLACEHOLDERS = [
  'Add a quest, idea, intention, or just say what happened…',
  'Try: "5k run tomorrow morning"',
  'Try: "today is about shipping the auth flow"',
  'Try: "what if habit tracking worked through iMessage"',
  'Try: "drank too much last night"',
];

export default function SmartInbox() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const submit = useCallback(async () => {
    const value = text.trim();
    if (!value || status.kind === 'pending') return;

    setStatus({ kind: 'pending' });
    try {
      const result: ClassifyResponse = await routeInput(value);
      const { destination, undo } = dispatchRouteDecision(
        result.decision,
        useStore.getState(),
      );
      setText('');
      setStatus({ kind: 'success', destination, rationale: result.rationale, undo });
      if (successTimer.current) clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => {
        setStatus({ kind: 'idle' });
      }, 4500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setStatus({ kind: 'error', message });
    }
  }, [text, status.kind]);

  const handleUndo = useCallback(() => {
    if (status.kind !== 'success') return;
    status.undo();
    setStatus({ kind: 'idle' });
  }, [status]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void submit();
      } else if (e.key === 'Escape') {
        setText('');
        setStatus({ kind: 'idle' });
      } else if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey)) {
        if (status.kind === 'success') {
          e.preventDefault();
          handleUndo();
        }
      }
    },
    [submit, status, handleUndo],
  );

  return (
    <div className="mb-4">
      <div
        className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all
          ${status.kind === 'error'
            ? 'border-danger/40 bg-danger/[0.04]'
            : status.kind === 'success'
              ? 'border-emerald-400/30 bg-emerald-400/[0.04]'
              : 'border-border bg-[rgba(255,255,255,0.02)] hover:border-border-hover focus-within:border-accent/40 focus-within:bg-[rgba(255,255,255,0.04)]'}
        `}
      >
        <div className="flex-shrink-0">
          {status.kind === 'pending' ? (
            <Loader2 size={16} className="text-accent animate-spin" />
          ) : status.kind === 'success' ? (
            <Check size={16} className="text-emerald-400" />
          ) : status.kind === 'error' ? (
            <AlertCircle size={16} className="text-danger" />
          ) : (
            <Sparkles size={16} className="text-accent" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (status.kind === 'error') setStatus({ kind: 'idle' });
          }}
          onKeyDown={handleKey}
          placeholder={PLACEHOLDERS[placeholderIdx]}
          disabled={status.kind === 'pending'}
          aria-label="Smart inbox"
          className="flex-1 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-placeholder
            disabled:opacity-60"
        />

        <kbd
          className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md
            border border-border text-[10px] text-text-placeholder font-mono"
        >
          ⏎
        </kbd>
      </div>

      <AnimatePresence>
        {status.kind === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            aria-live="polite"
            className="mt-2 flex items-center justify-between gap-3 px-3 py-2 rounded-xl
              bg-emerald-400/[0.06] border border-emerald-400/15"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">
                Routed
              </span>
              <span className="text-xs text-text-secondary truncate">
                → {status.destination}
              </span>
              <span className="hidden md:inline text-[11px] text-text-placeholder truncate">
                · {status.rationale}
              </span>
            </div>
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-text-placeholder
                hover:text-text-secondary hover:bg-[rgba(255,255,255,0.04)] transition-colors cursor-pointer"
            >
              <Undo2 size={11} /> Undo
            </button>
          </motion.div>
        )}

        {status.kind === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            aria-live="polite"
            className="mt-2 px-3 py-2 rounded-xl bg-danger/[0.06] border border-danger/20"
          >
            <span className="text-[11px] text-danger">
              Couldn’t route that — {status.message}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
