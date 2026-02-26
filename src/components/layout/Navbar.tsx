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
    <header className="h-14 border-b border-border bg-white flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="md:hidden text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
        >
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
            <Hexagon size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-text-primary hidden sm:block">Life OS</span>
        </div>
      </div>

      <HUDClock />

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2.5">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-text-primary">{user.display_name}</div>
              <div className="text-[11px] text-text-tertiary">Lv. {level} · {user.character_class}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-accent-light text-accent flex items-center justify-center text-sm font-semibold">
              {user.display_name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
