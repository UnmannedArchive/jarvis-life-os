'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '@/stores/useStore';
import { format, parseISO, isToday, isYesterday, differenceInMinutes } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { PILLAR_CONFIG, Pillar } from '@/lib/types';
import {
  Activity, ChevronUp, ChevronDown, Search, X, Filter,
  Zap, CheckCircle2, ClipboardCheck, Trash2, Clock,
} from 'lucide-react';

type ActionFilter = 'all' | 'quest_complete' | 'checkin' | 'login_bonus' | 'other';
type PillarFilter = 'all' | Pillar;

const ACTION_LABELS: Record<ActionFilter, string> = {
  all: 'All',
  quest_complete: 'Tasks',
  checkin: 'Check-ins',
  login_bonus: 'Bonuses',
  other: 'Other',
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  quest_complete: <CheckCircle2 size={11} className="text-success" />,
  checkin: <ClipboardCheck size={11} className="text-accent" />,
  login_bonus: <Zap size={11} className="text-warning" />,
};

function getTimeLabel(dateStr: string): string {
  const date = parseISO(dateStr);
  const mins = differenceInMinutes(new Date(), date);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (isToday(date)) return format(date, 'h:mm a');
  if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`;
  return format(date, 'MMM d, h:mm a');
}

function getActionIcon(action: string) {
  return ACTION_ICONS[action] || <Activity size={11} className="text-text-placeholder" />;
}

export default function TerminalLog() {
  const activityLog = useStore((s) => s.activityLog);
  const setActivityLog = useStore((s) => s.setActivityLog);
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [pillarFilter, setPillarFilter] = useState<PillarFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showSearch && searchRef.current) {
      searchRef.current.focus();
    }
  }, [showSearch]);

  const filtered = useMemo(() => {
    let items = activityLog;

    if (actionFilter !== 'all') {
      items = items.filter((e) => {
        if (actionFilter === 'other') {
          return !['quest_complete', 'checkin', 'login_bonus'].includes(e.action);
        }
        return e.action === actionFilter;
      });
    }

    if (pillarFilter !== 'all') {
      items = items.filter((e) => e.pillar === pillarFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((e) =>
        e.description.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q)
      );
    }

    return items;
  }, [activityLog, actionFilter, pillarFilter, search]);

  const stats = useMemo(() => {
    const todayEntries = activityLog.filter((e) => isToday(parseISO(e.created_at)));
    const todayXP = todayEntries.reduce((s, e) => s + e.xp_earned, 0);
    const todayCount = todayEntries.length;
    return { todayXP, todayCount };
  }, [activityLog]);

  const handleClearAll = () => {
    setActivityLog([]);
    setSelectedEntry(null);
  };

  const handleDeleteEntry = (id: string) => {
    setActivityLog(activityLog.filter((e) => e.id !== id));
    if (selectedEntry === id) setSelectedEntry(null);
  };

  const activeFilterCount =
    (actionFilter !== 'all' ? 1 : 0) +
    (pillarFilter !== 'all' ? 1 : 0) +
    (search.trim() ? 1 : 0);

  return (
    <div
      className="border-t border-border bg-[rgba(0,0,0,0.95)] backdrop-blur-xl relative"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/8 to-transparent" />

      {/* Header bar — always visible */}
      <div
        className="flex items-center gap-2 px-4 py-1.5 cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <Activity size={11} className="text-text-placeholder" />
        <span className="text-[11px] font-medium text-text-placeholder uppercase tracking-wider">
          Activity
        </span>

        {!expanded && activityLog.length > 0 && (
          <span className="text-[10px] text-text-placeholder tabular-nums ml-1">
            {stats.todayCount} today · {stats.todayXP} XP
          </span>
        )}

        {activeFilterCount > 0 && (
          <span className="ml-1 w-4 h-4 rounded-full bg-accent/20 text-accent text-[9px] font-bold flex items-center justify-center">
            {activeFilterCount}
          </span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {expanded && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setShowSearch(!showSearch); }}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  showSearch ? 'bg-accent-dim text-accent' : 'text-text-placeholder hover:text-text-secondary'
                }`}
              >
                <Search size={11} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowFilters(!showFilters); }}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  showFilters ? 'bg-accent-dim text-accent' : 'text-text-placeholder hover:text-text-secondary'
                }`}
              >
                <Filter size={11} />
              </button>
              {activityLog.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleClearAll(); }}
                  className="p-1 rounded-md text-text-placeholder hover:text-danger transition-colors cursor-pointer"
                  title="Clear all activity"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </>
          )}
          {expanded ? (
            <ChevronDown size={12} className="text-text-placeholder" />
          ) : (
            <ChevronUp size={12} className="text-text-placeholder" />
          )}
        </div>
      </div>

      {/* Collapsed mini-view */}
      {!expanded && (
        <div className="h-[44px] overflow-hidden px-4 pb-1.5">
          <AnimatePresence mode="popLayout">
            {activityLog.length === 0 ? (
              <div className="text-[11px] text-text-placeholder py-1 flex items-center gap-1.5">
                <Clock size={10} />
                No activity yet. Complete a task to get started.
              </div>
            ) : (
              activityLog.slice(0, 3).map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-[11px] py-0.5 leading-relaxed cursor-pointer hover:bg-[rgba(255,255,255,0.02)] rounded px-0.5 -mx-0.5"
                  onClick={(e) => { e.stopPropagation(); setExpanded(true); setSelectedEntry(entry.id); }}
                >
                  {getActionIcon(entry.action)}
                  {entry.pillar && (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PILLAR_CONFIG[entry.pillar].color }}
                    />
                  )}
                  <span className="text-text-placeholder tabular-nums flex-shrink-0 w-12">
                    {getTimeLabel(entry.created_at)}
                  </span>
                  <span className="text-text-tertiary truncate flex-1">{entry.description}</span>
                  {entry.xp_earned > 0 && (
                    <span className="text-accent/60 text-[10px] font-medium tabular-nums flex-shrink-0">
                      +{entry.xp_earned}
                    </span>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Expanded panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 320, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            {/* Search bar */}
            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 overflow-hidden"
                >
                  <div className="relative mb-2">
                    <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-placeholder" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search activity..."
                      className="w-full pl-7 pr-7 py-1.5 text-[11px] bg-[rgba(255,255,255,0.03)] border border-border rounded-lg
                        text-text-primary placeholder:text-text-placeholder focus:outline-none focus:border-accent/30 transition-colors"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-placeholder hover:text-text-secondary cursor-pointer"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Filter pills */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-4 overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="text-[9px] text-text-placeholder uppercase tracking-wider mr-1 self-center">Type</span>
                    {(Object.keys(ACTION_LABELS) as ActionFilter[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => setActionFilter(key)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                          actionFilter === key
                            ? 'bg-accent-dim text-accent border border-accent/15'
                            : 'text-text-placeholder hover:text-text-secondary border border-transparent hover:border-border'
                        }`}
                      >
                        {ACTION_LABELS[key]}
                      </button>
                    ))}

                    <span className="text-[9px] text-text-placeholder uppercase tracking-wider ml-2 mr-1 self-center">Pillar</span>
                    <button
                      onClick={() => setPillarFilter('all')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer ${
                        pillarFilter === 'all'
                          ? 'bg-accent-dim text-accent border border-accent/15'
                          : 'text-text-placeholder hover:text-text-secondary border border-transparent hover:border-border'
                      }`}
                    >
                      All
                    </button>
                    {(['mind', 'body', 'work', 'wealth', 'spirit', 'social'] as Pillar[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPillarFilter(p)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                          pillarFilter === p
                            ? 'border border-accent/15'
                            : 'text-text-placeholder hover:text-text-secondary border border-transparent hover:border-border'
                        }`}
                        style={pillarFilter === p ? { backgroundColor: `${PILLAR_CONFIG[p].color}15`, color: PILLAR_CONFIG[p].color } : {}}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PILLAR_CONFIG[p].color }} />
                        {PILLAR_CONFIG[p].label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Activity list */}
            <div ref={listRef} className="overflow-y-auto px-4 pb-2" style={{ height: expanded ? 280 - (showSearch ? 36 : 0) - (showFilters ? 40 : 0) : 0 }}>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-text-placeholder">
                  <Activity size={20} className="mb-2 opacity-40" />
                  <span className="text-xs">
                    {activityLog.length === 0
                      ? 'No activity yet'
                      : 'No matches for your filters'}
                  </span>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => { setActionFilter('all'); setPillarFilter('all'); setSearch(''); }}
                      className="text-[10px] text-accent hover:underline mt-1 cursor-pointer"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {filtered.map((entry, idx) => {
                    const isSelected = selectedEntry === entry.id;
                    const prevEntry = filtered[idx - 1];
                    const showDateSep = idx === 0 || (
                      prevEntry &&
                      format(parseISO(entry.created_at), 'yyyy-MM-dd') !== format(parseISO(prevEntry.created_at), 'yyyy-MM-dd')
                    );
                    const dateLabel = isToday(parseISO(entry.created_at))
                      ? 'Today'
                      : isYesterday(parseISO(entry.created_at))
                        ? 'Yesterday'
                        : format(parseISO(entry.created_at), 'EEEE, MMM d');

                    return (
                      <div key={entry.id}>
                        {showDateSep && (
                          <div className="flex items-center gap-2 py-1.5 mt-1 first:mt-0">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-[9px] text-text-placeholder uppercase tracking-widest font-medium">
                              {dateLabel}
                            </span>
                            <div className="h-px flex-1 bg-border" />
                          </div>
                        )}

                        <div
                          onClick={() => setSelectedEntry(isSelected ? null : entry.id)}
                          className={`group flex flex-col rounded-lg transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[rgba(255,255,255,0.04)] border border-border/60'
                              : 'hover:bg-[rgba(255,255,255,0.02)] border border-transparent'
                          }`}
                        >
                          {/* Entry row */}
                          <div className="flex items-center gap-2 px-2.5 py-1.5">
                            <div className="flex-shrink-0">{getActionIcon(entry.action)}</div>

                            {entry.pillar && (
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: PILLAR_CONFIG[entry.pillar].color }}
                                title={PILLAR_CONFIG[entry.pillar].label}
                              />
                            )}

                            <span className="text-[11px] text-text-secondary flex-1 truncate">
                              {entry.description}
                            </span>

                            {entry.xp_earned > 0 && (
                              <span className="text-[10px] font-semibold text-accent tabular-nums flex-shrink-0">
                                +{entry.xp_earned} XP
                              </span>
                            )}

                            <span className="text-[10px] text-text-placeholder tabular-nums flex-shrink-0">
                              {getTimeLabel(entry.created_at)}
                            </span>

                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteEntry(entry.id); }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-text-placeholder hover:text-danger transition-all cursor-pointer flex-shrink-0"
                              title="Remove"
                            >
                              <X size={10} />
                            </button>
                          </div>

                          {/* Expanded detail */}
                          <AnimatePresence>
                            {isSelected && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-2.5 pb-2 pt-0.5 grid grid-cols-3 gap-2 border-t border-border/30 mt-0.5">
                                  <div>
                                    <div className="text-[9px] text-text-placeholder uppercase tracking-wider mb-0.5">Action</div>
                                    <div className="text-[11px] text-text-secondary font-medium capitalize">
                                      {entry.action.replace(/_/g, ' ')}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[9px] text-text-placeholder uppercase tracking-wider mb-0.5">Pillar</div>
                                    <div className="flex items-center gap-1">
                                      {entry.pillar ? (
                                        <>
                                          <span
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: PILLAR_CONFIG[entry.pillar].color }}
                                          />
                                          <span className="text-[11px] text-text-secondary">
                                            {PILLAR_CONFIG[entry.pillar].label}
                                          </span>
                                        </>
                                      ) : (
                                        <span className="text-[11px] text-text-placeholder">—</span>
                                      )}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-[9px] text-text-placeholder uppercase tracking-wider mb-0.5">Time</div>
                                    <div className="text-[11px] text-text-secondary tabular-nums">
                                      {format(parseISO(entry.created_at), 'h:mm:ss a')}
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer stats */}
            <div className="flex items-center justify-between px-4 py-1 border-t border-border/40">
              <span className="text-[9px] text-text-placeholder tabular-nums">
                {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
                {activeFilterCount > 0 && ` (filtered from ${activityLog.length})`}
              </span>
              <span className="text-[9px] text-text-placeholder tabular-nums">
                Today: {stats.todayCount} actions · {stats.todayXP} XP earned
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
