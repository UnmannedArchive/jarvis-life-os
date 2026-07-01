// ---------------------------------------------------------------------------
// Shared WHOOP data fetch — given a valid access token, pull recent records and
// normalize them. Isomorphic (only uses fetch + Authorization header), so both
// the browser client (src/lib/whoop/client.ts) and the server webhook use it.
// Token acquisition/refresh is the caller's job.
// ---------------------------------------------------------------------------

import { WHOOP_API_BASE } from './constants';
import {
  normalizeRecords,
  normalizeRecovery,
  normalizeSleep,
  normalizeCycle,
  normalizeWorkout,
} from './normalize';
import type {
  WhoopData,
  RawRecovery,
  RawSleep,
  RawCycle,
  RawWorkout,
  RawList,
} from './types';

const RECORD_LIMIT = 14;

export class WhoopUnauthorizedError extends Error {
  constructor() {
    super('WHOOP returned 401');
    this.name = 'WhoopUnauthorizedError';
  }
}

/** Fetch + normalize the recent bundle. Throws WhoopUnauthorizedError on 401. */
export async function fetchWhoopBundle(accessToken: string): Promise<WhoopData> {
  const get = (path: string) =>
    fetch(`${WHOOP_API_BASE}${path}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });

  const q = `?limit=${RECORD_LIMIT}`;
  const [recRes, slpRes, cycRes, wkoRes] = await Promise.all([
    get(`/v2/recovery${q}`),
    get(`/v2/activity/sleep${q}`),
    get(`/v2/cycle${q}`),
    get(`/v2/activity/workout${q}`),
  ]);

  for (const res of [recRes, slpRes, cycRes, wkoRes]) {
    if (res.status === 401) throw new WhoopUnauthorizedError();
    if (!res.ok) throw new Error(`WHOOP API returned ${res.status}`);
  }

  const [rec, slp, cyc, wko] = (await Promise.all([
    recRes.json(),
    slpRes.json(),
    cycRes.json(),
    wkoRes.json(),
  ])) as [RawList<RawRecovery>, RawList<RawSleep>, RawList<RawCycle>, RawList<RawWorkout>];

  return {
    recovery: normalizeRecords(rec, normalizeRecovery),
    sleep: normalizeRecords(slp, normalizeSleep),
    cycles: normalizeRecords(cyc, normalizeCycle),
    workouts: normalizeRecords(wko, normalizeWorkout),
  };
}

/** Fetch the user's basic profile (used to key server-side token storage). */
export async function fetchWhoopProfile(
  accessToken: string,
): Promise<{ user_id: number; email?: string; first_name?: string; last_name?: string }> {
  const res = await fetch(`${WHOOP_API_BASE}/v2/user/profile/basic`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (res.status === 401) throw new WhoopUnauthorizedError();
  if (!res.ok) throw new Error(`WHOOP profile returned ${res.status}`);
  return res.json();
}
