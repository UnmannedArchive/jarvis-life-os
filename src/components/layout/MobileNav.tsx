'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CheckSquare, CalendarDays, Lightbulb, BarChart3, Timer, Settings, Activity } from 'lucide-react';
import { useStore } from '@/stores/useStore';

const items = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/quests', label: 'Tasks', icon: CheckSquare },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/ideas', label: 'Ideas', icon: Lightbulb },
  { href: '/focus', label: 'Focus', icon: Timer },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/workflow', label: 'Workflow', icon: Activity },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();
  const workflowEnabled = useStore((s) => s.workflowEnabled);
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-[rgba(0,0,0,0.95)] backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/10 to-transparent" />
      <div className="flex items-center justify-around py-1.5">
        {items.filter((item) => item.href !== '/workflow' || workflowEnabled).map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                active ? 'text-accent drop-shadow-[0_0_8px_rgba(200,200,200,0.35)]' : 'text-text-placeholder'
              }`}>
              <Icon size={18} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
