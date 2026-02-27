'use client';

import { useState, useRef, useCallback, ReactNode, useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { WIDGET_REGISTRY, DEFAULT_LAYOUT, getWidgetConfig } from '@/lib/widgets';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GripVertical, X, Plus, Settings2, Lock,
  Sun, Crosshair, Target, Zap, Gift, CheckSquare, Calendar, CalendarDays,
  Flame, User, Hexagon, Trophy, ArrowRight, BarChart3, Activity, Gauge,
} from 'lucide-react';

import LoginBonus from '@/components/dashboard/LoginBonus';
import WelcomeBriefing from '@/components/dashboard/WelcomeBriefing';
import DailyIntention from '@/components/dashboard/DailyIntention';
import DailyCommitment from '@/components/dashboard/DailyCommitment';
import ProgressNudge from '@/components/dashboard/ProgressNudge';
import PriorityQueue from '@/components/dashboard/PriorityQueue';
import LifeBalanceRadar from '@/components/dashboard/LifeBalanceRadar';
import CharacterStatus from '@/components/dashboard/CharacterStatus';
import StreakCalendar from '@/components/dashboard/StreakCalendar';
import HabitWeek from '@/components/dashboard/HabitWeek';
import Achievements from '@/components/dashboard/Achievements';
import TomorrowHook from '@/components/dashboard/TomorrowHook';
import EndOfDayReview from '@/components/dashboard/EndOfDayReview';
import SystemStatus from '@/components/dashboard/SystemStatus';
import GoogleCalendarWidget from '@/components/dashboard/GoogleCalendarWidget';
import PerformanceRating from '@/components/dashboard/PerformanceRating';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Sun, Crosshair, Target, Zap, Gift, CheckSquare, Calendar, CalendarDays,
  Flame, User, Hexagon, Trophy, ArrowRight, BarChart3, Activity, Gauge,
};

const WIDGET_COMPONENTS: Record<string, React.ComponentType> = {
  login_bonus: LoginBonus,
  welcome: WelcomeBriefing,
  intention: DailyIntention,
  commitment: DailyCommitment,
  nudge: ProgressNudge,
  tasks: PriorityQueue,
  habits: HabitWeek,
  streak: StreakCalendar,
  character: CharacterStatus,
  radar: LifeBalanceRadar,
  achievements: Achievements,
  performance: PerformanceRating,
  tomorrow: TomorrowHook,
  review: EndOfDayReview,
  system: SystemStatus,
  gcalendar: GoogleCalendarWidget,
};

function WidgetIcon({ name, size = 14, className }: { name: string; size?: number; className?: string }) {
  const Icon = ICON_MAP[name];
  return Icon ? <Icon size={size} className={className} /> : null;
}

interface WidgetWrapperProps {
  id: string;
  editing: boolean;
  onRemove: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isOver: boolean;
  children: ReactNode;
}

function WidgetWrapper({ id, editing, onRemove, onDragStart, onDragOver, onDragEnd, isDragging, isOver, children }: WidgetWrapperProps) {
  const config = getWidgetConfig(id);

  return (
    <motion.div
      layout
      layoutId={id}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      draggable={editing}
      onDragStart={() => onDragStart(id)}
      onDragOver={(e) => onDragOver(e as unknown as React.DragEvent, id)}
      onDragEnd={onDragEnd}
      className={`relative transition-all ${
        editing ? 'cursor-grab active:cursor-grabbing' : ''
      } ${isDragging ? 'opacity-30 scale-95' : ''} ${
        isOver ? 'ring-2 ring-accent/40 ring-offset-2 ring-offset-bg rounded-2xl' : ''
      }`}
    >
      {editing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-2 -right-2 z-20 flex items-center gap-1"
        >
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(id); }}
            className="w-6 h-6 rounded-full bg-danger/90 text-white flex items-center justify-center
              shadow-lg hover:bg-danger transition-colors cursor-pointer backdrop-blur-sm"
          >
            <X size={12} strokeWidth={3} />
          </button>
        </motion.div>
      )}

      {editing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute -top-2 -left-2 z-20"
        >
          <div className="w-6 h-6 rounded-full bg-bg-elevated border border-border flex items-center justify-center shadow-lg backdrop-blur-sm">
            <GripVertical size={11} className="text-text-placeholder" />
          </div>
        </motion.div>
      )}

      {editing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          className="absolute inset-0 z-10 rounded-2xl border-2 border-dashed border-accent/20 pointer-events-none"
        />
      )}

      <div className={editing ? 'pointer-events-none select-none' : ''}>
        {children}
      </div>
    </motion.div>
  );
}

