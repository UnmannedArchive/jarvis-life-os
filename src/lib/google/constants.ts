// ---------------------------------------------------------------------------
// Google Calendar OAuth constants + client-safe authorize-URL builder.
// WRITE access (calendar.events), separate from the read-only iCal feed.
// Public client id + redirect are NEXT_PUBLIC_*; the secret stays server-side.
// ---------------------------------------------------------------------------

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';

export function isGoogleConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
  );
}

/**
 * Build the Google consent URL. `access_type=offline` + `prompt=consent` are
 * required to receive a refresh token (Google only returns one on first consent).
 */
export function buildGoogleAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
    redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ?? '',
    scope: GOOGLE_CALENDAR_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}
