'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Hexagon } from 'lucide-react';
import HUDButton from '@/components/hud/HUDButton';
import { motion } from 'framer-motion';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      router.push('/');
    }, 800);
  };

  return (
    <div className="min-h-screen hud-bg-gradient flex items-center justify-center p-4">
      <div className="hud-grid-overlay" />
      <div className="hud-scanlines" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="hud-panel hud-panel-inner p-8 w-full max-w-sm relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <Hexagon size={40} className="text-hud-green mb-3" style={{ filter: 'drop-shadow(0 0 10px rgba(0,255,136,0.5))' }} />
          <h1 className="font-[family-name:var(--font-orbitron)] text-xl tracking-[4px] text-hud-green glow-text">
            JARVIS
          </h1>
          <p className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[3px] text-hud-text-muted mt-1">
            NEW OPERATOR REGISTRATION
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-muted block mb-1">
              Operator Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-white/5 border border-hud-border px-3 py-2.5 text-sm text-hud-text placeholder:text-hud-text-dim focus:outline-none focus:border-hud-green/40"
            />
          </div>
          <div>
            <label className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-muted block mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@jarvis.os"
              className="w-full bg-white/5 border border-hud-border px-3 py-2.5 text-sm text-hud-text placeholder:text-hud-text-dim focus:outline-none focus:border-hud-green/40"
            />
          </div>
          <div>
            <label className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase text-hud-text-muted block mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-white/5 border border-hud-border px-3 py-2.5 text-sm text-hud-text placeholder:text-hud-text-dim focus:outline-none focus:border-hud-green/40"
            />
          </div>
          <HUDButton type="submit" disabled={loading} className="w-full">
            {loading ? 'INITIALIZING...' : 'CREATE OPERATOR PROFILE'}
          </HUDButton>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-[11px] font-[family-name:var(--font-orbitron)] tracking-[2px] text-hud-cyan hover:text-hud-cyan/80 transition-colors"
          >
            ← EXISTING OPERATOR LOGIN
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
