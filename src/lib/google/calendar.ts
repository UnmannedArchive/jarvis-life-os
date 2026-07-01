// ---------------------------------------------------------------------------
// Google Calendar write client (browser). Creates events on the user's primary
// calendar with their access token, refreshing once via /api/gcal/refresh on a
// near-expiry or 401. Token acquisition lives in the OAuth routes.
// ---------------------------------------------------------------------------

import { GOOGLE_CALENDAR_API } from './constants';
import type { GoogleEventBody } from './propose';

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export class GoogleAuthError extends Error {
  constructor(message = 'Google authorization expired') {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

const EXPIRY_SKEW_MS = 60_000;

async function refreshViaServer(refreshToken: string): Promise<GoogleTokens> {
  const res = await fetch('/api/gcal/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new GoogleAuthError(`Token refresh failed (${res.status})`);
  return (await res.json()) as GoogleTokens;
}

export interface CreatedEvent {
  id: string;
  htmlLink?: string;
}

/**
 * Create an all-day event on the primary calendar.
 * @param onTokens called with refreshed tokens so the caller can persist them.
 */
export async function createGoogleEvent(
  tokens: GoogleTokens,
  onTokens: (t: GoogleTokens) => void,
  event: GoogleEventBody,
): Promise<CreatedEvent> {
  let active = tokens;
  if (Date.now() >= tokens.expiresAt - EXPIRY_SKEW_MS) {
    active = await refreshViaServer(tokens.refreshToken);
    onTokens(active);
  }

  const post = (token: string) =>
    fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(10_000),
    });

  let res = await post(active.accessToken);
  if (res.status === 401) {
    active = await refreshViaServer(active.refreshToken);
    onTokens(active);
    res = await post(active.accessToken);
  }
  if (res.status === 401) throw new GoogleAuthError();
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Google Calendar returned ${res.status}: ${detail.slice(0, 160)}`);
  }
  return (await res.json()) as CreatedEvent;
}
