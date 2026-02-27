'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Command } from 'lucide-react';

const SHORTCUTS = [
  { key: 'g h', label: 'Go to Dashboard', path: '/' },
  { key: 'g t', label: 'Go to Tasks', path: '/quests' },
  { key: 'g a', label: 'Go to Analytics', path: '/analytics' },
  { key: 'g g', label: 'Go to Goals', path: '/goals' },
  { key: 'g f', label: 'Go to Focus', path: '/focus' },
  { key: 'g s', label: 'Go to Settings', path: '/settings' },
];

export default function KeyboardShortcuts() {
  const router = useRouter();
  const [showPalette, setShowPalette] = useState(false);
  const [search, setSearch] = useState('');
  const [pendingG, setPendingG] = useState(false);

  const filtered = SHORTCUTS.filter((s) =>
    s.label.toLowerCase().includes(search.toLowerCase())
  );

  const navigate = useCallback((path: string) => {
    router.push(path);
    setShowPalette(false);
    setSearch('');
  }, [router]);

  useEffect(() => {
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowPalette((v) => !v);
        setSearch('');
        return;
      }

      if (e.key === 'Escape') {
        setShowPalette(false);
        setPendingG(false);
        return;
      }

      if (isInput) return;

      if (e.key === 'g' && !e.metaKey && !e.ctrlKey) {
        setPendingG(true);
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => setPendingG(false), 1000);
        return;
      }

      if (pendingG) {
        setPendingG(false);
        const combo = `g ${e.key}`;
        const shortcut = SHORTCUTS.find((s) => s.key === combo);
        if (shortcut) {
          e.preventDefault();
          navigate(shortcut.path);
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [pendingG, navigate]);

  return (
    <AnimatePresence>
      {showPalette && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm"
          onClick={() => setShowPalette(false)}>
          <motion.div initial={{ scale: 0.95, y: -10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: -10 }}
            className="bg-bg-card rounded-xl border border-border shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Search size={16} className="text-text-tertiary" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search commands..." autoFocus
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-placeholder outline-none" />
              <button onClick={() => setShowPalette(false)} className="text-text-placeholder hover:text-text-secondary cursor-pointer">
                <X size={14} />
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto py-1">
              {filtered.map((s) => (
                <button key={s.key} onClick={() => navigate(s.path)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-text-secondary hover:bg-bg-elevated transition-colors cursor-pointer">
                  <span>{s.label}</span>
                  <kbd className="text-[10px] font-mono text-text-placeholder bg-bg-elevated px-1.5 py-0.5 rounded border border-border">{s.key}</kbd>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-text-tertiary">No commands found.</div>
              )}
            </div>
            <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-[10px] text-text-placeholder">
              <span className="flex items-center gap-1"><Command size={10} />K to toggle</span>
              <span>Esc to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
