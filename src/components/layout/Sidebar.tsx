'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Swords, BarChart3, Target, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/quests', label: 'Quests', icon: Swords },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 200 : 56 }}
      transition={{ duration: 0.2 }}
      className="hidden md:flex flex-col border-r border-hud-border bg-hud-bg/50 backdrop-blur-sm flex-shrink-0 h-full"
    >
      <div className="flex-1 py-4">
        <nav className="flex flex-col gap-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 transition-all duration-200 group
                  ${isActive
                    ? 'bg-hud-green/10 border border-hud-green/30 text-hud-green'
                    : 'border border-transparent text-hud-text-muted hover:text-hud-green hover:bg-hud-green/5'}
                `}
                style={isActive ? { boxShadow: 'inset 0 0 10px rgba(0,255,136,0.1)' } : {}}
              >
                <Icon size={16} className={isActive ? 'text-hud-green' : 'group-hover:text-hud-green'} />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-[11px] font-[family-name:var(--font-orbitron)] tracking-[2px] uppercase whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>
      </div>

      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="flex items-center justify-center py-3 border-t border-hud-border text-hud-text-muted hover:text-hud-green transition-colors cursor-pointer"
      >
        {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>
    </motion.aside>
  );
}
