'use client';

import { useState, useCallback, useRef } from 'react';
import { useStore } from '@/stores/useStore';
import { organizeIdea, CATEGORY_LABELS, IdeaCategory, StoredIdea } from '@/lib/ideasOrganizer';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDButton from '@/components/hud/HUDButton';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightbulb,
  Mic,
  MicOff,
  Send,
  Trash2,
  ChevronDown,
  ChevronRight,
  Keyboard,
  MessageCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const CATEGORY_COLORS: Record<IdeaCategory, string> = {
  product: '#00ff88',
  feature: '#60a5fa',
  app: '#a78bfa',
  habit: '#34d399',
  business: '#fbbf24',
  creative: '#f472b6',
  tech: '#22d3ee',
  life: '#fb923c',
  other: '#888888',
};

function IdeaCard({
  idea,
  onDelete,
}: {
  idea: StoredIdea;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const color = CATEGORY_COLORS[idea.category];

  return (
    <div className="rounded-xl border border-border bg-[rgba(255,255,255,0.03)] overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors cursor-pointer"
      >
        {expanded ? (
          <ChevronDown size={16} className="text-text-placeholder flex-shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-text-placeholder flex-shrink-0" />
        )}
        <Lightbulb size={14} className="flex-shrink-0" style={{ color }} />
        <span className="text-sm font-medium text-text-primary truncate flex-1">{idea.title}</span>
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {CATEGORY_LABELS[idea.category]}
        </span>
        <span className="text-[10px] text-text-placeholder tabular-nums flex-shrink-0">
          {format(parseISO(idea.created_at), 'MMM d')}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 rounded text-text-placeholder hover:text-danger hover:bg-danger/10 transition-colors flex-shrink-0"
          aria-label="Delete idea"
        >
          <Trash2 size={12} />
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border"
          >
            <div className="px-4 pb-4 pt-2">
              <p className="text-xs text-text-tertiary leading-relaxed whitespace-pre-line mb-3">
                {idea.raw}
              </p>
              {idea.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {idea.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-text-tertiary border border-border"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-1.5 mt-2 text-[10px] text-text-placeholder">
                {idea.source === 'voice' ? (
                  <Mic size={10} />
                ) : (
                  <Keyboard size={10} />
                )}
                {idea.source === 'voice' ? 'Voice' : 'Typed'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function IdeasPage() {
  const ideas = useStore((s) => s.ideas);
  const addIdea = useStore((s) => s.addIdea);
  const deleteIdea = useStore((s) => s.deleteIdea);

  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastInputWasVoiceRef = useRef(false);

  const handleSubmit = useCallback(
    (source: 'typed' | 'voice') => {
      const raw = text.trim();
      if (!raw || isSubmitting) return;

      setIsSubmitting(true);
      const organized = organizeIdea(raw);
      const stored: StoredIdea = {
        ...organized,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        source,
      };
      addIdea(stored);
      setText('');
      lastInputWasVoiceRef.current = false;
      setIsSubmitting(false);
    },
    [text, isSubmitting, addIdea],
  );

  const onVoiceResult = useCallback((transcript: string) => {
    if (!transcript.trim()) return;
    lastInputWasVoiceRef.current = true;
    setText((prev) => {
      if (prev && transcript.toLowerCase().startsWith(prev.trim().toLowerCase())) return transcript;
      return prev ? `${prev} ${transcript}` : transcript;
    });
  }, []);

  const { isListening, supported, toggle } = useSpeechToText(onVoiceResult);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <HUDPanel delay={0}>
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb size={18} className="text-accent" />
          <h1 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Ideas & Inventions
          </h1>
        </div>

        <p className="text-xs text-text-tertiary mb-4 leading-relaxed">
          Type or speak into the box below — both go to the same idea. We&apos;ll organize it with a title,
          category, and tags.
        </p>

        <div className="relative">
          <div
            className={`relative rounded-xl border transition-colors ${
              isListening ? 'border-accent/50 ring-2 ring-accent/20' : 'border-border'
            }`}
          >
            <textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                lastInputWasVoiceRef.current = false;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(lastInputWasVoiceRef.current ? 'voice' : 'typed');
                }
              }}
              placeholder="Type here or tap the mic to speak — same box, same idea..."
              rows={4}
              className="w-full bg-[rgba(255,255,255,0.03)] rounded-xl pl-4 pr-12 py-3 text-sm
                text-text-primary placeholder:text-text-placeholder resize-none leading-relaxed
                focus:outline-none focus:ring-0 border-0"
              disabled={isSubmitting}
              aria-label="Idea input — type or use the microphone to speak"
            />
            {supported && (
              <button
                type="button"
                onClick={toggle}
                className={`absolute right-2 bottom-2 flex items-center justify-center w-9 h-9 rounded-lg transition-all
                  ${isListening
                    ? 'bg-danger/25 text-danger shadow-[0_0_12px_rgba(248,113,113,0.3)]'
                    : 'bg-[rgba(255,255,255,0.06)] text-text-tertiary hover:text-accent hover:bg-accent/10'
                  }`}
                title={isListening ? 'Stop listening' : 'Speak into this box — words appear as text'}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-text-placeholder">
              {isListening ? 'Speaking… — tap mic to stop' : text.trim().length > 0 ? 'Enter to save' : 'Type or tap mic'}
            </span>
            <HUDButton
              size="sm"
              onClick={() => handleSubmit(lastInputWasVoiceRef.current ? 'voice' : 'typed')}
              disabled={!text.trim() || isSubmitting}
            >
              <Send size={12} /> Save
            </HUDButton>
          </div>
        </div>

        {isListening && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-accent">
            <MessageCircle size={10} />
            Your speech is added to the same box. Mix typing and voice, then Save when done.
          </div>
        )}
      </HUDPanel>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
            Saved ideas
          </h2>
          {ideas.length > 0 && (
            <span className="text-[10px] text-text-placeholder tabular-nums">{ideas.length} total</span>
          )}
        </div>

        {ideas.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-border bg-[rgba(255,255,255,0.02)]">
            <Lightbulb size={32} className="text-text-placeholder mx-auto mb-2 opacity-60" />
            <p className="text-sm text-text-tertiary">No ideas yet</p>
            <p className="text-xs text-text-placeholder mt-0.5">
              Type or speak an idea above and we&apos;ll organize and store it.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {ideas.map((idea) => (
                <motion.div
                  key={idea.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <IdeaCard idea={idea} onDelete={() => deleteIdea(idea.id)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
