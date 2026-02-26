'use client';

import WelcomeBriefing from '@/components/dashboard/WelcomeBriefing';
import PriorityQueue from '@/components/dashboard/PriorityQueue';
import LifeBalanceRadar from '@/components/dashboard/LifeBalanceRadar';
import CharacterStatus from '@/components/dashboard/CharacterStatus';
import SystemStatus from '@/components/dashboard/SystemStatus';

export default function DashboardPage() {
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <WelcomeBriefing />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2">
          <PriorityQueue />
        </div>
        <div className="flex flex-col gap-4">
          <LifeBalanceRadar />
          <CharacterStatus />
        </div>
      </div>
      <SystemStatus />
    </div>
  );
}
