import { shouldNudgeBackup } from '../backupNudge';

const NOW = new Date('2026-07-01T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

describe('shouldNudgeBackup', () => {
  it('nudges when the user has never exported and never been nudged', () => {
    expect(shouldNudgeBackup(NOW, null, null, true)).toBe(true);
  });

  it('never nudges when there is nothing worth backing up yet', () => {
    expect(shouldNudgeBackup(NOW, null, null, false)).toBe(false);
  });

  it('stays quiet when an export happened within the last 7 days', () => {
    expect(shouldNudgeBackup(NOW, daysAgo(3), null, true)).toBe(false);
  });

  it('stays quiet when a nudge was already shown within the last 7 days', () => {
    expect(shouldNudgeBackup(NOW, daysAgo(30), daysAgo(2), true)).toBe(false);
  });

  it('nudges again when both the export and the last nudge are stale', () => {
    expect(shouldNudgeBackup(NOW, daysAgo(30), daysAgo(8), true)).toBe(true);
  });

  it('treats exactly 7 days as still fresh', () => {
    expect(shouldNudgeBackup(NOW, daysAgo(7), null, true)).toBe(false);
  });

  it('ignores unparseable timestamps and nudges', () => {
    expect(shouldNudgeBackup(NOW, 'not-a-date', null, true)).toBe(true);
  });
});
