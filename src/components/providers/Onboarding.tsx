'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Hexagon, ArrowRight, Sparkles } from 'lucide-react';
import HUDButton from '@/components/hud/HUDButton';

interface OnboardingProps {
  onComplete: (name: string) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');

  return (
    <div className="h-screen w-screen bg-bg ambient-bg flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }} className="text-center max-w-md">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 rounded-3xl bg-gradient-to-br from-accent to-purple mx-auto mb-8 flex items-center justify-center shadow-[0_0_40px_rgba(200,200,200,0.2)]">
              <Hexagon size={32} className="text-white" />
            </motion.div>
            <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="text-4xl font-bold text-text-primary mb-3 tracking-tight">
              Life OS
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="text-text-tertiary mb-8">
              Your personal operating system for a balanced, intentional life.
            </motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
              <HUDButton size="lg" onClick={() => setStep(1)}>
                Get Started <ArrowRight size={16} />
              </HUDButton>
            </motion.div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="name" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }} className="text-center max-w-md w-full">
            <div className="w-14 h-14 rounded-2xl bg-accent-dim mx-auto mb-6 flex items-center justify-center">
              <Sparkles size={24} className="text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">What should we call you?</h2>
            <p className="text-sm text-text-tertiary mb-6">This is your personal space. Make it yours.</p>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              className="w-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-2xl px-5 py-4 text-lg text-center text-text-primary placeholder:text-text-placeholder mb-6"
              onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) onComplete(name.trim()); }} />
            <HUDButton size="lg" onClick={() => { if (name.trim()) onComplete(name.trim()); }} disabled={!name.trim()}>
              Let&apos;s Go <ArrowRight size={16} />
            </HUDButton>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
