'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface LoginModalProps {
  open: boolean;
  onDismiss?: () => void;
}

// After a failed OAuth round-trip, Supabase sends the user back to the app
// with the reason in the URL (query string for PKCE, hash for implicit) —
// e.g. provider misconfigured, redirect URL not allow-listed, or user cancelled.
// Surface it instead of silently dropping to guest mode.
function readOAuthError(): string | null {
  if (typeof window === 'undefined') return null;
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const message =
    search.get('error_description') ||
    hash.get('error_description') ||
    search.get('error') ||
    hash.get('error');
  if (!message) return null;
  // Strip the error params so a refresh doesn't keep showing the message.
  const url = new URL(window.location.href);
  ['error', 'error_description', 'error_code'].forEach((k) => url.searchParams.delete(k));
  if (/error/.test(url.hash)) url.hash = '';
  window.history.replaceState({}, '', url.toString());
  return message;
}

export default function LoginModal({ open, onDismiss }: LoginModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const oauthError = readOAuthError();
    if (oauthError) setError(oauthError);
  }, []);

  async function handleGoogle() {
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      if (error) throw error;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-sm rounded-2xl border border-border bg-bg-card-solid p-8 shadow-2xl"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg-elevated">
                <span className="gradient-text text-2xl font-bold">J</span>
              </div>

              <h2 className="text-xl font-semibold text-text-primary">
                Sign in to JARVIS
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                Sync your quests, XP, and progress across every device.
              </p>

              <button
                onClick={handleGoogle}
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-bg-elevated px-4 py-3 text-sm font-medium text-text-primary transition hover:bg-bg-hover hover:border-border-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GoogleIcon />
                {loading ? 'Opening Google…' : 'Continue with Google'}
              </button>

              {error && (
                <p className="mt-4 text-xs text-danger">{error}</p>
              )}

              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="mt-5 text-xs text-text-tertiary hover:text-text-secondary transition"
                >
                  Continue without signing in
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
    </svg>
  );
}
