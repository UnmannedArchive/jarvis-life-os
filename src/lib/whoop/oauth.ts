// ---------------------------------------------------------------------------
// WHOOP OAuth token exchange/refresh — SERVER ONLY. Reads WHOOP_CLIENT_SECRET,
// so this must only ever be imported from API routes (src/app/api/whoop/*),
// never from a client component.
// ---------------------------------------------------------------------------

import { WHOOP_TOKEN_URL } from './constants';

export interface WhoopTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch millis when the access token expires. */
  expiresAt: number;
}

interface WhoopTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type?: string;
  scope?: string;
}

function requireEnv(): { clientId: string; clientSecret: string; redirectUri: string } {
  const clientId = process.env.NEXT_PUBLIC_WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_WHOOP_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('WHOOP env not configured (NEXT_PUBLIC_WHOOP_CLIENT_ID, WHOOP_CLIENT_SECRET, NEXT_PUBLIC_WHOOP_REDIRECT_URI)');
  }
  return { clientId, clientSecret, redirectUri };
}

async function postToken(body: URLSearchParams): Promise<WhoopTokens> {
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`WHOOP token endpoint returned ${res.status}: ${detail.slice(0, 200)}`);
  }
  const json = (await res.json()) as WhoopTokenResponse;
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

/** Exchange an authorization code (from the redirect) for the initial token pair. */
export function exchangeWhoopCode(code: string): Promise<WhoopTokens> {
  const { clientId, clientSecret, redirectUri } = requireEnv();
  return postToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  );
}

/** Trade a refresh token for a rotated pair (WHOOP invalidates the old tokens). */
export function refreshWhoopTokens(refreshToken: string): Promise<WhoopTokens> {
  const { clientId, clientSecret } = requireEnv();
  return postToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'offline',
    }),
  );
}
