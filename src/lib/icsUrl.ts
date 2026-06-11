// ---------------------------------------------------------------------------
// icsUrl.ts — validation for user-supplied iCal feed URLs.
//
// The /api/calendar/ics proxy fetches whatever URL the user pasted, so it must
// not be steerable at anything on this machine or the local network (SSRF).
// Only https (webcal normalizes to https) to public-looking hosts is allowed.
// Hostname checks can't catch DNS tricks, but for a single-user local app the
// pasted URL is the user's own calendar feed.
// ---------------------------------------------------------------------------

const PRIVATE_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /\.local$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /^\[?fc/i, // ipv6 unique-local fc00::/7
  /^\[?fe80/i, // ipv6 link-local
];

/**
 * Returns a safe https URL string, or null if the input is not an acceptable
 * iCal feed location.
 */
export function normalizeIcsUrl(raw: string): string | null {
  const trimmed = raw.trim().replace(/^webcal:\/\//i, 'https://');

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') return null;

  const host = url.hostname;
  if (!host || PRIVATE_HOST_PATTERNS.some((re) => re.test(host))) return null;

  return url.toString();
}
