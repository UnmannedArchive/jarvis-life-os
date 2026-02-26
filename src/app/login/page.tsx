'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Hexagon } from 'lucide-react';
import HUDButton from '@/components/hud/HUDButton';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => router.push('/'), 600);
  };

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-border p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mb-3">
            <Hexagon size={22} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-text-primary">Welcome back</h1>
          <p className="text-sm text-text-tertiary mt-1">Sign in to Life OS</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-text-placeholder" />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1.5">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
              className="w-full border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-text-placeholder" />
          </div>
          <HUDButton type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </HUDButton>
        </form>
        <div className="mt-6 text-center">
          <Link href="/signup" className="text-sm text-accent hover:underline">Create an account</Link>
        </div>
      </div>
    </div>
  );
}