function WidgetPicker({ activeWidgets, onAdd, onClose }: { activeWidgets: string[]; onAdd: (id: string) => void; onClose: () => void }) {
  const available = WIDGET_REGISTRY.filter((w) => !activeWidgets.includes(w.id));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="glass-card rounded-2xl p-5 mb-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Plus size={14} className="text-accent" />
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Add Widgets</h3>
        </div>
        <button onClick={onClose} className="text-text-placeholder hover:text-text-secondary cursor-pointer transition-colors">
          <X size={16} />
        </button>
      </div>

      {available.length === 0 ? (
        <p className="text-xs text-text-placeholder py-3 text-center">All widgets are on your dashboard.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {available.map((w) => (
            <button
              key={w.id}
              onClick={() => onAdd(w.id)}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-[rgba(255,255,255,0.02)]
                hover:border-accent/30 hover:bg-accent-dim/30 transition-all cursor-pointer text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-accent-dim flex items-center justify-center flex-shrink-0
                group-hover:bg-accent/20 transition-colors">
                <WidgetIcon name={w.icon} size={14} className="text-accent" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-text-primary truncate">{w.label}</div>
                <div className="text-[10px] text-text-placeholder truncate">{w.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export default function DashboardGrid() {
  const storedWidgets = useStore((s) => s.dashboardWidgets);
  const setDashboardWidgets = useStore((s) => s.setDashboardWidgets);

  const widgets = useMemo(() => {
    if (storedWidgets && storedWidgets.length > 0) return storedWidgets;
    return DEFAULT_LAYOUT;
  }, [storedWidgets]);

  const [editing, setEditing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragIndexRef = useRef<number>(-1);

  const updateWidgets = useCallback((newWidgets: string[]) => {
    setDashboardWidgets(newWidgets);
  }, [setDashboardWidgets]);

  const handleRemove = useCallback((id: string) => {
    updateWidgets(widgets.filter((w) => w !== id));
  }, [widgets, updateWidgets]);

  const handleAdd = useCallback((id: string) => {
    updateWidgets([...widgets, id]);
  }, [widgets, updateWidgets]);

  const handleDragStart = useCallback((id: string) => {
    setDragId(id);
    dragIndexRef.current = widgets.indexOf(id);
  }, [widgets]);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (!dragId || dragId === id) {
      setOverId(null);
      return;
    }
    setOverId(id);
  }, [dragId]);

  const handleDragEnd = useCallback(() => {
    if (dragId && overId && dragId !== overId) {
      const fromIndex = widgets.indexOf(dragId);
      const toIndex = widgets.indexOf(overId);
      if (fromIndex !== -1 && toIndex !== -1) {
        const newWidgets = [...widgets];
        newWidgets.splice(fromIndex, 1);
        newWidgets.splice(toIndex, 0, dragId);
        updateWidgets(newWidgets);
      }
    }
    setDragId(null);
    setOverId(null);
    dragIndexRef.current = -1;
  }, [dragId, overId, widgets, updateWidgets]);

  const handleReset = useCallback(() => {
    updateWidgets(DEFAULT_LAYOUT);
  }, [updateWidgets]);

  const gridItems = useMemo(() => {
    const items: { id: string; col: 'full' | 'wide' | 'small' }[] = [];
    for (const id of widgets) {
      const config = getWidgetConfig(id);
      if (!config) continue;
      items.push({ id, col: config.defaultSize });
    }
    return items;
  }, [widgets]);

  const topFull = gridItems.filter((i) => i.col === 'full' && ['login_bonus', 'welcome', 'intention', 'commitment', 'nudge'].includes(i.id));
  const mainWide = gridItems.filter((i) => i.col === 'wide');
  const mainSmall = gridItems.filter((i) => i.col === 'small');
  const bottomFull = gridItems.filter((i) => i.col === 'full' && !['login_bonus', 'welcome', 'intention', 'commitment', 'nudge'].includes(i.id));

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Edit toolbar */}
      <div className="flex items-center justify-end gap-2 mb-3">
        {editing && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
            <button
              onClick={() => setShowPicker(!showPicker)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                bg-accent-dim border border-accent/20 text-accent hover:bg-accent/15 transition-all cursor-pointer"
            >
              <Plus size={12} /> Add Widget
            </button>
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-placeholder
                border border-border hover:border-border-hover hover:text-text-secondary transition-all cursor-pointer"
            >
              Reset
            </button>
          </motion.div>
        )}
        <button
          onClick={() => { setEditing(!editing); if (editing) setShowPicker(false); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            editing
              ? 'bg-accent text-white shadow-[0_0_16px_rgba(200,200,200,0.2)]'
              : 'border border-border text-text-placeholder hover:text-text-secondary hover:border-border-hover'
          }`}
        >
          {editing ? <Lock size={12} /> : <Settings2 size={12} />}
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>

      <AnimatePresence>
        {showPicker && editing && (
          <WidgetPicker
            activeWidgets={widgets}
            onAdd={handleAdd}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>

      {/* Top full-width widgets */}
      {topFull.map((item) => {
        const Component = WIDGET_COMPONENTS[item.id];
        if (!Component) return null;
        return (
          <WidgetWrapper
            key={item.id}
            id={item.id}
            editing={editing}
            onRemove={handleRemove}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            isDragging={dragId === item.id}
            isOver={overId === item.id}
          >
            <Component />
          </WidgetWrapper>
        );
      })}

      {/* Main grid: wide left + small right */}
      {(mainWide.length > 0 || mainSmall.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <div className="lg:col-span-2 flex flex-col gap-4">
            {mainWide.map((item) => {
              const Component = WIDGET_COMPONENTS[item.id];
              if (!Component) return null;
              return (
                <WidgetWrapper
                  key={item.id}
                  id={item.id}
                  editing={editing}
                  onRemove={handleRemove}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  isDragging={dragId === item.id}
                  isOver={overId === item.id}
                >
                  <Component />
                </WidgetWrapper>
              );
            })}
          </div>
          <div className="flex flex-col gap-4">
            {mainSmall.map((item) => {
              const Component = WIDGET_COMPONENTS[item.id];
              if (!Component) return null;
              return (
                <WidgetWrapper
                  key={item.id}
                  id={item.id}
                  editing={editing}
                  onRemove={handleRemove}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  isDragging={dragId === item.id}
                  isOver={overId === item.id}
                >
                  <Component />
                </WidgetWrapper>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom full-width widgets */}
      {bottomFull.map((item) => {
        const Component = WIDGET_COMPONENTS[item.id];
        if (!Component) return null;
        return (
          <div key={item.id} className="mt-4">
            <WidgetWrapper
              id={item.id}
              editing={editing}
              onRemove={handleRemove}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              isDragging={dragId === item.id}
              isOver={overId === item.id}
            >
              <Component />
            </WidgetWrapper>
          </div>
        );
      })}

      {widgets.length === 0 && (
        <div className="text-center py-20">
          <Settings2 size={32} className="mx-auto mb-3 text-text-placeholder opacity-30" />
          <p className="text-text-tertiary text-sm mb-2">Your dashboard is empty.</p>
          <button
            onClick={() => { setEditing(true); setShowPicker(true); }}
            className="text-xs text-accent hover:text-accent-hover cursor-pointer transition-colors"
          >
            Add some widgets to get started
          </button>
        </div>
      )}
    </div>
  );
}
