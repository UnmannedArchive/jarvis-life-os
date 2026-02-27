'use client';

import { useStore } from '@/stores/useStore';
import HUDClock from '@/components/hud/HUDClock';
import { getLevelFromXP } from '@/lib/xp';
import { Hexagon, Menu, Command } from 'lucide-react';

export default function Navbar() {
  const user = useStore((s) => s.user);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const level = user ? getLevelFromXP(user.total_xp) : 1;

  return (
    <header className="h-14 border-b border-border bg-[rgba(0,0,0,0.9)] backdrop-blur-xl flex items-center justify-between px-4 z-50 relative">
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-accent/10 to-transparent" />
      <div className="flex items-center gap-3">
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden text-text-tertiary hover:text-text-primary transition-colors cursor-pointer">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-purple flex items-center justify-center shadow-[0_0_16px_rgba(200,200,200,0.25)]">
            <Hexagon size={13} className="text-white" />
          </div>
          <span className="text-sm font-bold text-text-primary hidden sm:block tracking-tight">Life OS</span>
        </div>
      </div>
      <HUDClock />
      <div className="flex items-center gap-3">
        <kbd className="hidden md:flex items-center gap-1 px-2 py-1 rounded-lg bg-bg-elevated border border-border text-[10px] text-text-placeholder font-mono">
          <Command size={10} />K
        </kbd>
        {user && (
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-text-primary">{user.display_name}</div>
              <div className="text-[11px] text-text-tertiary">Lv. {level} · {user.character_class}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-purple/20 border border-accent/20 text-accent flex items-center justify-center text-xs font-bold">
              {user.display_name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
