'use client';

import { useStore } from '@/stores/useStore';
import { getLoginBonusXP, getLoginBonusLabel } from '@/lib/psychology';
import { motion, AnimatePresence } from 'framer-motion';
import HUDButton from '@/components/hud/HUDButton';
import { Gift, Sparkles } from 'lucide-react';

export default function LoginBonus() {
  const claimed = useStore((s) => s.loginBonusClaimed);
  const consecutive = useStore((s) => s.consecutiveLogins);
  const claimBonus = useStore((s) => s.claimLoginBonus);

  if (claimed) return null;

  const xp = getLoginBonusXP(consecutive);
  const nextXP = getLoginBonusXP(consecutive + 1);
  const label = getLoginBonusLabel(consecutive);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10, height: 0 }} className="mb-4">
        <div className="relative overflow-hidden rounded-2xl border border-purple/15 p-5 shimmer"
          style={{ background: 'linear-gradient(135deg, rgba(150,150,150,0.06) 0%, rgba(200,200,200,0.04) 50%, rgba(150,150,150,0.06) 100%)' }}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-purple/[0.06] to-transparent rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple/20 to-accent/10 border border-purple/15 flex items-center justify-center shadow-[0_0_20px_rgba(150,150,150,0.1)]">
                <Gift size={22} className="text-purple drop-shadow-[0_0_8px_rgba(150,150,150,0.4)]" />
              </div>
              <div>
                <div className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                  Daily Login Bonus
                  <Sparkles size={12} className="text-purple" />
                </div>
                <div className="text-xs text-text-tertiary">
                  {label} · +{xp} XP
                  {nextXP > xp && <span className="text-text-placeholder"> · Tomorrow: +{nextXP} XP</span>}
                </div>
              </div>
            </div>
            <HUDButton size="sm" onClick={claimBonus}>
              Claim +{xp} XP
            </HUDButton>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
