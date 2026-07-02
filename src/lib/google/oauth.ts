// ---------------------------------------------------------------------------
// Google OAuth token exchange/refresh — SERVER ONLY (reads GOOGLE_CLIENT_SECRET).
// Import only from API routes. Unlike WHOOP, Google does NOT return a new
// refresh token on refresh, so refreshGoogleTokens preserves the existing one.
// ---------------------------------------------------------------------------

import { GOOGLE_TOKEN_URL } from './constants';

export interface GoogleTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

function requireEnv(): { clientId: string; clientSecret: string; redirectUri: string } {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google env not configured (NEXT_PUBLIC_GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXT_PUBLIC_GOOGLE_REDIRECT_URI)');
  }
  return { clientId, clientSecret, redirectUri };
}

async function postToken(body: URLSearchParams): Promise<GoogleTokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Google token endpoint returned ${res.status}: ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as GoogleTokenResponse;
}

export async function exchangeGoogleCode(code: string): Promise<GoogleTokens> {
  const { clientId, clientSecret, redirectUri } = requireEnv();
  const json = await postToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  );
  if (!json.refresh_token) {
    throw new Error('Google did not return a refresh token (re-consent with prompt=consent).');
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

/** Refresh the access token. Google keeps the same refresh token, so we pass it back through. */
export async function refreshGoogleTokens(refreshToken: string): Promise<GoogleTokens> {
  const { clientId, clientSecret } = requireEnv();
  const json = await postToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  );
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}
