'use client';

import { useState } from 'react';
import { useStore } from '@/stores/useStore';
import { Pillar, Difficulty, PILLAR_CONFIG, DIFFICULTY_CONFIG } from '@/lib/types';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDButton from '@/components/hud/HUDButton';
import { getLevelFromXP } from '@/lib/xp';
import { Download, RotateCcw, Check } from 'lucide-react';

interface QuestTemplate {
  title: string;
  pillar: Pillar;
  difficulty: Difficulty;
  xp: number;
}

const TEMPLATES: QuestTemplate[] = [
  { title: 'Morning Workout', pillar: 'body', difficulty: 'MED', xp: 100 },
  { title: 'Read 30 Minutes', pillar: 'mind', difficulty: 'MED', xp: 100 },
  { title: 'Drink 8 Glasses of Water', pillar: 'body', difficulty: 'EASY', xp: 50 },
  { title: 'Journal Entry', pillar: 'spirit', difficulty: 'EASY', xp: 50 },
  { title: 'Deep Work Block (2h)', pillar: 'work', difficulty: 'HARD', xp: 150 },
  { title: 'Budget Review', pillar: 'wealth', difficulty: 'MED', xp: 100 },
  { title: 'Gratitude Practice', pillar: 'spirit', difficulty: 'EASY', xp: 50 },
  { title: 'Connect with Someone', pillar: 'social', difficulty: 'EASY', xp: 50 },
];

export default function SettingsPage() {
  const user = useStore((s) => s.user);
  const quests = useStore((s) => s.quests);
  const setUser = useStore((s) => s.setUser);
  const addQuest = useStore((s) => s.addQuest);
  const [name, setName] = useState(user?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saved, setSaved] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const level = user ? getLevelFromXP(user.total_xp) : 1;
  const existingTitles = new Set(quests.map((q) => q.title));

  const handleSave = () => {
    if (user) {
      setUser({ ...user, display_name: name, email });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleAddTemplate = (t: QuestTemplate) => {
    if (existingTitles.has(t.title) || added.has(t.title)) return;
    addQuest({ title: t.title, description: null, pillar: t.pillar, difficulty: t.difficulty, xp_reward: t.xp, quest_type: 'daily', is_recurring: true, recurrence_rule: 'daily', due_date: null });
    setAdded(new Set([...added, t.title]));
  };

  const handleExport = () => {
    const data = { user, quests, pillars: useStore.getState().pillars, goals: useStore.getState().goals };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `lifeos-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <HUDPanel delay={0}>
        <h2 className="text-base font-semibold text-text-primary mb-4">Profile</h2>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-accent-light text-accent flex items-center justify-center text-xl font-bold">
            {name.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <div className="text-sm font-medium text-text-primary">{name || 'Unnamed'}</div>
            <div className="text-xs text-text-tertiary">Level {level} · {user?.character_class || 'Recruit'} · {user?.total_xp || 0} XP</div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <HUDButton size="sm" onClick={handleSave}>Save</HUDButton>
          {saved && <span className="text-xs font-medium text-success">Saved!</span>}
        </div>
      </HUDPanel>

      <HUDPanel delay={1}>
        <h2 className="text-base font-semibold text-text-primary mb-1">Quick-Add Templates</h2>
        <p className="text-xs text-text-tertiary mb-4">Pre-built daily tasks you can add in one click.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TEMPLATES.map((t) => {
            const isAdded = existingTitles.has(t.title) || added.has(t.title);
            return (
              <div key={t.title} className={`flex items-center justify-between p-3 rounded-lg border transition-all ${isAdded ? 'border-success/30 bg-success-light' : 'border-border hover:border-border-hover'}`}>
                <div className="min-w-0 mr-2">
                  <div className="text-sm text-text-primary">{t.title}</div>
                  <div className="text-xs text-text-tertiary">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PILLAR_CONFIG[t.pillar].color }} />
                      {PILLAR_CONFIG[t.pillar].label}
                    </span>
                    {' · '}{DIFFICULTY_CONFIG[t.difficulty].label}{' · +' }{t.xp} XP
                  </div>
                </div>
                {isAdded ? (
                  <span className="text-xs font-medium text-success flex items-center gap-1"><Check size={12} /> Added</span>
                ) : (
                  <HUDButton size="sm" variant="secondary" onClick={() => handleAddTemplate(t)}>Add</HUDButton>
                )}
              </div>
            );
          })}
        </div>
      </HUDPanel>

      <HUDPanel delay={2}>
        <h2 className="text-base font-semibold text-text-primary mb-3">Data</h2>
        <div className="flex gap-2">
          <HUDButton variant="secondary" size="sm" onClick={handleExport}>
            <Download size={14} /> Export
          </HUDButton>
          <HUDButton variant="danger" size="sm" onClick={() => { if (confirm('Reset all progress?')) window.location.reload(); }}>
            <RotateCcw size={14} /> Reset
          </HUDButton>
        </div>
      </HUDPanel>
    </div>
  );
}
