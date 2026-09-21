import React, { useState, Suspense, lazy } from 'react';
import { MonthTabs } from './MonthTabs';
import { SettingsPage } from './SettingsPage';

const HomeView = lazy(() => import('./HomeView').then(module => ({ default: module.HomeView })));
const TasksView = lazy(() => import('./TasksView').then(module => ({ default: module.TasksView })));
const HabitGrid = lazy(() => import('./HabitGrid').then(module => ({ default: module.HabitGrid })));
const WellnessTracker = lazy(() => import('./WellnessTracker').then(module => ({ default: module.WellnessTracker })));
import { useHabitStore } from '../store/useHabitStore';
import { useAuthStore } from '../store/useAuthStore';
import { useTaskStore } from '../store/useTaskStore';

import { formatMonthDisplay } from '../utils/dateUtils';
import { FiChevronLeft, FiChevronRight, FiHome, FiGrid, FiActivity, FiSettings, FiCheckSquare } from 'react-icons/fi';

type Tab = 'HOME' | 'TASKS' | 'GRID' | 'WELLNESS';

export const DashboardLayout: React.FC = () => {
  const { currentMonthId, setCurrentMonth, loadData, setupRealtime: setupHabitRealtime, cleanupRealtime: cleanupHabitRealtime } = useHabitStore();
  const { fetchTasks, setupRealtime: setupTaskRealtime, cleanupRealtime: cleanupTaskRealtime } = useTaskStore();
  
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('HOME');
  const [showSettingsPage, setShowSettingsPage] = useState(false);
  
  // Initial Data Load
  React.useEffect(() => {
    loadData();
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setup Realtime
  React.useEffect(() => {
    if (user?.id) {
      setupTaskRealtime(user.id);
      setupHabitRealtime(user.id);
      
      return () => {
        cleanupTaskRealtime();
        cleanupHabitRealtime();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  const currentYear = parseInt(currentMonthId.split('-')[0]);
  const currentMonthNum = currentMonthId.split('-')[1];

  const handlePrevYear = () => setCurrentMonth(`${currentYear - 1}-${currentMonthNum}`);
  const handleNextYear = () => setCurrentMonth(`${currentYear + 1}-${currentMonthNum}`);

  const navItems = [
    { id: 'HOME', icon: FiHome, label: 'Dashboard' },
    { id: 'TASKS', icon: FiCheckSquare, label: 'Tasks' },
    { id: 'GRID', icon: FiGrid, label: 'Habits' },
    { id: 'WELLNESS', icon: FiActivity, label: 'Wellness' },
  ] as const;

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-zinc-50 dark:bg-black text-zinc-600 dark:text-zinc-300 font-sans text-sm transition-colors duration-300">
      
      {/* ----------------------------------------------------- */}
      {/* DESKTOP SIDEBAR */}
      {/* ----------------------------------------------------- */}
      <aside className="hidden md:flex flex-col w-20 lg:w-64 border-r border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-[#0a0a0a] flex-shrink-0 transition-all z-20 shadow-2xl">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-zinc-200 dark:border-zinc-800/50">
          <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center shadow-[0_0_15px_rgba(0,0,0,0.1)] dark:shadow-[0_0_15px_rgba(255,255,255,0.2)] flex-shrink-0">
            <span className="text-white dark:text-black text-xl font-black font-sans leading-none pt-0.5">T</span>
          </div>
          <h1 className="hidden lg:block text-xl font-black tracking-widest text-zinc-900 dark:text-white ml-3">TRACKIYO</h1>
        </div>

        <nav className="flex-1 flex flex-col gap-2 py-6 px-3 lg:px-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setShowSettingsPage(false); }}
              className={`flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl transition-all ${
                !showSettingsPage && activeTab === item.id 
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900/50'
              }`}
              title={item.label}
            >
              <item.icon size={20} className="flex-shrink-0" />
              <span className="hidden lg:block font-bold tracking-widest text-[10px] uppercase">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 lg:p-4 border-t border-zinc-200 dark:border-zinc-800/50 flex flex-col gap-2">
           <button
             onClick={() => setShowSettingsPage(true)}
             className={`flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl transition-all ${
               showSettingsPage 
                 ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm' 
                 : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900/50'
             }`}
             title="Settings"
           >
             {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-6 h-6 rounded-full object-cover border border-zinc-300 dark:border-zinc-600 flex-shrink-0" />
              ) : (
                <FiSettings size={20} className="flex-shrink-0" />
              )}
             <span className="hidden lg:block font-bold tracking-widest text-[10px] uppercase truncate w-full text-left">
               {user?.name || 'Settings'}
             </span>
           </button>
        </div>
      </aside>

      {/* ----------------------------------------------------- */}
      {/* MAIN CONTENT AREA */}
      {/* ----------------------------------------------------- */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* TOP HEADER (Mobile & Desktop) */}
        <header className="h-14 md:h-16 flex-shrink-0 flex items-center justify-between px-4 md:px-6 bg-white dark:bg-[#0a0a0a] border-b border-zinc-200 dark:border-zinc-800/50 z-10 shadow-sm transition-colors duration-300">
          
          {/* Mobile Logo */}
          <div className="flex md:hidden items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_10px_rgba(255,255,255,0.1)]">
              <span className="text-white dark:text-black text-xl font-black font-sans leading-none pt-0.5">T</span>
            </div>
            <h1 className="text-lg font-black tracking-widest text-zinc-900 dark:text-white">TRACKIYO</h1>
          </div>

          {/* Page Title (Desktop) */}
          <div className="hidden md:flex items-center">
            <h2 className="text-sm font-black tracking-widest text-zinc-600 dark:text-zinc-300 uppercase bg-zinc-100 dark:bg-zinc-900/50 px-4 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800/50">
               {showSettingsPage ? 'Settings' : navItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>

          {/* Month Switcher (Right aligned) */}
          <div className="flex items-center gap-1 md:gap-2 bg-zinc-50 dark:bg-black px-1 py-1 rounded-xl border border-zinc-200 dark:border-zinc-800/50 ml-auto shadow-sm">
            <button onClick={handlePrevYear} aria-label="Previous Year" className="p-1 md:p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-900">
              <FiChevronLeft size={16} />
            </button>
            <div className="flex flex-col items-center justify-center min-w-[64px] md:min-w-[80px]">
              <span className="text-xs md:text-sm font-black tracking-widest leading-none text-zinc-900 dark:text-white">{currentYear}</span>
              <span className="text-[8px] md:text-[10px] text-zinc-500 uppercase tracking-widest mt-1 md:mt-1.5 leading-none">
                {formatMonthDisplay(currentMonthId).split(' ')[0]}
              </span>
            </div>
            <button onClick={handleNextYear} aria-label="Next Year" className="p-1 md:p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors hover:bg-zinc-200 dark:hover:bg-zinc-900">
              <FiChevronRight size={16} />
            </button>
          </div>
        </header>

        {/* CONTENT VIEW */}
        <div className="flex-1 min-h-0 bg-zinc-50 dark:bg-black relative transition-colors duration-300">
          {showSettingsPage ? (
            <SettingsPage />
          ) : (
            <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-zinc-500 font-bold tracking-widest text-xs">LOADING...</div>}>
              {activeTab === 'HOME' && <HomeView />}
              
              {activeTab === 'TASKS' && (
                <div className="absolute inset-0 p-4 lg:p-6 overflow-hidden">
                  <TasksView />
                </div>
              )}
              
              {activeTab === 'GRID' && (
                <div className="absolute inset-0 p-2 sm:p-4 lg:p-6 overflow-hidden flex flex-col">
                  <div className="flex-1 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800/50 rounded-2xl overflow-hidden shadow-lg relative transition-colors duration-300">
                    <HabitGrid />
                  </div>
                  <div className="mt-2 sm:mt-4 flex-shrink-0">
                    <MonthTabs />
                  </div>
                </div>
              )}
              
              {activeTab === 'WELLNESS' && (
                <div className="absolute inset-0 p-2 sm:p-4 lg:p-6 overflow-hidden flex flex-col">
                  <div className="flex-1 relative border border-zinc-200 dark:border-zinc-800/50 rounded-2xl overflow-hidden shadow-lg transition-colors duration-300">
                    <WellnessTracker />
                  </div>
                  <div className="mt-2 sm:mt-4 flex-shrink-0">
                    <MonthTabs />
                  </div>
                </div>
              )}
            </Suspense>
          )}
        </div>

      </main>

      {/* ----------------------------------------------------- */}
      {/* MOBILE BOTTOM NAVIGATION */}
      {/* ----------------------------------------------------- */}
      <nav className="md:hidden flex-shrink-0 h-[68px] bg-white dark:bg-[#0a0a0a] border-t border-zinc-200 dark:border-zinc-800/80 flex items-center justify-around px-2 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_20px_rgba(0,0,0,0.5)] relative transition-colors duration-300">
         {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setShowSettingsPage(false); }}
              className={`flex flex-col items-center justify-center gap-1 w-[72px] h-full transition-all relative ${
                !showSettingsPage && activeTab === item.id 
                  ? 'text-zinc-900 dark:text-white' 
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              <div className={`p-1.5 rounded-full transition-all duration-300 ${!showSettingsPage && activeTab === item.id ? 'bg-zinc-100 dark:bg-zinc-800/80 -translate-y-1' : 'bg-transparent'}`}>
                <item.icon size={20} />
              </div>
              <span className={`text-[9px] font-bold tracking-wider uppercase transition-all ${!showSettingsPage && activeTab === item.id ? 'opacity-100 translate-y-0' : 'opacity-70 translate-y-1'}`}>{item.label}</span>
              
              {!showSettingsPage && activeTab === item.id && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-zinc-900 dark:bg-white rounded-b-full shadow-none dark:shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
              )}
            </button>
          ))}
          <button
              onClick={() => setShowSettingsPage(true)}
              className={`flex flex-col items-center justify-center gap-1 w-[72px] h-full transition-all relative ${
                showSettingsPage ? 'text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              <div className={`p-1.5 rounded-full transition-all duration-300 ${showSettingsPage ? 'bg-zinc-100 dark:bg-zinc-800/80 -translate-y-1' : 'bg-transparent'}`}>
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <FiSettings size={20} />
                )}
              </div>
              <span className={`text-[9px] font-bold tracking-wider uppercase transition-all ${showSettingsPage ? 'opacity-100 translate-y-0' : 'opacity-70 translate-y-1'}`}>Settings</span>
              
              {showSettingsPage && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-zinc-900 dark:bg-white rounded-b-full shadow-none dark:shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>
              )}
          </button>
      </nav>

    </div>
  );
};
