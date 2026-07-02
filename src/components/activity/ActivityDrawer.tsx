'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useStore } from '@/stores/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MoreVertical,
  Search,
  Timer,
  Trash2,
  Download,
  LayoutList,
  LayoutGrid,
  BarChart2,
} from 'lucide-react';
import { format } from 'date-fns';
import ActivityEntry from './ActivityEntry';
import AnimatedCounter from '@/components/ui/AnimatedCounter';
import type { ActivityFeedType } from '@/lib/types';

type ViewMode = 'timeline' | 'compact' | 'stats';

export default function ActivityDrawer() {
  const activityFeed = useStore((s) => s.activityFeed);
  const pinActivity = useStore((s) => s.pinActivity);
  const dismissActivity = useStore((s) => s.dismissActivity);
  const clearActivityLog = useStore((s) => s.clearActivityLog);
  const xpHistory = useStore((s) => s.xpHistory);
  const quests = useStore((s) => s.quests);
  const user = useStore((s) => s.user);

  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(40);
  const [filter, setFilter] = useState<ActivityFeedType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [showMenu, setShowMenu] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const dragStartY = useRef(0);
  const startHeight = useRef(40);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const filtered = useMemo(() => {
    let list = activityFeed.filter((e) => !e.dismissed);
    if (filter !== 'all') list = list.filter((e) => e.type === filter);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description?.toLowerCase().includes(q) ?? false)
      );
    }
    return list;
  }, [activityFeed, filter, debouncedSearch]);

  const todayXP = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return xpHistory.filter((e) => e.date === today).reduce((s, e) => s + e.xp, 0);
  }, [xpHistory]);

  const todayCount = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return quests.filter((q) => q.completed_at && q.completed_at.startsWith(today)).length;
  }, [quests]);

  const totalToday = quests.filter((q) => q.quest_type === 'daily' || (q.due_date === format(new Date(), 'yyyy-MM-dd'))).length;

  const handleExport = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(activityFeed, null, 2));
    setShowMenu(false);
  }, [activityFeed]);

  const handleClear = useCallback(() => {
    if (confirmClear) {
      clearActivityLog();
      setConfirmClear(false);
      setShowMenu(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  }, [clearActivityLog, confirmClear]);

  const FILTERS: { value: ActivityFeedType | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'task_complete', label: 'Tasks' },
    { value: 'xp_gain', label: 'XP' },
    { value: 'focus_complete', label: 'Focus' },
    { value: 'achievement', label: 'Achievements' },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-elevated border border-border text-text-secondary hover:text-text-primary shadow-lg"
        aria-label={open ? 'Close activity' : 'Open activity'}
      >
        <BarChart2 size={18} />
        <span className="text-sm font-medium">Activity</span>
        {activityFeed.filter((e) => !e.dismissed).length > 0 && (
          <span className="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded-full">
            {activityFeed.filter((e) => !e.dismissed).length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: `${Math.min(Math.max(height, 30), 85)}vh`,
              opacity: 1,
            }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-[rgba(9,9,11,0.95)] backdrop-blur-xl border-t border-border flex flex-col"
          >
            <div
              className="flex-shrink-0 w-10 h-1 rounded-full bg-border mx-auto mt-2 cursor-ns-resize"
              onMouseDown={(e) => {
                dragStartY.current = e.clientY;
                startHeight.current = height;
                const onMove = (e: MouseEvent) => {
                  const dy = dragStartY.current - e.clientY;
                  setHeight(Math.min(85, Math.max(30, startHeight.current + (dy / window.innerHeight) * 100)));
                };
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove);
                  window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
              }}
              aria-label="Drag to resize"
            />

            <div className="flex-1 overflow-hidden flex flex-col px-4 pb-4">
              <div className="grid grid-cols-3 gap-3 py-3 flex-shrink-0">
                <div className="bg-[rgba(255,255,255,0.04)] rounded-xl p-3">
                  <div className="text-xs text-text-placeholder uppercase tracking-wider">Today&apos;s XP</div>
                  <div className="text-2xl font-bold text-white">
                    <AnimatedCounter value={todayXP} />
                  </div>
                </div>
                <div className="bg-[rgba(255,255,255,0.04)] rounded-xl p-3">
                  <div className="text-xs text-text-placeholder uppercase tracking-wider">Tasks Done</div>
                  <div className="text-2xl font-bold text-white">
                    {todayCount}/{totalToday || 1}
                  </div>
                </div>
                <div className="bg-[rgba(255,255,255,0.04)] rounded-xl p-3">
                  <div className="text-xs text-text-placeholder uppercase tracking-wider">Streak</div>
                  <div className="text-2xl font-bold text-white">
                    {user?.current_streak ?? 0} 🔥
                  </div>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2 flex-shrink-0">
                {FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
                      filter === f.value
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'text-text-tertiary hover:text-text-primary border border-transparent'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 py-2 flex-shrink-0">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-placeholder" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search activities..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-border text-sm text-text-primary placeholder:text-text-placeholder"
                  />
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1.5 rounded-lg text-text-placeholder hover:text-text-primary border border-border"
                    aria-label="Menu"
                  >
                    <MoreVertical size={16} />
                  </button>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 py-1 rounded-lg bg-bg-elevated border border-border shadow-xl z-20 min-w-[140px]">
                        <button
                          onClick={() => setViewMode('timeline')}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-bg-hover"
                        >
                          <LayoutList size={14} /> Timeline
                        </button>
                        <button
                          onClick={() => setViewMode('compact')}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-bg-hover"
                        >
                          <LayoutGrid size={14} /> Compact
                        </button>
                        <button
                          onClick={() => setViewMode('stats')}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-bg-hover"
                        >
                          <BarChart2 size={14} /> Stats
                        </button>
                        <a
                          href="/focus"
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-bg-hover"
                        >
                          <Timer size={14} /> Start Focus
                        </a>
                        <button
                          onClick={handleExport}
                          className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-bg-hover"
                        >
                          <Download size={14} /> Export
                        </button>
                        <button
                          onClick={handleClear}
                          className={`flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-bg-hover ${confirmClear ? 'text-red-400' : ''}`}
                        >
                          <Trash2 size={14} /> {confirmClear ? 'Confirm clear?' : 'Clear Feed'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0">
                {viewMode === 'stats' ? (
                  <div className="py-4 text-sm text-text-tertiary">
                    <p>Total entries: {activityFeed.length}</p>
                    <p>Visible: {filtered.length}</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="py-12 text-center text-text-placeholder text-sm">
                    {debouncedSearch.trim() ? 'No results' : 'No activity yet'}
                  </div>
                ) : (
                  <div className={viewMode === 'compact' ? 'space-y-1' : ''}>
                    {filtered.slice(0, 50).map((entry, i) => (
                      <ActivityEntry
                        key={entry.id}
                        entry={entry}
                        index={i}
                        onPin={pinActivity}
                        onDismiss={dismissActivity}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border text-xs text-text-placeholder flex-shrink-0">
                <span>{activityFeed.length} entries</span>
                <span>·</span>
                <span>{filtered.filter((e) => e.timestamp.startsWith(format(new Date(), 'yyyy-MM-dd'))).length} today</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
