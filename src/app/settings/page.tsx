'use client';

import { useState, useRef } from 'react';
import { useStore } from '@/stores/useStore';
import { Pillar, PILLAR_CONFIG } from '@/lib/types';
import { estimateXP } from '@/lib/xpAI';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDButton from '@/components/hud/HUDButton';
import DifficultyBadge from '@/components/hud/DifficultyBadge';
import { getLevelFromXP } from '@/lib/xp';
import { Download, RotateCcw, Check, Image, X, Upload, Link, Calendar, ExternalLink, FileText, Trash2, AlertCircle } from 'lucide-react';
import { parseICalFile, getCalendarName } from '@/lib/icalParser';

interface QuestTemplate {
  title: string;
  pillar: Pillar;
}

const TEMPLATES: QuestTemplate[] = [
  { title: 'Morning Workout', pillar: 'body' },
  { title: 'Read 30 Minutes', pillar: 'mind' },
  { title: 'Drink 8 Glasses of Water', pillar: 'body' },
  { title: 'Journal Entry', pillar: 'spirit' },
  { title: 'Deep Work Block (2h)', pillar: 'work' },
  { title: 'Budget Review', pillar: 'wealth' },
  { title: 'Gratitude Practice', pillar: 'spirit' },
  { title: 'Connect with Someone', pillar: 'social' },
];

