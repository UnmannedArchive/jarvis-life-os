// ---------------------------------------------------------------------------
// WHOOP webhook helpers (server). WHOOP signs each webhook with
//   base64(HMAC-SHA256(client_secret, timestampHeader + rawBody))
// sent in X-WHOOP-Signature, with X-WHOOP-Signature-Timestamp (ms).
// ---------------------------------------------------------------------------

import crypto from 'crypto';

export function computeWhoopSignature(secret: string, timestamp: string, rawBody: string): string {
  return crypto.createHmac('sha256', secret).update(timestamp + rawBody).digest('base64');
}

/** Constant-time compare of the expected vs received signature. */
export function verifyWhoopSignature(
  secret: string,
  timestamp: string,
  rawBody: string,
  signature: string,
): boolean {
  const expected = computeWhoopSignature(secret, timestamp, rawBody);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface WhoopEvent {
  userId: number;
  type: string;
  id: string | number;
}

/** Parse the webhook JSON; returns null if malformed or missing required fields. */
export function parseWhoopEvent(rawBody: string): WhoopEvent | null {
  try {
    const json = JSON.parse(rawBody) as { user_id?: number; type?: string; id?: string | number };
    if (typeof json.user_id !== 'number' || typeof json.type !== 'string' || json.id === undefined) {
      return null;
    }
    return { userId: json.user_id, type: json.type, id: json.id };
  } catch {
    return null;
  }
}
