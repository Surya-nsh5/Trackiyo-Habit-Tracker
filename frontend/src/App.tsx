import React, { useEffect } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { AuthScreen } from './components/AuthScreen';
import { LandingPage } from './components/LandingPage';
import { useAuthStore } from './store/useAuthStore';
import { useThemeStore } from './store/useThemeStore';
import { PWAReloadPrompt } from './components/PWAReloadPrompt';

const LoadingScreen = () => (
  <div className="flex h-screen items-center justify-center bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans tracking-widest text-sm">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-2 border-zinc-300 dark:border-zinc-800 border-t-zinc-900 dark:border-t-white rounded-full animate-spin"></div>
      LOADING
    </div>
  </div>
);

const App: React.FC = () => {
  const { isAuthenticated, hasVisited, isInitializing, initializeAuth } = useAuthStore();
  const { initializeTheme } = useThemeStore();
  
  useEffect(() => {
    initializeTheme();
    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isInitializing) {
    return <LoadingScreen />;
  }

  let content;
  if (!hasVisited && !isAuthenticated) {
    content = <LandingPage />;
  } else if (!isAuthenticated) {
    content = <AuthScreen />;
  } else {
    content = <DashboardLayout />;
  }

  return (
    <>
      {content}
      <PWAReloadPrompt />
    </>
  );
};

export default App;
