import React, { useState, Suspense, lazy, useEffect, useRef } from 'react';
import { ViewErrorBoundary } from './ViewErrorBoundary';
import { NotificationCenter } from '@/components/common/NotificationCenter';
import { TrackiyoLogo } from './TrackiyoLogo';

import { HomeView } from '@/components/dashboard/HomeView';
import { HabitsView } from '@/components/habits/HabitsView';
import { TasksView } from '@/components/tasks/TasksView';
import { FocusView } from '@/components/focus/FocusView';
import { WellnessTracker } from '@/components/wellness/WellnessTracker';
import { AnalyticsView } from '@/components/insights/AnalyticsView';

import { useHabitStore } from '@/store/useHabitStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useTaskStore } from '@/store/useTaskStore';
import { useJournalStore } from '@/store/useJournalStore';
import { useFocusStore } from '@/store/useFocusStore';
import { useGamificationStore } from '@/store/useGamificationStore';

import {
  FiHome, FiCheckCircle, FiCheckSquare, FiClock,
  FiActivity, FiBarChart2, FiSettings, FiSearch,
  FiZap, FiMoreHorizontal, FiX, FiUsers
} from 'react-icons/fi';

import { FriendsView } from '@/components/social/FriendsView';
import { SettingsPage } from '@/components/settings/SettingsPage';
const SearchModal = lazy(() => import('@/components/common/SearchModal').then(m => ({ default: m.SearchModal })));
const AIAssistantDrawer = lazy(() => import('@/components/shared/AIAssistantDrawer').then(m => ({ default: m.AIAssistantDrawer })));
const CommandPalette = lazy(() => import('@/components/common/CommandPalette').then(m => ({ default: m.CommandPalette })));
const DeepWorkMode = lazy(() => import('@/components/focus/DeepWorkMode').then(m => ({ default: m.DeepWorkMode })));

import { useOverlayClose, pushOverlayCloser } from '@/utils/overlayStack';

export type MainViewId = 'TODAY' | 'HABITS' | 'TASKS' | 'FOCUS' | 'WELLNESS' | 'INSIGHTS' | 'SETTINGS' | 'CONNECT';

export interface NavItem {
  id: MainViewId;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { id: 'TODAY', label: 'Today', icon: FiHome },
  { id: 'HABITS', label: 'Habits', icon: FiCheckCircle },
  { id: 'TASKS', label: 'Tasks', icon: FiCheckSquare },
  { id: 'FOCUS', label: 'Focus', icon: FiClock },
  { id: 'WELLNESS', label: 'Wellness', icon: FiActivity },
  { id: 'INSIGHTS', label: 'Insights', icon: FiBarChart2 },
];

