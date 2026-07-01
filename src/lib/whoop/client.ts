// ---------------------------------------------------------------------------
// WHOOP data client (browser). Fetches recent v2 records with the access token
// and normalizes them. Token handling avoids the rotation race: WHOOP rotates
// BOTH tokens on every refresh, so concurrent refreshes invalidate each other —
// instead we refresh ONCE up front when the access token is near expiry, then
// fire all reads with the fresh token. A 401 after that means re-auth.
// ---------------------------------------------------------------------------

import { fetchWhoopBundle, WhoopUnauthorizedError } from './bundle';
import type { WhoopTokens, WhoopData } from './types';

/** Thrown when WHOOP rejects the token; the caller should prompt a reconnect. */
export class WhoopAuthError extends Error {
  constructor(message = 'WHOOP authorization expired') {
    super(message);
    this.name = 'WhoopAuthError';
  }
}

/** Refresh the access token if it expires within this window. */
const EXPIRY_SKEW_MS = 60_000;

async function refreshViaServer(refreshToken: string): Promise<WhoopTokens> {
  const res = await fetch('/api/whoop/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new WhoopAuthError(`Token refresh failed (${res.status})`);
  return (await res.json()) as WhoopTokens;
}

/**
 * Fetch + normalize the user's recent WHOOP data.
 * @param tokens   current token pair
 * @param onTokens called with a rotated pair if a refresh happens, so the
 *                 caller can persist it to the store
 */
export async function fetchWhoopData(
  tokens: WhoopTokens,
  onTokens: (t: WhoopTokens) => void,
): Promise<WhoopData> {
  let active = tokens;
  if (Date.now() >= tokens.expiresAt - EXPIRY_SKEW_MS) {
    active = await refreshViaServer(tokens.refreshToken);
    onTokens(active);
  }

  try {
    return await fetchWhoopBundle(active.accessToken);
  } catch (err) {
    if (err instanceof WhoopUnauthorizedError) throw new WhoopAuthError();
    throw err;
  }
}
