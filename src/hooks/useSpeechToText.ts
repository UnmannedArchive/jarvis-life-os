'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Browser speech-to-text via the Web Speech API (no dependency, no API cost).
 * - `onResult` receives the accumulated final transcript while listening.
 * - `onError` receives the error code (e.g. 'not-allowed', 'no-speech') so the
 *   UI can guide the user — otherwise mic failures are silent and confusing.
 * - `supported` is false where the API is missing, so callers can hide the UI.
 *
 * Callbacks are read through refs so changing them never tears down an active
 * recognition session. Shared by the Ideas box and the "Plan my day" planner.
 */
export function useSpeechToText(
  onResult: (text: string) => void,
  onError?: (error: string) => void,
) {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  // Keep the latest callbacks without re-creating the recognition instance.
  useEffect(() => {
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    // One-time browser capability check; must run post-mount to stay SSR-safe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(!!SpeechRecognitionAPI);

    if (!SpeechRecognitionAPI) return;
    const rec = new SpeechRecognitionAPI();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join('');
      if (e.results[e.results.length - 1]?.isFinal && transcript.trim()) {
        onResultRef.current(transcript.trim());
      }
    };

    rec.onerror = (e: Event) => {
      setIsListening(false);
      const code = (e as { error?: string }).error || 'unknown';
      onErrorRef.current?.(code);
    };
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {
        // ignore
      }
    };
  }, []);

  const toggle = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (isListening) {
      try {
        rec.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    } else {
      try {
        rec.start();
        setIsListening(true);
      } catch {
        // start() throws if already running or immediately blocked — surface it.
        onErrorRef.current?.('start-failed');
      }
    }
  }, [isListening]);

  return { isListening, supported, toggle };
}