const PRESET_BACKGROUNDS = [
  { label: 'Mountains', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80' },
  { label: 'Ocean', url: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=1920&q=80' },
  { label: 'Forest', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80' },
  { label: 'Night Sky', url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80' },
  { label: 'City', url: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1920&q=80' },
  { label: 'Abstract', url: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1920&q=80' },
];

export default function SettingsPage() {
  const user = useStore((s) => s.user);
  const quests = useStore((s) => s.quests);
  const setUser = useStore((s) => s.setUser);
  const addQuest = useStore((s) => s.addQuest);
  const backgroundImage = useStore((s) => s.backgroundImage);
  const setBackgroundImage = useStore((s) => s.setBackgroundImage);
  const gcalApiKey = useStore((s) => s.gcalApiKey);
  const gcalCalendarId = useStore((s) => s.gcalCalendarId);
  const setGcalConfig = useStore((s) => s.setGcalConfig);
  const [name, setName] = useState(user?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saved, setSaved] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [customUrl, setCustomUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [gcalKey, setGcalKey] = useState(gcalApiKey || '');
  const [gcalId, setGcalId] = useState(gcalCalendarId || '');
  const [gcalSaved, setGcalSaved] = useState(false);
  const [gcalTesting, setGcalTesting] = useState(false);
  const [gcalTestResult, setGcalTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const icalEvents = useStore((s) => s.icalEvents);
  const icalSourceName = useStore((s) => s.icalSourceName);
  const setIcalEvents = useStore((s) => s.setIcalEvents);
  const clearIcalEvents = useStore((s) => s.clearIcalEvents);
  const [icalError, setIcalError] = useState<string | null>(null);
  const [icalSuccess, setIcalSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const icalFileRef = useRef<HTMLInputElement>(null);

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
    const est = estimateXP(t.title, null, t.pillar, 'daily');
    addQuest({ title: t.title, description: null, pillar: t.pillar, difficulty: est.difficulty, xp_reward: est.xp, quest_type: 'daily', is_recurring: true, recurrence_rule: 'daily', due_date: null });
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setBackgroundImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleCustomUrl = () => {
    if (customUrl.trim()) {
      setBackgroundImage(customUrl.trim());
      setCustomUrl('');
      setShowUrlInput(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <HUDPanel delay={0}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-4">Profile</h2>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-accent-dim text-accent flex items-center justify-center text-xl font-bold">
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
              className="w-full border border-border rounded-xl px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <HUDButton size="sm" onClick={handleSave}>Save</HUDButton>
          {saved && <span className="text-xs font-medium text-success">Saved!</span>}
        </div>
      </HUDPanel>

      <HUDPanel delay={1}>
        <div className="flex items-center gap-2 mb-1">
          <Image size={13} className="text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Background</h2>
        </div>
        <p className="text-xs text-text-tertiary mb-4">Choose a background image for your workspace.</p>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
          {PRESET_BACKGROUNDS.map((bg) => (
            <button
              key={bg.label}
              onClick={() => setBackgroundImage(bg.url)}
              className={`group relative aspect-[3/2] rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                backgroundImage === bg.url
                  ? 'border-accent shadow-[0_0_12px_rgba(200,200,200,0.2)]'
                  : 'border-transparent hover:border-[rgba(255,255,255,0.12)]'
              }`}
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform group-hover:scale-110"
                style={{ backgroundImage: `url(${bg.url})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-1 left-1.5 text-[9px] font-medium text-white/80">{bg.label}</span>
              {backgroundImage === bg.url && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                  <Check size={10} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <HUDButton size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={13} /> Upload
          </HUDButton>

          {showUrlInput ? (
            <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Paste image URL..."
                className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-1.5 text-xs text-text-primary placeholder:text-text-placeholder"
                onKeyDown={(e) => e.key === 'Enter' && handleCustomUrl()}
                autoFocus
              />
              <HUDButton size="sm" onClick={handleCustomUrl}>Set</HUDButton>
              <button onClick={() => setShowUrlInput(false)} className="text-text-placeholder hover:text-text-secondary cursor-pointer">
                <X size={14} />
              </button>
            </div>
          ) : (
            <HUDButton size="sm" variant="secondary" onClick={() => setShowUrlInput(true)}>
              <Link size={13} /> URL
            </HUDButton>
          )}

          {backgroundImage && (
            <HUDButton size="sm" variant="danger" onClick={() => setBackgroundImage(null)}>
              <X size={13} /> Remove
            </HUDButton>
          )}
        </div>

        {backgroundImage && (
          <div className="mt-3 p-2 rounded-lg border border-border bg-[rgba(255,255,255,0.02)]">
            <div className="flex items-center gap-2">
              <div
                className="w-16 h-10 rounded bg-cover bg-center flex-shrink-0"
                style={{ backgroundImage: `url(${backgroundImage})` }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-text-secondary">Current background</div>
                <div className="text-[10px] text-text-placeholder truncate">{backgroundImage.startsWith('data:') ? 'Uploaded image' : backgroundImage}</div>
              </div>
            </div>
          </div>
        )}
      </HUDPanel>

      <HUDPanel delay={2}>
        <div className="flex items-center gap-2 mb-1">
          <Calendar size={13} className="text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Google Calendar</h2>
        </div>
        <p className="text-xs text-text-tertiary mb-4">
          Connect your Google Calendar to see upcoming events on your dashboard.
        </p>

        <div className="rounded-xl border border-border bg-[rgba(0,0,0,0.4)] p-4 mb-4">
          <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-3">Setup Steps</div>
          <ol className="text-xs text-text-tertiary space-y-2">
            <li className="flex gap-2">
              <span className="text-accent font-bold">1.</span>
              <span>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-0.5">Google Cloud Console <ExternalLink size={9} /></a> and create a project</span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold">2.</span>
              <span>Enable the <strong className="text-text-secondary">Google Calendar API</strong> for your project</span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold">3.</span>
              <span>Go to Credentials and create an <strong className="text-text-secondary">API Key</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold">4.</span>
              <span>In Google Calendar Settings, set your calendar to <strong className="text-text-secondary">public</strong> (or &ldquo;See all event details&rdquo;)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold">5.</span>
              <span>Your Calendar ID is usually your <strong className="text-text-secondary">Gmail address</strong> (e.g. you@gmail.com)</span>
            </li>
          </ol>
        </div>

        <div className="flex flex-col gap-3 mb-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">API Key</label>
            <input
              type="password"
              value={gcalKey}
              onChange={(e) => { setGcalKey(e.target.value); setGcalTestResult(null); }}
              placeholder="AIza..."
              className="w-full border border-border rounded-xl px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Calendar ID</label>
            <input
              type="text"
              value={gcalId}
              onChange={(e) => { setGcalId(e.target.value); setGcalTestResult(null); }}
              placeholder="your.email@gmail.com"
              className="w-full border border-border rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <HUDButton size="sm" onClick={() => {
            setGcalConfig(gcalKey.trim() || null, gcalId.trim() || null);
            setGcalSaved(true);
            setTimeout(() => setGcalSaved(false), 2000);
          }}>
            Save
          </HUDButton>
          <HUDButton size="sm" variant="secondary" onClick={async () => {
            if (!gcalKey.trim() || !gcalId.trim()) {
              setGcalTestResult({ ok: false, msg: 'Enter both API key and Calendar ID' });
              return;
            }
            setGcalTesting(true);
            setGcalTestResult(null);
            try {
              const now = new Date().toISOString();
              const encodedId = encodeURIComponent(gcalId.trim());
              const res = await fetch(
                `https://www.googleapis.com/calendar/v3/calendars/${encodedId}/events?key=${gcalKey.trim()}&timeMin=${now}&maxResults=1`
              );
              if (res.ok) {
                const data = await res.json();
                setGcalTestResult({ ok: true, msg: `Connected! Found ${data.items?.length || 0} event(s).` });
              } else {
                const data = await res.json().catch(() => null);
                setGcalTestResult({ ok: false, msg: data?.error?.message || `Error ${res.status}` });
              }
            } catch {
              setGcalTestResult({ ok: false, msg: 'Network error — check your connection' });
            } finally {
              setGcalTesting(false);
            }
          }}>
            {gcalTesting ? 'Testing...' : 'Test Connection'}
          </HUDButton>
          {(gcalApiKey || gcalCalendarId) && (
            <HUDButton size="sm" variant="danger" onClick={() => {
              setGcalConfig(null, null);
              setGcalKey('');
              setGcalId('');
              setGcalTestResult(null);
            }}>
              Disconnect
            </HUDButton>
          )}
          {gcalSaved && <span className="text-xs font-medium text-success">Saved!</span>}
        </div>

        {gcalTestResult && (
          <div className={`mt-3 p-2.5 rounded-lg border text-xs ${
            gcalTestResult.ok
              ? 'border-success/20 bg-success-dim text-success'
              : 'border-danger/20 bg-danger-dim text-danger'
          }`}>
            {gcalTestResult.msg}
          </div>
        )}
      </HUDPanel>

      <HUDPanel delay={3}>
        <div className="flex items-center gap-2 mb-1">
          <FileText size={13} className="text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Import Calendar (.ics)</h2>
        </div>
        <p className="text-xs text-text-tertiary mb-4">
          Import an iCal (.ics) file exported from Apple Calendar, Google Calendar, Outlook, or any calendar app.
        </p>

        <div className="rounded-xl border border-border bg-[rgba(0,0,0,0.4)] p-4 mb-4">
          <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-3">How to export your calendar</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-text-tertiary">
            <div>
              <div className="font-medium text-text-secondary mb-1">Apple Calendar</div>
              <p>File → Export → Export… to save as .ics</p>
            </div>
            <div>
              <div className="font-medium text-text-secondary mb-1">Google Calendar</div>
              <p>Settings → Import & Export → Export to download .ics</p>
            </div>
            <div>
              <div className="font-medium text-text-secondary mb-1">Outlook</div>
              <p>File → Save Calendar → Save as .ics file</p>
            </div>
            <div>
              <div className="font-medium text-text-secondary mb-1">Other apps</div>
              <p>Look for &ldquo;Export&rdquo; or &ldquo;Download .ics&rdquo; in settings</p>
            </div>
          </div>
        </div>

        <input
          ref={icalFileRef}
          type="file"
          accept=".ics,.ical,text/calendar"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setIcalError(null);
            setIcalSuccess(null);
            const reader = new FileReader();
            reader.onload = (ev) => {
              try {
                const content = ev.target?.result as string;
                const parsed = parseICalFile(content);
                if (parsed.length === 0) {
                  setIcalError('No events found in this file. Make sure it contains VEVENT entries.');
                  return;
                }
                const calName = getCalendarName(content) || file.name.replace(/\.ics$/i, '');
                setIcalEvents(parsed, calName);
                setIcalSuccess(`Imported ${parsed.length} events from "${calName}"`);
                setTimeout(() => setIcalSuccess(null), 4000);
              } catch {
                setIcalError('Failed to parse the .ics file. Make sure it\'s a valid iCal file.');
              }
            };
            reader.onerror = () => setIcalError('Failed to read the file.');
            reader.readAsText(file);
            e.target.value = '';
          }}
          className="hidden"
        />

        <div className="flex items-center gap-2 flex-wrap">
          <HUDButton size="sm" onClick={() => icalFileRef.current?.click()}>
            <Upload size={13} /> {icalEvents.length > 0 ? 'Replace Import' : 'Import .ics File'}
          </HUDButton>
          {icalEvents.length > 0 && (
            <HUDButton size="sm" variant="danger" onClick={() => { clearIcalEvents(); setIcalSuccess(null); setIcalError(null); }}>
              <Trash2 size={13} /> Remove
            </HUDButton>
          )}
        </div>

        {icalError && (
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg border border-danger/20 bg-danger-dim text-xs text-danger">
            <AlertCircle size={13} className="flex-shrink-0" />
            {icalError}
            <button onClick={() => setIcalError(null)} className="ml-auto text-danger/50 hover:text-danger cursor-pointer"><X size={10} /></button>
          </div>
        )}

        {icalSuccess && (
          <div className="mt-3 p-2.5 rounded-lg border border-success/20 bg-success-dim text-xs text-success flex items-center gap-2">
            <Check size={13} className="flex-shrink-0" />
            {icalSuccess}
          </div>
        )}

        {icalEvents.length > 0 && (
          <div className="mt-3 p-3 rounded-xl border border-border bg-[rgba(255,255,255,0.02)]">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={12} className="text-warning" />
              <span className="text-xs font-medium text-text-secondary">{icalSourceName || 'Imported calendar'}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-lg font-bold text-text-primary tabular-nums">{icalEvents.length}</div>
                <div className="text-[9px] text-text-placeholder uppercase">Total Events</div>
              </div>
              <div>
                <div className="text-lg font-bold text-text-primary tabular-nums">
                  {icalEvents.filter((e) => e.allDay).length}
                </div>
                <div className="text-[9px] text-text-placeholder uppercase">All-Day</div>
              </div>
              <div>
                <div className="text-lg font-bold text-text-primary tabular-nums">
                  {icalEvents.filter((e) => e.location).length}
                </div>
                <div className="text-[9px] text-text-placeholder uppercase">With Location</div>
              </div>
            </div>
          </div>
        )}
      </HUDPanel>

      <HUDPanel delay={5}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-1">Quick-Add Templates</h2>
        <p className="text-xs text-text-tertiary mb-4">Pre-built daily tasks you can add in one click.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TEMPLATES.map((t) => {
            const isAdded = existingTitles.has(t.title) || added.has(t.title);
            const est = estimateXP(t.title, null, t.pillar, 'daily');
            return (
              <div key={t.title} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isAdded ? 'border-success/30 bg-success-dim' : 'border-border hover:border-border-hover'}`}>
                <div className="min-w-0 mr-2">
                  <div className="text-sm text-text-primary">{t.title}</div>
                  <div className="text-xs text-text-tertiary flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PILLAR_CONFIG[t.pillar].color }} />
                      {PILLAR_CONFIG[t.pillar].label}
                    </span>
                    <span>·</span>
                    <DifficultyBadge difficulty={est.difficulty} />
                    <span>+{est.xp} XP</span>
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

      <HUDPanel delay={6}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">Data</h2>
        <div className="flex gap-2">
          <HUDButton variant="secondary" size="sm" onClick={handleExport}>
            <Download size={14} /> Export
          </HUDButton>
          <HUDButton variant="danger" size="sm" onClick={() => { if (confirm('Reset all progress? This cannot be undone.')) { localStorage.removeItem('life-os-storage'); window.location.reload(); } }}>
            <RotateCcw size={14} /> Reset
          </HUDButton>
        </div>
      </HUDPanel>
    </div>
  );
}
