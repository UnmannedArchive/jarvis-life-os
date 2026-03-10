'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/stores/useStore';
import { analyzeReflection, JournalEntry, ReflectionAnalysis } from '@/lib/reflectAI';
import { PILLAR_CONFIG } from '@/lib/types';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDButton from '@/components/hud/HUDButton';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenLine, Send, Sparkles, ChevronDown, ChevronUp,
  Trash2, MessageCircle, ArrowRight, Heart, CloudRain, Scale,
} from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';

const MOOD_CONFIG = {
  positive: { icon: Heart, color: '#34d399', bg: 'rgba(52,211,153,0.08)', label: 'Positive' },
  mixed: { icon: Scale, color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', label: 'Mixed' },
  tough: { icon: CloudRain, color: '#f87171', bg: 'rgba(248,113,113,0.08)', label: 'Tough' },
};

function AnalysisCard({ analysis }: { analysis: ReflectionAnalysis }) {
  const moodCfg = MOOD_CONFIG[analysis.mood];
  const MoodIcon = moodCfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col gap-3 mt-3"
    >
      {/* Mood + Themes */}
      <div className="flex items-center gap-2 flex-wrap">
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: moodCfg.bg, color: moodCfg.color }}
        >
          <MoodIcon size={12} />
          {moodCfg.label}
        </div>
        {analysis.themes.map((t) => (
          <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-medium text-text-secondary bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]">
            {t}
          </span>
        ))}
        {analysis.pillarConnection && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ color: PILLAR_CONFIG[analysis.pillarConnection].color, backgroundColor: `${PILLAR_CONFIG[analysis.pillarConnection].color}15` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PILLAR_CONFIG[analysis.pillarConnection].color }} />
            {PILLAR_CONFIG[analysis.pillarConnection].label}
          </span>
        )}
      </div>

      {/* Affirmation */}
      <div className="p-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
        <div className="flex items-center gap-1.5 mb-1.5">
          <MessageCircle size={11} className="text-text-tertiary" />
          <span className="text-[9px] text-text-placeholder uppercase tracking-widest font-semibold">For You</span>
        </div>
        <p className="text-sm text-text-primary leading-relaxed italic">
          &ldquo;{analysis.affirmation}&rdquo;
        </p>
      </div>

      {/* Insight + Action */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="p-2.5 rounded-lg border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.015)]">
          <div className="text-[9px] text-text-placeholder uppercase tracking-widest font-semibold mb-1">Insight</div>
          <p className="text-xs text-text-secondary leading-relaxed">{analysis.insight}</p>
        </div>
        <div className="p-2.5 rounded-lg border border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.015)]">
          <div className="flex items-center gap-1 text-[9px] text-text-placeholder uppercase tracking-widest font-semibold mb-1">
            <ArrowRight size={9} />
            Next Step
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">{analysis.actionSuggestion}</p>
        </div>
      </div>
    </motion.div>
  );
}

