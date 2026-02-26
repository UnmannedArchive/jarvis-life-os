'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CheckSquare, BarChart3, Target, Settings } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/quests', label: 'Tasks', icon: CheckSquare },
  { href: '/analytics', label: 'Stats', icon: BarChart3 },
  { href: '/goals', label: 'Goals', icon: Target },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white safe-area-bottom">
      <div className="flex items-center justify-around py-1.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                isActive ? 'text-accent' : 'text-text-tertiary'
              }`}
            >
              <Icon size={18} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
