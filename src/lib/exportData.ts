// Full-snapshot export/import for the local save file. v2 exports wrap the
// entire persisted store (journal, ideas, streaks, WHOOP cache — everything
// partialize() covers), not just the original 6 slices; v1 files stay
// importable.

export interface ExportPayload {
  version: 2;
  exportedAt: string;
  state: Record<string, unknown>;
}

export type ImportResult =
  | { ok: true; state: Record<string, unknown>; summary: string }
  | { ok: false; error: string };

export function buildExportPayload(
  persistedState: Record<string, unknown>,
  now: Date = new Date(),
): ExportPayload {
  return { version: 2, exportedAt: now.toISOString(), state: persistedState };
}

function summarize(state: Record<string, unknown>): string {
  const quests = Array.isArray(state.quests) ? state.quests.length : 0;
  const goals = Array.isArray(state.goals) ? state.goals.length : 0;
  return `${quests} task${quests === 1 ? '' : 's'} and ${goals} goal${goals === 1 ? '' : 's'}`;
}

export function parseImportPayload(parsed: unknown): ImportResult {
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: "This doesn't look like a Life OS export (.json)." };
  }
  const file = parsed as Record<string, unknown>;

  // v2: full persisted snapshot under `state`
  if (file.version === 2 && file.state && typeof file.state === 'object') {
    const state = file.state as Record<string, unknown>;
    if (!state.user) {
      return { ok: false, error: "This doesn't look like a Life OS export (missing user)." };
    }
    return { ok: true, state, summary: summarize(state) };
  }

  // v1: flat shape with the original 6 slices
  if (file.user && Array.isArray(file.quests)) {
    const state: Record<string, unknown> = {
      user: file.user,
      pillars: Array.isArray(file.pillars) ? file.pillars : [],
      quests: file.quests,
      goals: Array.isArray(file.goals) ? file.goals : [],
      todayCheckin: file.todayCheckin ?? null,
      activityLog: Array.isArray(file.activityLog) ? file.activityLog : [],
    };
    return { ok: true, state, summary: summarize(state) };
  }

  return { ok: false, error: "This doesn't look like a Life OS export (missing user or tasks)." };
}
