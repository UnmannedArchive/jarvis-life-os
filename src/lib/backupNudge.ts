// The save file lives entirely in this browser — remind the user to export a
// backup once a week, and don't nag more than once per week.

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function isFresh(iso: string | null, now: Date): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return now.getTime() - t <= WEEK_MS;
}

export function shouldNudgeBackup(
  now: Date,
  lastExportAt: string | null,
  lastNudgedAt: string | null,
  hasContent: boolean,
): boolean {
  if (!hasContent) return false; // fresh install — nothing to lose yet
  if (isFresh(lastExportAt, now)) return false;
  if (isFresh(lastNudgedAt, now)) return false;
  return true;
}
