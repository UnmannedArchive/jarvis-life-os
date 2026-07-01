// ---------------------------------------------------------------------------
// WHOOP constants + client-safe authorize-URL builder.
// Only the client *id* and redirect URI are public (NEXT_PUBLIC_*); the client
// *secret* lives server-side and is used solely by the token exchange/refresh
// API routes (src/app/api/whoop/*).
// ---------------------------------------------------------------------------

export const WHOOP_AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
export const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
export const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer';

export const WHOOP_SCOPES = [
  'read:recovery',
  'read:cycles',
  'read:sleep',
  'read:workout',
  'read:profile',
  'read:body_measurement',
  'offline',
] as const;

/** True when the public client id + redirect URI are present in the env. */
export function isWhoopConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_WHOOP_CLIENT_ID &&
    process.env.NEXT_PUBLIC_WHOOP_REDIRECT_URI
  );
}

/**
 * Build the WHOOP authorization URL the browser redirects to. `state` is a
 * random CSRF token the caller should also stash (sessionStorage) and re-check
 * on the callback.
 */
export function buildWhoopAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.NEXT_PUBLIC_WHOOP_CLIENT_ID ?? '',
    redirect_uri: process.env.NEXT_PUBLIC_WHOOP_REDIRECT_URI ?? '',
    scope: WHOOP_SCOPES.join(' '),
    state,
  });
  return `${WHOOP_AUTH_URL}?${params.toString()}`;
}
