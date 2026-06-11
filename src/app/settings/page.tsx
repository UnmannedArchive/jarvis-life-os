'use client';

import { useState, useRef } from 'react';
import { useStore } from '@/stores/useStore';
import { Pillar, PILLAR_CONFIG } from '@/lib/types';
import { estimateXP } from '@/lib/xpAI';
import HUDPanel from '@/components/hud/HUDPanel';
import HUDButton from '@/components/hud/HUDButton';
import DifficultyBadge from '@/components/hud/DifficultyBadge';
import { getLevelFromXP } from '@/lib/xp';
import { Download, RotateCcw, Check, Image, X, Upload, Link as LinkIcon, Calendar, ExternalLink, FileText, Trash2, AlertCircle, Activity } from 'lucide-react';
import { parseICalFile, getCalendarName } from '@/lib/icalParser';
import RecurringTasksManager from '@/components/dashboard/RecurringTasksManager';
import { saveUser } from '@/lib/supabaseSync';

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
  const gcalIcsUrl = useStore((s) => s.gcalIcsUrl);
  const setGcalIcsUrl = useStore((s) => s.setGcalIcsUrl);
  const setIcsCache = useStore((s) => s.setIcsCache);
  const workflowEnabled = useStore((s) => s.workflowEnabled);
  const setWorkflowEnabled = useStore((s) => s.setWorkflowEnabled);
  const [name, setName] = useState(user?.display_name || '');
  const [saved, setSaved] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [customUrl, setCustomUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [gcalKey, setGcalKey] = useState(gcalApiKey || '');
  const [gcalId, setGcalId] = useState(gcalCalendarId || '');
  const [gcalSaved, setGcalSaved] = useState(false);
  const [gcalTesting, setGcalTesting] = useState(false);
  const [gcalTestResult, setGcalTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [icsUrlInput, setIcsUrlInput] = useState(gcalIcsUrl || '');
  const [icsSaved, setIcsSaved] = useState(false);
  const [icsTesting, setIcsTesting] = useState(false);
  const [icsTestResult, setIcsTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showGcalAdvanced, setShowGcalAdvanced] = useState(false);
  const icalEvents = useStore((s) => s.icalEvents);
  const icalSourceName = useStore((s) => s.icalSourceName);
  const setIcalEvents = useStore((s) => s.setIcalEvents);
  const clearIcalEvents = useStore((s) => s.clearIcalEvents);
  const [icalError, setIcalError] = useState<string | null>(null);
  const [icalSuccess, setIcalSuccess] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const icalFileRef = useRef<HTMLInputElement>(null);

  const level = user ? getLevelFromXP(user.total_xp) : 1;
  const existingTitles = new Set(quests.map((q) => q.title));

  const handleSave = () => {
    if (user) {
      const updated = { ...user, display_name: name };
      setUser(updated);
      saveUser(updated).catch(() => {});
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
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4 settings-sections">
      {user?.id === 'guest' && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 mb-2">
          <p className="text-sm font-medium text-amber-200">Using the app without an account.</p>
          <p className="text-xs text-text-tertiary mt-1">Your progress is saved only on this device. Sign in or create an account to sync across devices.</p>
        </div>
      )}
      <HUDPanel delay={0}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-4">Profile</h2>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-accent-dim text-accent flex items-center justify-center text-xl font-bold">
            {name.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <div className="text-sm font-medium text-text-primary">{name || 'Unnamed'}</div>
            <div className="text-xs text-text-tertiary">Level {level} · {user?.total_xp || 0} XP</div>
          </div>
        </div>
        <div className="mb-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm max-w-xs" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <HUDButton size="sm" onClick={handleSave}>Save</HUDButton>
          {saved && <span className="text-xs font-medium text-success">Saved!</span>}
        </div>
      </HUDPanel>

      <HUDPanel delay={1}>
        <div className="flex items-center gap-2 mb-1">
          <Activity size={13} className="text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Workflow</h2>
        </div>
        <p className="text-xs text-text-tertiary mb-4">Track which apps you use and see your most-productive hours. Requires the local collector (see <code>monitor/README.md</code>).</p>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-text-primary">Workflow tracking</div>
            <div className="text-xs text-text-tertiary">Show the Workflow tab and read local monitor data.</div>
          </div>
          <button
            onClick={() => setWorkflowEnabled(!workflowEnabled)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${workflowEnabled ? 'bg-accent-dim text-accent' : 'bg-[rgba(255,255,255,0.05)] text-text-tertiary'}`}
          >
            {workflowEnabled ? 'On' : 'Off'}
          </button>
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
              <LinkIcon size={13} /> URL
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
          Link your Google Calendar (read-only) to see your events on the Calendar page and dashboard.
        </p>

        <div className="rounded-xl border border-border bg-[rgba(0,0,0,0.4)] p-4 mb-4">
          <div className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider mb-3">How to get your secret address</div>
          <ol className="text-xs text-text-tertiary space-y-2">
            <li className="flex gap-2">
              <span className="text-accent font-bold">1.</span>
              <span>Open <a href="https://calendar.google.com/calendar/r/settings" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-0.5">Google Calendar settings <ExternalLink size={9} /></a> and pick your calendar under &ldquo;Settings for my calendars&rdquo;</span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold">2.</span>
              <span>Scroll to <strong className="text-text-secondary">Integrate calendar</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold">3.</span>
              <span>Copy the <strong className="text-text-secondary">Secret address in iCal format</strong> (ends in .ics) and paste it below — no API keys, your calendar stays private</span>
            </li>
          </ol>
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-text-secondary block mb-1.5">Secret iCal address</label>
          <input
            type="password"
            value={icsUrlInput}
            onChange={(e) => { setIcsUrlInput(e.target.value); setIcsTestResult(null); }}
            placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
            className="w-full border border-border rounded-xl px-3 py-2 text-sm font-mono"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-1">
          <HUDButton size="sm" onClick={() => {
            const trimmed = icsUrlInput.trim();
            setGcalIcsUrl(trimmed || null);
            setIcsSaved(true);
            setTimeout(() => setIcsSaved(false), 2000);
          }}>
            Save
          </HUDButton>
          <HUDButton size="sm" variant="secondary" onClick={async () => {
            const url = icsUrlInput.trim();
            if (!url) {
              setIcsTestResult({ ok: false, msg: 'Paste your secret iCal address first' });
              return;
            }
            setIcsTesting(true);
            setIcsTestResult(null);
            try {
              const res = await fetch('/api/calendar/ics', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
              });
              const data = await res.json();
              if (!res.ok) {
                setIcsTestResult({ ok: false, msg: data.error || `Error ${res.status}` });
              } else {
                const events = parseICalFile(data.ics);
                setIcsTestResult({ ok: true, msg: `Connected! Found ${events.length} event(s) in the feed.` });
              }
            } catch {
              setIcsTestResult({ ok: false, msg: 'Network error — check your connection' });
            } finally {
              setIcsTesting(false);
            }
          }}>
            {icsTesting ? 'Testing...' : 'Test Connection'}
          </HUDButton>
          {gcalIcsUrl && (
            <HUDButton size="sm" variant="danger" onClick={() => {
              setGcalIcsUrl(null);
              setIcsCache(null);
              setIcsUrlInput('');
              setIcsTestResult(null);
            }}>
              Disconnect
            </HUDButton>
          )}
          {icsSaved && <span className="text-xs font-medium text-success">Saved!</span>}
        </div>

        {icsTestResult && (
          <div className={`mt-3 p-2.5 rounded-lg border text-xs ${
            icsTestResult.ok
              ? 'border-success/20 bg-success-dim text-success'
              : 'border-danger/20 bg-danger-dim text-danger'
          }`}>
            {icsTestResult.msg}
          </div>
        )}

        <button
          onClick={() => setShowGcalAdvanced(!showGcalAdvanced)}
          className="mt-4 text-[11px] text-text-placeholder hover:text-text-secondary transition-colors"
        >
          {showGcalAdvanced ? '▾' : '▸'} Advanced: API key (public calendars only)
        </button>

        {showGcalAdvanced && (<>
        <div className="rounded-xl border border-border bg-[rgba(0,0,0,0.4)] p-4 mb-4 mt-3">
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
        </>)}
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
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-1">Recurring Tasks</h2>
        <p className="text-xs text-text-tertiary mb-4">Standing routines that auto-populate &ldquo;Today&apos;s Plan&rdquo; on their scheduled days.</p>
        <RecurringTasksManager />
      </HUDPanel>

      <HUDPanel delay={6}>
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
          <HUDButton variant="danger" size="sm" onClick={() => setShowResetConfirm(true)}>
            <RotateCcw size={14} /> Reset
          </HUDButton>
        </div>
      </HUDPanel>

      <HUDPanel delay={7}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">Account</h2>
        <p className="text-xs text-text-tertiary">Local mode — progress is saved in this browser.</p>
      </HUDPanel>

      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
        >
          <div className="bg-bg-card border border-border rounded-xl shadow-2xl max-w-sm w-full p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-danger/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={20} className="text-danger" />
              </div>
              <div>
                <h2 id="reset-dialog-title" className="text-sm font-semibold text-text-primary">Reset all data?</h2>
                <p className="text-xs text-text-secondary mt-1">This will permanently delete all tasks, check-ins, goals, and progress from this device. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <HUDButton variant="secondary" size="sm" onClick={() => setShowResetConfirm(false)}>Cancel</HUDButton>
              <HUDButton variant="danger" size="sm" onClick={() => { localStorage.removeItem('life-os-storage'); setShowResetConfirm(false); window.location.reload(); }}>Reset everything</HUDButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