export const DashboardLayout: React.FC = () => {
  const { loadData, setupRealtime: setupHabitRealtime, cleanupRealtime: cleanupHabitRealtime } = useHabitStore();
  const { fetchTasks, setupRealtime: setupTaskRealtime, cleanupRealtime: cleanupTaskRealtime } = useTaskStore();
  const { fetchEntries } = useJournalStore();
  const { fetchTodayStats } = useFocusStore();
  const { fetchGamification } = useGamificationStore();

  const { user } = useAuthStore();

  // Active Main View (Product Hierarchy)
  const [activeView, setActiveView] = useState<MainViewId>('TODAY');

  // Mobile More Drawer
  const [isMobileMoreOpen, setIsMobileMoreOpen] = useState(false);

  // Modals
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isDeepWorkActive, setIsDeepWorkActive] = useState(false);

  // Back button handling: dismiss modals/drawers first
  useOverlayClose(isMobileMoreOpen, () => setIsMobileMoreOpen(false));
  useOverlayClose(isSearchOpen, () => setIsSearchOpen(false));
  useOverlayClose(isAIOpen, () => setIsAIOpen(false));
  useOverlayClose(isCommandPaletteOpen, () => setIsCommandPaletteOpen(false));

  // Back button handling: if nested tab is active, return to TODAY before exiting
  useEffect(() => {
    if (activeView !== 'TODAY') {
      return pushOverlayCloser(() => setActiveView('TODAY'));
    }
  }, [activeView]);

  // Initial Data Load (strictly once on mount)
  const isInitialLoaded = useRef(false);
  useEffect(() => {
    if (isInitialLoaded.current) return;
    isInitialLoaded.current = true;
    loadData();
    fetchTasks();
    fetchEntries();
    fetchTodayStats();
    fetchGamification();
  }, [loadData, fetchTasks, fetchEntries, fetchTodayStats, fetchGamification]);

  // Backward-compatible navigation handler for child events and shortcuts
  const navigateToTab = (target: string) => {
    const t = target.toUpperCase();
    if (t === 'PROFILE' || t === 'SETTINGS') {
      setActiveView('SETTINGS');
      return;
    }

    if (['HOME', 'OVERVIEW', 'TODAY'].includes(t)) {
      setActiveView('TODAY');
    } else if (['HABITS', 'GRID', 'CONSISTENCY', 'ROUTINES'].includes(t)) {
      setActiveView('HABITS');
    } else if (['TASKS', 'WORK', 'PLANNER', 'CALENDAR'].includes(t)) {
      setActiveView('TASKS');
    } else if (t === 'FOCUS') {
      setActiveView('FOCUS');
    } else if (t === 'WELLNESS' || t === 'JOURNAL') {
      setActiveView('WELLNESS');
    } else if (['ANALYTICS', 'REVIEW', 'INSIGHTS'].includes(t)) {
      setActiveView('INSIGHTS');
    } else if (['FRIENDS', 'CHALLENGES', 'CONNECT'].includes(t)) {
      setActiveView('CONNECT');
    }
  };

  // Listen for child-component navigation events
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent<{ tab: string }>).detail?.tab;
      if (tab) navigateToTab(tab);
    };
    window.addEventListener('trackiyo:navigate', handler);
    return () => {
      window.removeEventListener('trackiyo:navigate', handler);
    };
  }, []);

  // Setup Realtime
  useEffect(() => {
    if (user?.id) {
      setupTaskRealtime(user.id);
      setupHabitRealtime(user.id);

      return () => {
        cleanupTaskRealtime();
        cleanupHabitRealtime();
      };
    }
  }, [user?.id, setupTaskRealtime, setupHabitRealtime, cleanupTaskRealtime, cleanupHabitRealtime]);

  // Global keyboard shortcuts (Ctrl+/ -> Search, Ctrl+I -> AI)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        setIsSearchOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setIsAIOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-dvh overflow-hidden bg-background text-foreground font-sans transition-colors duration-200">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* ----------------------------------------------------- */}
      {/* 1. DESKTOP COMPACT HORIZONTAL TOP NAVIGATION          */}
      {/* ----------------------------------------------------- */}
      <header className="hidden md:flex items-center justify-between gap-2 h-14 px-4 lg:px-6 bg-navbar border-b border-border/70 z-40 flex-shrink-0 transition-colors select-none min-w-0 max-w-full">
        {/* Left: Brand + 7 Primary Navigation Tabs */}
        <div className="flex items-center gap-6 lg:gap-7 min-w-0 flex-1">
          {/* Logo */}
          <div
            onClick={() => setActiveView('TODAY')}
            className="flex items-center gap-2.5 cursor-pointer shrink-0 group"
            title="Trackiyo"
          >
            <TrackiyoLogo size={32} variant="accent" className="group-hover:scale-105 transition-transform" />
            <span className="font-bold text-sm tracking-[0.14em] text-foreground uppercase truncate hidden lg:inline">
              TRACKIYO
            </span>
          </div>

          {/* Compact Horizontal Navigation */}
          <nav aria-label="Primary Navigation" className="flex items-center gap-1 overflow-x-auto custom-scrollbar min-w-0 flex-1 max-w-full">
            {PRIMARY_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-accent text-accent-ink shadow-xs'
                      : 'text-secondary-text hover:text-foreground hover:bg-surface-secondary'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-accent-ink' : 'text-muted'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right utility controls */}
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          {/* Quick Search */}
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-secondary hover:bg-surface-hover border border-border-subtle text-secondary-text hover:text-foreground text-xs transition-colors cursor-pointer"
            title="Search & Commands (Ctrl+/)"
          >
            <FiSearch size={14} className="text-muted" />
            <span className="hidden xl:inline text-[11px] font-semibold">Search...</span>
            <kbd className="hidden xl:inline text-[9px] bg-surface px-1.5 py-0.5 rounded border border-border-subtle font-mono text-muted">
              ⌘/
            </kbd>
          </button>

          {/* AI Coach Trigger */}
          <button
            type="button"
            onClick={() => setIsAIOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-accent/30 bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            title="Trackiyo AI Coach (Ctrl+I)"
          >
            <FiZap size={14} className="text-accent" />
            <span className="hidden xl:inline text-[11px] font-bold">AI Coach</span>
          </button>

          {/* Connect (Friends/Challenges) Shortcut */}
          <button
            type="button"
            onClick={() => setActiveView('CONNECT')}
            className={`p-2 rounded-lg border border-border-subtle hover:border-border text-secondary-text hover:text-foreground transition-colors cursor-pointer ${
              activeView === 'CONNECT' ? 'bg-surface-secondary text-accent border-accent/40 font-bold' : ''
            }`}
            title="Friends & Challenges"
            aria-label="Friends & Challenges"
          >
            <FiUsers size={14} />
          </button>

          {/* Notification Center */}
          <NotificationCenter onNavigateTab={navigateToTab} />

          {/* Profile Pill */}
          <button
            type="button"
            onClick={() => setActiveView('SETTINGS')}
            className={`flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-lg border transition-colors cursor-pointer ${
              activeView === 'SETTINGS'
                ? 'bg-surface-secondary border-accent/40 text-foreground font-bold shadow-xs'
                : 'border-border-subtle hover:border-border text-secondary-text hover:text-foreground'
            }`}
            title="Profile & Settings"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-6 h-6 shrink-0 rounded-full object-cover border border-border" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-accent text-accent-ink flex items-center justify-center font-bold text-xs shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
            <span className="text-xs font-semibold max-w-[100px] truncate hidden sm:inline">
              {user?.name || 'Account'}
            </span>
          </button>
        </div>
      </header>

      {/* ----------------------------------------------------- */}
      {/* 2. MOBILE TOP HEADER (Clean, Compact)                 */}
      {/* ----------------------------------------------------- */}
      <header className="md:hidden flex items-center justify-between gap-2 h-13 px-4 bg-navbar border-b border-border/70 z-30 flex-shrink-0 min-w-0 pt-[env(safe-area-inset-top)]">
        <div
          onClick={() => setActiveView('TODAY')}
          className="flex items-center gap-2 cursor-pointer min-w-0 flex-shrink"
        >
          <TrackiyoLogo size={28} variant="accent" />
          <span className="font-bold text-xs tracking-wider text-foreground uppercase truncate">TRACKIYO</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-secondary-text hover:text-foreground hover:bg-surface-secondary transition-colors cursor-pointer"
            aria-label="Search"
          >
            <FiSearch size={18} />
          </button>

          <button
            type="button"
            onClick={() => setIsAIOpen(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-accent hover:text-accent-hover hover:bg-accent/10 transition-colors cursor-pointer"
            aria-label="AI Coach"
            title="AI Coach"
          >
            <FiZap size={18} />
          </button>

          <NotificationCenter onNavigateTab={navigateToTab} />

          <button
            type="button"
            onClick={() => setActiveView('SETTINGS')}
            className="w-8 h-8 rounded-full overflow-hidden bg-accent/20 text-accent font-bold text-xs flex items-center justify-center ml-1 border border-border-subtle cursor-pointer hover:ring-2 hover:ring-accent/30 transition-all"
            aria-label="Settings"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.name?.[0]?.toUpperCase() || 'U'
            )}
          </button>
        </div>
      </header>

      {/* ----------------------------------------------------- */}
      {/* 3. MAIN WORKSPACE VIEWPORT                            */}
      {/* On mobile the main content sits between header and    */}
      {/* bottom nav. flex-1 + min-h-0 ensures it fills the     */}
      {/* remaining space and allows inner overflow-y-auto to   */}
      {/* scroll independently of the nav.                      */}
      {/* ----------------------------------------------------- */}
      <main id="main-content" tabIndex={-1} className="flex-1 relative min-h-0 min-w-0 flex flex-col focus:outline-none overflow-hidden bg-background">
        <ViewErrorBoundary>
          {activeView === 'TODAY' && <HomeView />}
          {activeView === 'HABITS' && <HabitsView />}
          {activeView === 'TASKS' && <TasksView />}
          {activeView === 'FOCUS' && <FocusView />}
          {activeView === 'WELLNESS' && <WellnessTracker />}
          {activeView === 'INSIGHTS' && <AnalyticsView />}
          {activeView === 'SETTINGS' && <SettingsPage />}
          {activeView === 'CONNECT' && <FriendsView />}
        </ViewErrorBoundary>
      </main>

      {/* ----------------------------------------------------- */}
      {/* 4. MOBILE BOTTOM NAVIGATION (Touch-Friendly)          */}
      {/* Now a direct child of the root flex column so it      */}
      {/* never overlaps main content — the flexbox layout      */}
      {/* automatically gives main the correct remaining space. */}
      {/* ----------------------------------------------------- */}
      <nav aria-label="Mobile Navigation" className="md:hidden flex-shrink-0 bg-navbar/95 border-t border-border/70 flex items-stretch justify-center px-1 z-30 relative backdrop-blur-md box-border" style={{ minHeight: '58px', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-stretch justify-around w-full max-w-lg">
          {(
            [
              { id: 'TODAY', label: 'Today', Icon: FiHome },
              { id: 'HABITS', label: 'Habits', Icon: FiCheckCircle },
              { id: 'TASKS', label: 'Tasks', Icon: FiCheckSquare },
              { id: 'FOCUS', label: 'Focus', Icon: FiClock },
              { id: 'WELLNESS', label: 'Wellness', Icon: FiActivity },
            ] as const
          ).map(({ id, label, Icon }) => {
            const isActive = activeView === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveView(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[44px] h-full transition-colors relative ${
                  isActive ? 'text-accent font-bold' : 'text-muted hover:text-foreground'
                }`}
              >
                <Icon size={18} />
                <span className="text-[9px] uppercase tracking-wider font-semibold truncate max-w-full">{label}</span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-accent rounded-b-full" />
                )}
              </button>
            );
          })}

          {/* Mobile More Button */}
          <button
            type="button"
            onClick={() => setIsMobileMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 min-h-[44px] h-full transition-colors relative ${
              ['INSIGHTS', 'SETTINGS', 'CONNECT'].includes(activeView)
                ? 'text-accent font-bold'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <FiMoreHorizontal size={18} />
            <span className="text-[9px] uppercase tracking-wider font-semibold truncate max-w-full">More</span>
            {['INSIGHTS', 'SETTINGS', 'CONNECT'].includes(activeView) && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-accent rounded-b-full" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile More Sheet / Drawer */}
      {isMobileMoreOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setIsMobileMoreOpen(false)}
        >
          <div
            className="bg-surface border border-border/80 rounded-t-2xl sm:rounded-2xl w-full max-w-[min(24rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 shadow-2xl space-y-3 min-w-0"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-border-subtle min-w-0">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider min-w-0 flex-1 break-words">More Views & Actions</h3>
              <button
                type="button"
                onClick={() => setIsMobileMoreOpen(false)}
                className="p-1 text-muted hover:text-foreground rounded"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => { setActiveView('INSIGHTS'); setIsMobileMoreOpen(false); }}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-colors ${
                  activeView === 'INSIGHTS'
                    ? 'border-accent bg-accent/10 text-accent font-bold'
                    : 'border-border-subtle bg-surface-secondary text-foreground'
                }`}
              >
                <FiBarChart2 size={16} />
                <span className="text-xs font-semibold">Insights</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveView('CONNECT'); setIsMobileMoreOpen(false); }}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-colors ${
                  activeView === 'CONNECT'
                    ? 'border-accent bg-accent/10 text-accent font-bold'
                    : 'border-border-subtle bg-surface-secondary text-foreground'
                }`}
              >
                <FiUsers size={16} />
                <span className="text-xs font-semibold">Connect</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveView('SETTINGS'); setIsMobileMoreOpen(false); }}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-colors ${
                  activeView === 'SETTINGS'
                    ? 'border-accent bg-accent/10 text-accent font-bold'
                    : 'border-border-subtle bg-surface-secondary text-foreground'
                }`}
              >
                <FiSettings size={16} />
                <span className="text-xs font-semibold">Settings</span>
              </button>

              <button
                type="button"
                onClick={() => { setIsAIOpen(true); setIsMobileMoreOpen(false); }}
                className="p-3 rounded-xl border border-accent/30 bg-accent/10 text-accent font-semibold text-left flex items-center gap-2.5"
              >
                <FiZap size={16} />
                <span className="text-xs font-bold">AI Coach</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Modals & Drawers */}
      {isSearchOpen && (
        <Suspense fallback={null}>
          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onNavigateTab={navigateToTab}
          />
        </Suspense>
      )}

      {isAIOpen && (
        <Suspense fallback={null}>
          <AIAssistantDrawer
            isOpen={isAIOpen}
            onClose={() => setIsAIOpen(false)}
          />
        </Suspense>
      )}

      {isCommandPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            onNavigate={navigateToTab}
            onOpenAI={() => { setIsAIOpen(true); setIsCommandPaletteOpen(false); }}
          />
        </Suspense>
      )}

      {isDeepWorkActive && (
        <Suspense fallback={null}>
          <DeepWorkMode
            isActive={isDeepWorkActive}
            onExit={() => setIsDeepWorkActive(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default DashboardLayout;
