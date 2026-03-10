'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Hexagon } from 'lucide-react';
import HUDButton from '@/components/hud/HUDButton';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name.trim() || 'User' },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user && !data.user.identities?.length) {
      setError('An account with this email already exists');
      setLoading(false);
      return;
    }

    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[rgba(255,255,255,0.04)] flex items-center justify-center p-4">
      <div className="bg-[rgba(255,255,255,0.03)] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl border border-border p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-3">
            <Hexagon size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-text-primary">Create account</h1>
          <p className="text-sm text-text-tertiary mt-1">Get started with Life OS</p>
        </div>
        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm placeholder:text-text-placeholder" />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm placeholder:text-text-placeholder" />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm placeholder:text-text-placeholder" />
          </div>
          <HUDButton type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating...' : 'Create Account'}
          </HUDButton>
        </form>
        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-accent hover:underline">Already have an account?</Link>
        </div>
      </div>
    </div>
  );
}