function PastEntry({ entry, onDelete }: { entry: JournalEntry; onDelete: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-[rgba(255,255,255,0.04)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer hover:bg-[rgba(255,255,255,0.02)] transition-colors"
      >
        {entry.analysis && (
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: MOOD_CONFIG[entry.analysis.mood].color }} />
        )}
        <span className="text-xs text-text-secondary truncate flex-1">{entry.text}</span>
        <span className="text-[10px] text-text-placeholder tabular-nums flex-shrink-0">
          {isToday(parseISO(entry.date)) ? 'Today' : format(parseISO(entry.date), 'MMM d')}
        </span>
        {open ? <ChevronUp size={10} className="text-text-placeholder" /> : <ChevronDown size={10} className="text-text-placeholder" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-[rgba(255,255,255,0.04)]">
              <p className="text-xs text-text-tertiary leading-relaxed mt-2 mb-2 whitespace-pre-line">{entry.text}</p>
              {entry.analysis && <AnalysisCard analysis={entry.analysis} />}
              <div className="flex justify-end mt-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="text-text-placeholder hover:text-danger text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 size={10} /> Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VentJournal() {
  const quests = useStore((s) => s.quests);
  const journalEntries = useStore((s) => s.journalEntries);
  const addJournalEntry = useStore((s) => s.addJournalEntry);
  const deleteJournalEntry = useStore((s) => s.deleteJournalEntry);
  const addLogEntry = useStore((s) => s.addLogEntry);
  const [text, setText] = useState('');
  const [currentAnalysis, setCurrentAnalysis] = useState<ReflectionAnalysis | null>(null);
  const [showPast, setShowPast] = useState(false);

  const todayEntry = useMemo(() => {
    return journalEntries.find((e) => isToday(parseISO(e.date)));
  }, [journalEntries]);

  const pastEntries = useMemo(() => {
    return journalEntries.filter((e) => !isToday(parseISO(e.date)));
  }, [journalEntries]);

  const handleSubmit = () => {
    if (text.trim().length < 5) return;

    const analysis = analyzeReflection(text.trim(), quests);
    setCurrentAnalysis(analysis);

    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      text: text.trim(),
      date: new Date().toISOString(),
      analysis,
    };

    addJournalEntry(entry);
    addLogEntry('journal', 'Wrote a daily reflection', 15);
    setText('');
  };

  return (
    <HUDPanel delay={1}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PenLine size={13} className="text-accent" />
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Reflect</h2>
        </div>
        {journalEntries.length > 0 && (
          <span className="text-[10px] text-text-placeholder tabular-nums">{journalEntries.length} entries</span>
        )}
      </div>

      {/* Today's entry exists — show it */}
      {todayEntry ? (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles size={11} className="text-text-tertiary" />
            <span className="text-[10px] text-text-placeholder uppercase tracking-widest font-semibold">Today&apos;s Reflection</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed mb-1 whitespace-pre-line">{todayEntry.text}</p>
          {todayEntry.analysis && <AnalysisCard analysis={todayEntry.analysis} />}

          {/* Write another */}
          <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.04)]">
            <div className="relative">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="More on your mind? Keep writing..."
                rows={2}
                className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl px-3 py-2.5 text-sm
                  text-text-primary placeholder:text-text-placeholder resize-none leading-relaxed"
              />
              {text.trim().length >= 5 && (
                <button
                  onClick={handleSubmit}
                  className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-accent/10 text-accent
                    hover:bg-accent/20 transition-colors cursor-pointer"
                >
                  <Send size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* No entry today — prompt to write */
        <div>
          <p className="text-xs text-text-tertiary mb-3 leading-relaxed">
            What was the most important part of your day? Vent, reflect, or just get it off your chest.
          </p>
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Today was... I felt... The biggest thing was..."
              rows={4}
              className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl px-3 py-2.5 text-sm
                text-text-primary placeholder:text-text-placeholder resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-text-placeholder">
                {text.trim().length < 5 ? 'Write at least a few words' : 'Ready to submit'}
              </span>
              <HUDButton size="sm" onClick={handleSubmit} disabled={text.trim().length < 5}>
                <Sparkles size={12} /> Reflect
              </HUDButton>
            </div>
          </div>

          {/* Show inline analysis preview after submission */}
          {currentAnalysis && <AnalysisCard analysis={currentAnalysis} />}
        </div>
      )}

      {/* Past entries */}
      {pastEntries.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.04)]">
          <button
            onClick={() => setShowPast(!showPast)}
            className="flex items-center gap-1.5 text-[11px] text-text-placeholder hover:text-text-secondary transition-colors cursor-pointer w-full"
          >
            {showPast ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            Past reflections ({pastEntries.length})
          </button>
          <AnimatePresence>
            {showPast && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-1.5 mt-2 max-h-[300px] overflow-y-auto">
                  {pastEntries.map((entry) => (
                    <PastEntry
                      key={entry.id}
                      entry={entry}
                      onDelete={() => deleteJournalEntry(entry.id)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </HUDPanel>
  );
}
