'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CheckSquare, BarChart3, Target, Settings, ChevronLeft, ChevronRight, Timer } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { motion, AnimatePresence } from 'framer-motion';

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/quests', label: 'Tasks', icon: CheckSquare },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/focus', label: 'Focus', icon: Timer },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const open = useStore((s) => s.sidebarOpen);
  const setOpen = useStore((s) => s.setSidebarOpen);

  return (
    <motion.aside initial={false} animate={{ width: open ? 220 : 60 }} transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="hidden md:flex flex-col border-r border-border bg-[rgba(0,0,0,0.4)] flex-shrink-0 h-full">
      <div className="flex-1 py-3">
        <nav className="flex flex-col gap-0.5 px-2">
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm group ${
                  active
                    ? 'text-accent font-medium'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}>
                {active && (
                  <motion.div layoutId="sidebar-active" className="absolute inset-0 rounded-xl bg-accent-dim border border-accent/10"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }} />
                )}
                <Icon size={18} className={`flex-shrink-0 relative z-10 transition-transform group-hover:scale-110 ${active ? 'drop-shadow-[0_0_6px_rgba(200,200,200,0.4)]' : ''}`} />
                <AnimatePresence>
                  {open && (
                    <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }} className="whitespace-nowrap overflow-hidden relative z-10">
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}
        </nav>
      </div>
      <button onClick={() => setOpen(!open)}
        className="flex items-center justify-center py-3 border-t border-border text-text-placeholder hover:text-text-secondary transition-colors cursor-pointer">
        {open ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
    </motion.aside>
  );
}
