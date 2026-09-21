import React from 'react';
import { TopCharts } from './TopCharts';
import { OverallStats } from './OverallStats';
import { WeekStrip } from './WeekStrip';
export const HomeView: React.FC = () => {
  return (
    <div className="absolute inset-0 flex flex-col bg-surface overflow-hidden transition-colors duration-200">
      {/* Analytics (Scrollable on mobile, fixed/scrollable on desktop) */}
      <div className="w-full flex-1 min-h-0 flex flex-col overflow-y-auto custom-scrollbar p-3 md:p-4 lg:p-5 gap-3 md:gap-4">
        <WeekStrip />
        <OverallStats />
        <TopCharts />
      </div>
    </div>
  );
};
