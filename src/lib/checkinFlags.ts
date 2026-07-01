// ---------------------------------------------------------------------------
// Daily check-in side-flags (drank / smoked / future flags).
//
// Encoded into the existing `DailyCheckin.notes` text column as a
// comma-separated list of tokens, e.g. "drank_last_night,smoked_last_night".
// Backward compatible: legacy records that store the literal string
// "drank_last_night" still parse correctly.
// ---------------------------------------------------------------------------

export interface CheckinFlags {
  drank: boolean;
  smoked: boolean;
  m: boolean;
}

export const EMPTY_FLAGS: CheckinFlags = { drank: false, smoked: false, m: false };

const FLAG_TOKENS = {
  drank: 'drank_last_night',
  smoked: 'smoked_last_night',
  m: 'm_last_night',
} as const;

export function parseCheckinFlags(notes: string | null | undefined): CheckinFlags {
  if (!notes) return { ...EMPTY_FLAGS };
  const tokens = new Set(notes.split(',').map((t) => t.trim()));
  return {
    drank: tokens.has(FLAG_TOKENS.drank),
    smoked: tokens.has(FLAG_TOKENS.smoked),
    m: tokens.has(FLAG_TOKENS.m),
  };
}

export function encodeCheckinFlags(flags: Partial<CheckinFlags>): string | undefined {
  const tokens: string[] = [];
  if (flags.drank) tokens.push(FLAG_TOKENS.drank);
  if (flags.smoked) tokens.push(FLAG_TOKENS.smoked);
  if (flags.m) tokens.push(FLAG_TOKENS.m);
  return tokens.length > 0 ? tokens.join(',') : undefined;
}

/** Compact human-readable label for activity log / feed entries. */
export function flagsToShortLabel(flags: CheckinFlags): string {
  const parts: string[] = [];
  if (flags.drank) parts.push('Drank');
  if (flags.smoked) parts.push('Smoked');
  if (flags.m) parts.push('M');
  return parts.join(' + ');
}

/** Per-substance penalty (out of 100) applied to wellbeing score.
 * Drank: alcohol disrupts REM and impairs executive function next day
 *        (Ebrahim et al., 2013; Howland et al., 2010).
 * Smoked: THC suppresses REM and impairs working memory / attention for
 *        ~12-24h after use (Schierenbeck et al., 2008; Crean et al., 2011).
 *        Effect size is real but typically smaller than acute alcohol. */
export function getWellbeingPenalty(flags: CheckinFlags): number {
  let penalty = 0;
  if (flags.drank) penalty += 15;
  if (flags.smoked) penalty += 10;
  if (flags.m) penalty += 5;
  return penalty;
}
