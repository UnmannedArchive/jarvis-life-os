import { mkdtempSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { parseSessions, readSessions } from '../eventsFile';

describe('parseSessions', () => {
  it('parses well-formed lines and skips malformed ones', () => {
    const contents = [
      '{"app":"Cursor","title":"a","start":"2026-06-04T09:00:00-07:00","end":"2026-06-04T09:10:00-07:00","seconds":600}',
      'not json',
      '{"app":"X"}', // missing fields
      '',
    ].join('\n');
    const sessions = parseSessions(contents);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].app).toBe('Cursor');
  });
});

describe('readSessions', () => {
  it('reports monitorRunning=false when the file is absent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mon-'));
    const prev = process.env.LIFE_OS_MONITOR_DIR;
    process.env.LIFE_OS_MONITOR_DIR = dir;
    try {
      const res = readSessions();
      expect(res.monitorRunning).toBe(false);
      expect(res.sessions).toEqual([]);
    } finally {
      process.env.LIFE_OS_MONITOR_DIR = prev;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('reads sessions when the file exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mon-'));
    writeFileSync(join(dir, 'events.jsonl'),
      '{"app":"Cursor","title":"a","start":"2026-06-04T09:00:00-07:00","end":"2026-06-04T09:10:00-07:00","seconds":600}\n');
    const prev = process.env.LIFE_OS_MONITOR_DIR;
    process.env.LIFE_OS_MONITOR_DIR = dir;
    try {
      const res = readSessions();
      expect(res.monitorRunning).toBe(true);
      expect(res.sessions).toHaveLength(1);
    } finally {
      process.env.LIFE_OS_MONITOR_DIR = prev;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
