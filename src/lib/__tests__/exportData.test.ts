import { buildExportPayload, parseImportPayload } from '../exportData';

describe('buildExportPayload', () => {
  it('wraps the full persisted snapshot with version + timestamp', () => {
    const state = { user: { id: 'guest' }, quests: [], journalEntries: [{ id: 'j1' }] };
    const payload = buildExportPayload(state, new Date('2026-07-01T12:00:00Z'));

    expect(payload.version).toBe(2);
    expect(payload.exportedAt).toBe('2026-07-01T12:00:00.000Z');
    expect(payload.state).toEqual(state);
  });
});

describe('parseImportPayload', () => {
  it('accepts a v2 export and returns the full state', () => {
    const file = {
      version: 2,
      exportedAt: '2026-07-01T00:00:00Z',
      state: { user: { id: 'guest' }, quests: [{ id: 'q1' }], ideas: [{ id: 'i1' }] },
    };

    const result = parseImportPayload(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.ideas).toEqual([{ id: 'i1' }]);
      expect(result.summary).toContain('1 task');
    }
  });

  it('accepts a legacy v1 export (flat 6-field shape)', () => {
    const file = {
      version: 1,
      user: { id: 'guest', display_name: 'Joseph' },
      pillars: [],
      quests: [{ id: 'q1' }, { id: 'q2' }],
      goals: [{ id: 'g1' }],
      todayCheckin: null,
      activityLog: [],
    };

    const result = parseImportPayload(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.user).toEqual(file.user);
      expect(result.state.quests).toHaveLength(2);
      expect(result.summary).toContain('2 tasks');
      expect(result.summary).toContain('1 goal');
    }
  });

  it('rejects files without a user', () => {
    const result = parseImportPayload({ version: 2, state: { quests: [] } });
    expect(result.ok).toBe(false);
  });

  it('rejects non-objects', () => {
    expect(parseImportPayload('nope').ok).toBe(false);
    expect(parseImportPayload(null).ok).toBe(false);
  });
});
