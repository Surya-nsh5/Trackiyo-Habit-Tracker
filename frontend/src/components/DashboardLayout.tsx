import React, { useState, Suspense, lazy } from 'react';
import { MonthTabs } from './MonthTabs';
import { SettingsPage } from './SettingsPage';
import { HabitLoader } from './HabitLoader';
import { ViewErrorBoundary } from './ViewErrorBoundary';

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
    <div className="flex flex-col h-dvh overflow-hidden bg-background text-muted font-sans text-sm transition-colors duration-200">
      
      {/* ----------------------------------------------------- */}
      {/* DESKTOP TOP NAVIGATION */}
      {/* ----------------------------------------------------- */}
      <nav className="hidden lg:flex items-center gap-2 h-16 px-4 lg:px-6 border-b border-border/60 bg-surface flex-shrink-0 transition-colors duration-200 z-20">
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-8 h-8 rounded bg-accent flex items-center justify-center flex-shrink-0 transition-colors duration-200">
            <span className="text-accent-ink text-xl font-bold font-sans leading-none pt-0.5">T</span>
          </div>
          <h1 className="hidden xl:block text-xl font-bold tracking-[0.18em] text-foreground">TRACKIYO</h1>
        </div>

        <div className="flex-1 min-w-0 self-stretch overflow-x-auto flex">
          <div className="m-auto flex items-center gap-1 lg:gap-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setShowSettingsPage(false); }}
              className={`relative shrink-0 flex items-center gap-2 px-2 lg:px-4 h-16 min-h-[44px] text-[11px] font-semibold tracking-[0.14em] uppercase transition-colors duration-200 ${
                !showSettingsPage && activeTab === item.id 
                  ? 'text-accent' 
                  : 'text-muted hover:text-foreground'
              }`}
              title={item.label}
            >
              <item.icon size={18} className="flex-shrink-0" />
              <span className="hidden lg:block">{item.label}</span>
              {!showSettingsPage && activeTab === item.id && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent"></div>
              )}
            </button>
          ))}
          <button
            onClick={() => setShowSettingsPage(true)}
            className={`relative flex items-center gap-2 px-3 lg:px-4 h-16 min-h-[44px] text-[11px] font-semibold tracking-[0.14em] uppercase transition-colors duration-200 ${
              showSettingsPage
                ? 'text-accent'
                : 'text-muted hover:text-foreground'
            }`}
            title="Settings"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-6 h-6 rounded-full object-cover border border-border flex-shrink-0" />
            ) : (
              <FiSettings size={18} className="flex-shrink-0" />
            )}
            <span className="hidden lg:block">Settings</span>
            {showSettingsPage && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent"></div>
            )}
          </button>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={handlePrevYear} aria-label="Previous Year" className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted hover:text-accent rounded transition-colors duration-200">
            <FiChevronLeft size={16} />
          </button>
          <div className="flex flex-col items-center justify-center min-w-[64px]">
            <span className="text-xs font-bold tracking-[0.08em] leading-none text-foreground tabular-nums">{currentYear}</span>
            <span className="text-[9px] text-muted uppercase tracking-[0.16em] mt-1 leading-none">
              {formatMonthDisplay(currentMonthId).split(' ')[0]}
            </span>
          </div>
          <button onClick={handleNextYear} aria-label="Next Year" className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted hover:text-accent rounded transition-colors duration-200">
            <FiChevronRight size={16} />
          </button>
        </div>
      </nav>

      {/* ----------------------------------------------------- */}
      {/* MAIN CONTENT AREA */}
      {/* ----------------------------------------------------- */}
      <main className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        
        {/* TOP HEADER (Mobile only) */}
        <header className="h-14 flex lg:hidden flex-shrink-0 items-center justify-between gap-2 px-3 sm:px-4 bg-surface border-b border-border/60 z-10 transition-colors duration-200">
          
          {/* Mobile Logo */}
          <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
             <div className="w-8 h-8 rounded bg-accent flex items-center justify-center shrink-0">
              <span className="text-accent-ink text-xl font-bold font-sans leading-none pt-0.5">T</span>
            </div>
            <h1 className="hidden min-[380px]:block text-lg font-bold tracking-[0.18em] text-foreground truncate">TRACKIYO</h1>
          </div>

          {/* Month Switcher */}
          <div className="flex items-center gap-1 md:gap-2 bg-elevated px-1 py-1 rounded border border-border/60 ml-auto">
            <button onClick={handlePrevYear} aria-label="Previous Year" className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted hover:text-accent rounded transition-colors duration-200 hover:bg-elevated">
              <FiChevronLeft size={16} />
            </button>
            <div className="flex flex-col items-center justify-center min-w-[64px] md:min-w-[80px]">
              <span className="text-xs md:text-sm font-bold tracking-[0.08em] leading-none text-foreground tabular-nums">{currentYear}</span>
              <span className="text-[9px] md:text-[10px] text-muted uppercase tracking-[0.16em] mt-1 md:mt-1.5 leading-none">
                {formatMonthDisplay(currentMonthId).split(' ')[0]}
              </span>
            </div>
            <button onClick={handleNextYear} aria-label="Next Year" className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-muted hover:text-accent rounded transition-colors duration-200 hover:bg-elevated">
              <FiChevronRight size={16} />
            </button>
          </div>
        </header>

        {/* CONTENT VIEW */}
        <div className="flex-1 min-h-0 bg-background relative transition-colors duration-200 max-w-[1680px] w-full mx-auto">
          {showSettingsPage ? (
            <SettingsPage />
          ) : (
            <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center"><div role="status" aria-label="Loading"><HabitLoader size="sm" label="Loading" /></div></div>}>
              <ViewErrorBoundary key={showSettingsPage ? 'settings' : activeTab}>
              {activeTab === 'HOME' && <HomeView />}
              
              {activeTab === 'TASKS' && (
                <div className="absolute inset-0 overflow-hidden">
                  <TasksView />
                </div>
              )}
              
              {activeTab === 'GRID' && (
                <div className="absolute inset-0 p-2 sm:p-3 lg:p-4 overflow-hidden flex flex-col">
                  <div className="flex-1 min-h-0 bg-surface border border-border/70 rounded-md overflow-hidden relative transition-colors duration-200">
                    <HabitGrid />
                  </div>
                  <div className="mt-2 sm:mt-3 flex-shrink-0">
                    <MonthTabs />
                  </div>
                </div>
              )}
              
              {activeTab === 'WELLNESS' && (
                <div className="absolute inset-0 p-2 sm:p-3 lg:p-4 overflow-hidden flex flex-col">
                  <div className="flex-1 min-h-0 relative overflow-hidden transition-colors duration-200">
                    <WellnessTracker />
                  </div>
                  <div className="mt-2 sm:mt-3 flex-shrink-0">
                    <MonthTabs />
                  </div>
                </div>
              )}
            </ViewErrorBoundary>
            </Suspense>
          )}
        </div>

      </main>

      {/* ----------------------------------------------------- */}
      {/* MOBILE BOTTOM NAVIGATION */}
      {/* ----------------------------------------------------- */}
      <nav aria-label="Primary" className="lg:hidden flex-shrink-0 h-[68px] bg-surface border-t border-border/60 flex items-stretch justify-center px-2 z-20 relative transition-colors duration-200">
        <div className="flex items-stretch justify-around w-full max-w-xl">
         {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setShowSettingsPage(false); }}
              className={`flex flex-col items-center justify-center gap-1 w-[72px] min-h-[44px] h-full transition-colors duration-200 relative ${
                !showSettingsPage && activeTab === item.id 
                  ? 'text-accent' 
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <div className={`p-1.5 rounded transition-colors duration-200 ${!showSettingsPage && activeTab === item.id ? 'bg-accent text-accent-ink -translate-y-1' : 'bg-transparent'}`}>
                <item.icon size={20} />
              </div>
              <span className={`text-[9px] font-bold tracking-wider uppercase transition-all ${!showSettingsPage && activeTab === item.id ? 'opacity-100 translate-y-0' : 'opacity-70 translate-y-1'}`}>{item.label}</span>
              
              {!showSettingsPage && activeTab === item.id && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-accent rounded-b-full"></div>
              )}
            </button>
          ))}
          <button
              onClick={() => setShowSettingsPage(true)}
              className={`flex flex-col items-center justify-center gap-1 w-[72px] min-h-[44px] h-full transition-colors duration-200 relative ${
                showSettingsPage ? 'text-accent' : 'text-muted hover:text-foreground'
              }`}
            >
              <div className={`p-1.5 rounded transition-colors duration-200 ${showSettingsPage ? 'bg-accent text-accent-ink -translate-y-1' : 'bg-transparent'}`}>
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <FiSettings size={20} />
                )}
              </div>
              <span className={`text-[9px] font-bold tracking-wider uppercase transition-all ${showSettingsPage ? 'opacity-100 translate-y-0' : 'opacity-70 translate-y-1'}`}>Settings</span>
              
              {showSettingsPage && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-accent rounded-b-full"></div>
              )}
          </button>
        </div>
      </nav>

    </div>
  );
};
