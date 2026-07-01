'use client';

// useGoogleCalendar — connect/disconnect Google Calendar WRITE access and add
// events. Mirrors the WHOOP connect flow (client-stored tokens, server secret).

import { useCallback, useState } from 'react';
import { useStore } from '@/stores/useStore';
import { buildGoogleAuthorizeUrl, isGoogleConfigured } from '@/lib/google/constants';
import { createGoogleEvent, GoogleAuthError } from '@/lib/google/calendar';
import { GCAL_STATE_KEY } from '@/app/gcal/callback/page';
import type { GoogleEventBody } from '@/lib/google/propose';
import type { CreatedEvent } from '@/lib/google/calendar';

export function useGoogleCalendar() {
  const googleAuth = useStore((s) => s.googleAuth);
  const setGoogleAuth = useStore((s) => s.setGoogleAuth);
  const clearGoogleAuth = useStore((s) => s.clearGoogleAuth);
  const [error, setError] = useState<string | null>(null);

  const configured = isGoogleConfigured();
  const connected = !!googleAuth;

  const connect = useCallback(() => {
    if (!configured) {
      setError('Google Calendar isn’t configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env.local.');
      return;
    }
    const state = crypto.randomUUID();
    sessionStorage.setItem(GCAL_STATE_KEY, state);
    window.location.href = buildGoogleAuthorizeUrl(state);
  }, [configured]);

  const addEvent = useCallback(
    async (event: GoogleEventBody): Promise<CreatedEvent> => {
      if (!googleAuth) throw new GoogleAuthError('Not connected to Google Calendar');
      try {
        return await createGoogleEvent(googleAuth, setGoogleAuth, event);
      } catch (err) {
        if (err instanceof GoogleAuthError) clearGoogleAuth();
        throw err;
      }
    },
    [googleAuth, setGoogleAuth, clearGoogleAuth],
  );

  return { configured, connected, connect, disconnect: clearGoogleAuth, addEvent, error };
}
