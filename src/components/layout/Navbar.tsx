'use client';

import { useStore } from '@/stores/useStore';
import HUDClock from '@/components/hud/HUDClock';
import { getLevelFromXP } from '@/lib/xp';
import { Hexagon, Menu } from 'lucide-react';

export default function Navbar() {
  const user = useStore((s) => s.user);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const level = user ? getLevelFromXP(user.total_xp) : 1;

  return (
    <header className="h-12 border-b border-hud-border bg-hud-bg/80 backdrop-blur-sm flex items-center justify-between px-4 z-50 relative">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden text-hud-green hover:text-hud-green/80 transition-colors cursor-pointer"
        >
          <Menu size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Hexagon size={20} className="text-hud-green" style={{ filter: 'drop-shadow(0 0 6px rgba(0,255,136,0.5))' }} />
          <span className="font-[family-name:var(--font-orbitron)] text-[13px] tracking-[4px] text-hud-green glow-text hidden sm:block">
            JARVIS
          </span>
          <span className="text-hud-text-dim text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] hidden lg:block">
            LIFE OS v1.0
          </span>
        </div>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <HUDClock />
      </div>

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-[family-name:var(--font-orbitron)] tracking-[2px] text-hud-text-muted uppercase">
                {user.display_name}
              </div>
              <div className="text-[9px] font-[family-name:var(--font-orbitron)] tracking-[1px] text-hud-green">
                LVL {level} • {user.character_class}
              </div>
            </div>
            <div
              className="w-8 h-8 border border-hud-green/30 bg-hud-green/10 flex items-center justify-center"
              style={{ boxShadow: '0 0 10px rgba(0,255,136,0.1)' }}
            >
              <span className="font-[family-name:var(--font-orbitron)] text-hud-green text-[11px]">
                {user.display_name.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
