'use client';

import { useState } from 'react';
import { useStore } from '@/stores/useStore';
import { Pillar, Difficulty, PILLAR_CONFIG, DIFFICULTY_CONFIG } from '@/lib/types';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDLabel from '@/components/hud/HUDLabel';
import HUDButton from '@/components/hud/HUDButton';
import { getLevelFromXP } from '@/lib/xp';
import { Download, RotateCcw, Check, Shield, Palette, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuestTemplate {
  title: string;
  pillar: Pillar;
  difficulty: Difficulty;
  xp: number;
  description: string;
}

const QUEST_TEMPLATES: QuestTemplate[] = [
  { title: 'Morning Workout', pillar: 'body', difficulty: 'MED', xp: 100, description: '30+ minutes of exercise' },
  { title: 'Read 30 Minutes', pillar: 'mind', difficulty: 'MED', xp: 100, description: 'Read a non-fiction book' },
  { title: 'Drink 8 Glasses of Water', pillar: 'body', difficulty: 'EASY', xp: 50, description: 'Stay hydrated throughout the day' },
  { title: 'Journal Entry', pillar: 'spirit', difficulty: 'EASY', xp: 50, description: 'Reflect on your day' },
  { title: 'Deep Work Block (2h)', pillar: 'work', difficulty: 'HARD', xp: 150, description: 'Focused, distraction-free work' },
  { title: 'Budget Review', pillar: 'wealth', difficulty: 'MED', xp: 100, description: 'Review expenses and budget' },
  { title: 'Gratitude Practice', pillar: 'spirit', difficulty: 'EASY', xp: 50, description: 'Write 3 things you are grateful for' },
  { title: 'Connect with Friend/Family', pillar: 'social', difficulty: 'EASY', xp: 50, description: 'Reach out to someone you care about' },
  { title: 'Learn Something New', pillar: 'mind', difficulty: 'MED', xp: 100, description: 'Watch a lecture, take a course lesson' },
  { title: 'Meal Prep', pillar: 'body', difficulty: 'MED', xp: 100, description: 'Prepare healthy meals for the week' },
  { title: 'Invest/Save Review', pillar: 'wealth', difficulty: 'HARD', xp: 150, description: 'Review portfolio or savings progress' },
  { title: 'Networking Event', pillar: 'social', difficulty: 'HARD', xp: 150, description: 'Attend or host a professional event' },
];

export default function SettingsPage() {
  const user = useStore((s) => s.user);
  const quests = useStore((s) => s.quests);
  const setUser = useStore((s) => s.setUser);
  const addQuest = useStore((s) => s.addQuest);
  const addLogEntry = useStore((s) => s.addLogEntry);
  const [name, setName] = useState(user?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saved, setSaved] = useState(false);
  const [addedTemplates, setAddedTemplates] = useState<Set<string>>(new Set());

  const level = user ? getLevelFromXP(user.total_xp) : 1;

  const handleSave = () => {
    if (user) {
      setUser({ ...user, display_name: name, email });
      addLogEntry('system', `SYSTEM — Operator profile updated. Name: ${name}`, 0);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleAddTemplate = (template: QuestTemplate) => {
    const alreadyExists = quests.some(
      (q) => q.title === template.title && q.quest_type === 'daily',
    );
    if (alreadyExists) return;

    addQuest({
      title: template.title,
      description: template.description,
      pillar: template.pillar,
      difficulty: template.difficulty,
      xp_reward: template.xp,
      quest_type: 'daily',
      is_recurring: true,
      recurrence_rule: 'daily',
      due_date: null,
    });
    addLogEntry('system', `SYSTEM — Quest template added: "${template.title}"`, 0);
    setAddedTemplates(new Set([...addedTemplates, template.title]));
  };

  const handleExport = () => {
    const data = {
      user,
      quests,
      pillars: useStore.getState().pillars,
      goals: useStore.getState().goals,
      xpHistory: useStore.getState().xpHistory,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jarvis-lifeos-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addLogEntry('system', 'SYSTEM — Data exported successfully.', 0);
  };

  const handleReset = () => {
    if (confirm('Reset all progress? This cannot be undone.')) {
      window.location.reload();
    }
  };

  const existingTitles = new Set(quests.filter((q) => q.quest_type === 'daily').map((q) => q.title));

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <HUDPanel delay={0}>
        <HUDLabel text="Profile Configuration" />
        <div className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-16 h-16 border-2 border-hud-green/30 bg-hud-green/10 flex items-center justify-center flex-shrink-0"
              style={{ boxShadow: '0 0 15px rgba(0,255,136,0.1)' }}
            >
              <span className="font-[family-name:var(--font-orbitron)] text-xl text-hud-green">
                {name.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1">
              <div className="text-sm text-hud-text font-medium">{name || 'Unknown Operator'}</div>
              <div className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] text-hud-green uppercase">
                {user?.character_class || 'RECRUIT'} // LEVEL {level}
              </div>
              <div className="text-[10px] text-hud-text-dim mt-0.5">
                {user?.total_xp?.toLocaleString() || 0} total XP • {user?.current_streak || 0} day streak
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-muted block mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-hud-border px-3 py-2 text-sm text-hud-text focus:outline-none focus:border-hud-green/40"
              />
            </div>
            <div>
              <label className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-muted block mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-hud-border px-3 py-2 text-sm text-hud-text focus:outline-none focus:border-hud-green/40"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <HUDButton onClick={handleSave}>
              Save Changes
            </HUDButton>
            {saved && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[11px] font-[family-name:var(--font-orbitron)] text-hud-green tracking-[2px] glow-text"
              >
                ✓ PROFILE UPDATED
              </motion.span>
            )}
          </div>
        </div>
      </HUDPanel>

      <HUDPanel delay={1}>
        <HUDLabel text="Quest Templates" />
        <p className="text-sm text-hud-text-muted mb-3">
          Pre-built recurring quests. Click to add them to your daily rotation.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {QUEST_TEMPLATES.map((template) => {
            const isAdded = existingTitles.has(template.title) || addedTemplates.has(template.title);
            const config = PILLAR_CONFIG[template.pillar];

            return (
              <div
                key={template.title}
                className={`flex items-center justify-between p-3 border transition-all ${
                  isAdded ? 'border-hud-green/20 bg-hud-green/5' : 'border-hud-border bg-hud-panel hover:border-hud-border-bright'
                }`}
              >
                <div className="min-w-0 flex-1 mr-2">
                  <div className="text-sm text-hud-text flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
                    {template.title}
                  </div>
                  <div className="text-[10px] text-hud-text-dim truncate">
                    {config.label} • {DIFFICULTY_CONFIG[template.difficulty].label} • +{template.xp} XP
                  </div>
                </div>
                {isAdded ? (
                  <span className="text-[9px] font-[family-name:var(--font-orbitron)] text-hud-green tracking-[2px] flex items-center gap-1 flex-shrink-0">
                    <Check size={10} /> Added
                  </span>
                ) : (
                  <HUDButton size="sm" variant="secondary" onClick={() => handleAddTemplate(template)}>
                    Add
                  </HUDButton>
                )}
              </div>
            );
          })}
        </div>
      </HUDPanel>

      <HUDPanel delay={2}>
        <HUDLabel text="Data Management" />
        <div className="flex flex-wrap gap-3">
          <HUDButton variant="secondary" onClick={handleExport}>
            <Download size={12} className="inline mr-1" /> Export Data
          </HUDButton>
          <HUDButton variant="danger" onClick={handleReset}>
            <RotateCcw size={12} className="inline mr-1" /> Reset Progress
          </HUDButton>
        </div>
        <p className="text-[10px] text-hud-text-dim mt-2">
          Export downloads all your data as JSON. Reset clears everything and reloads demo data.
        </p>
      </HUDPanel>
    </div>
  );
}
