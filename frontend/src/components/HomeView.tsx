import React from 'react';
import { TopCharts } from './TopCharts';
import { OverallStats } from './OverallStats';
export const HomeView: React.FC = () => {
  return (
    <div className="absolute inset-0 flex flex-col bg-zinc-50 dark:bg-[#0a0a0a] overflow-hidden transition-colors duration-300">
      {/* Analytics (Scrollable on mobile, fixed/scrollable on desktop) */}
      <div className="w-full flex-1 flex flex-col overflow-y-auto custom-scrollbar p-4 lg:p-6 gap-6">
        <OverallStats />
        <TopCharts />
      </div>
    </div>
  );
};
