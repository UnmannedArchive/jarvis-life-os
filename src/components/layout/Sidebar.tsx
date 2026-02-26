'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CheckSquare, BarChart3, Target, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '@/stores/useStore';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/quests', label: 'Tasks', icon: CheckSquare },
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
      animate={{ width: sidebarOpen ? 220 : 60 }}
      transition={{ duration: 0.2 }}
      className="hidden md:flex flex-col border-r border-border bg-bg-secondary/50 flex-shrink-0 h-full"
    >
      <div className="flex-1 py-3">
        <nav className="flex flex-col gap-0.5 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-sm ${
                  isActive
                    ? 'bg-accent-light text-accent font-medium'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                }`}
              >
                <Icon size={18} className="flex-shrink-0" />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="whitespace-nowrap overflow-hidden"
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
        className="flex items-center justify-center py-3 border-t border-border text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
      >
        {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
      </button>
    </motion.aside>
  );
}
