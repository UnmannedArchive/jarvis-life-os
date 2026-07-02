'use client';

// Google Calendar OAuth landing page. Google redirects here with ?code&state.
// We verify the CSRF state, exchange the code server-side, persist the tokens,
// then return to Settings.

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/stores/useStore';

export const GCAL_STATE_KEY = 'gcal_oauth_state';

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const setGoogleAuth = useStore((s) => s.setGoogleAuth);
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get('code');
    const state = params.get('state');
    const oauthError = params.get('error');

    if (oauthError) {
      setError(`Google denied the connection (${oauthError}).`);
      return;
    }
    const expected = typeof window !== 'undefined' ? sessionStorage.getItem(GCAL_STATE_KEY) : null;
    if (!code || !state || !expected || state !== expected) {
      setError('Invalid or expired authorization response. Please try connecting again.');
      return;
    }
    sessionStorage.removeItem(GCAL_STATE_KEY);

    (async () => {
      try {
        const res = await fetch('/api/gcal/exchange', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Exchange failed (${res.status})`);
        setGoogleAuth({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
        });
        router.replace('/settings?gcal=connected');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not complete Google connection.');
      }
    })();
  }, [params, router, setGoogleAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      {error ? (
        <div className="max-w-md space-y-3">
          <p className="text-danger font-semibold">Google Calendar connection failed</p>
          <p className="text-sm text-text-secondary">{error}</p>
          <button onClick={() => router.replace('/settings')} className="text-sm text-accent underline cursor-pointer">
            Back to Settings
          </button>
        </div>
      ) : (
        <p className="text-sm text-text-secondary animate-pulse">Connecting Google Calendar…</p>
      )}
    </div>
  );
}

export default function GcalCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-text-secondary">Connecting…</div>}>
      <CallbackInner />
    </Suspense>
  );
}
