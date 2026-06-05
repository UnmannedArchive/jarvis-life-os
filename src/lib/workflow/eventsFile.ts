import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { UsageSession } from './types';

export function monitorDir(): string {
  return process.env.LIFE_OS_MONITOR_DIR || join(homedir(), '.life-os-monitor');
}

export function eventsFilePath(): string {
  return join(monitorDir(), 'events.jsonl');
}

export interface ReadResult { monitorRunning: boolean; sessions: UsageSession[]; }

/** Parse JSONL contents into sessions, tolerating malformed lines. */
export function parseSessions(contents: string): UsageSession[] {
  const out: UsageSession[] = [];
  for (const line of contents.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      const o = JSON.parse(t) as Partial<UsageSession>;
      if (o && typeof o.app === 'string' && typeof o.title === 'string'
        && typeof o.start === 'string' && typeof o.end === 'string'
        && typeof o.seconds === 'number') {
        out.push({ app: o.app, title: o.title, start: o.start, end: o.end, seconds: o.seconds });
      }
    } catch {
      // skip malformed line
    }
  }
  return out;
}

export function readSessions(): ReadResult {
  const path = eventsFilePath();
  if (!existsSync(path)) return { monitorRunning: false, sessions: [] };
  const contents = readFileSync(path, 'utf8');
  return { monitorRunning: true, sessions: parseSessions(contents) };
}
