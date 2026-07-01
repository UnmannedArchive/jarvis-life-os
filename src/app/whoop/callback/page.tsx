'use client';

// WHOOP OAuth landing page. WHOOP redirects the browser here with ?code&state.
// We verify the CSRF state we stashed before redirecting out, POST the code to
// the server (which exchanges it using the client secret), persist the returned
// tokens in the store, then bounce back to Settings.

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/stores/useStore';

export const WHOOP_STATE_KEY = 'whoop_oauth_state';

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const setWhoopAuth = useStore((s) => s.setWhoopAuth);
  const setWhoopUserId = useStore((s) => s.setWhoopUserId);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard React 18 strict-mode double-invoke
    ran.current = true;

    const code = params.get('code');
    const state = params.get('state');
    const oauthError = params.get('error');

    if (oauthError) {
      setError(`WHOOP denied the connection (${oauthError}).`);
      return;
    }
    const expected = typeof window !== 'undefined' ? sessionStorage.getItem(WHOOP_STATE_KEY) : null;
    if (!code || !state || !expected || state !== expected) {
      setError('Invalid or expired authorization response. Please try connecting again.');
      return;
    }
    sessionStorage.removeItem(WHOOP_STATE_KEY);

    (async () => {
      try {
        const res = await fetch('/api/whoop/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Exchange failed (${res.status})`);
        const tokens = {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
        };
        setWhoopAuth(tokens);

        // Best-effort: store the token server-side so the webhook can keep data
        // fresh even when the app is closed. Harmless 503 if cloud isn't set up.
        try {
          const stored = await fetch('/api/whoop/store-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tokens),
          });
          if (stored.ok) {
            const { userId } = await stored.json();
            if (typeof userId === 'number') setWhoopUserId(userId);
          }
        } catch {
          /* cloud push optional — ignore */
        }

        router.replace('/settings?whoop=connected');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not complete WHOOP connection.');
      }
    })();
  }, [params, router, setWhoopAuth, setWhoopUserId]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      {error ? (
        <div className="max-w-md space-y-3">
          <p className="text-danger font-semibold">WHOOP connection failed</p>
          <p className="text-sm text-text-secondary">{error}</p>
          <button
            onClick={() => router.replace('/settings')}
            className="text-sm text-accent underline cursor-pointer"
          >
            Back to Settings
          </button>
        </div>
      ) : (
        <p className="text-sm text-text-secondary animate-pulse">Connecting your WHOOP…</p>
      )}
    </div>
  );
}

export default function WhoopCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-text-secondary">Connecting…</div>}>
      <CallbackInner />
    </Suspense>
  );
}
