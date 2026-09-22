import React, { useEffect } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './components/LandingPage';
import { HabitLoader } from './components/HabitLoader';
import { NativeUpdateDialog } from './components/NativeUpdateDialog';
import { useAuthStore } from './store/useAuthStore';
import { useThemeStore } from './store/useThemeStore';
import { PWAReloadPrompt } from './components/PWAReloadPrompt';
import { initNative } from './native';

const LoadingScreen = () => (
  <div className="flex h-dvh items-center justify-center bg-background text-foreground font-sans">
    <div role="status" aria-label="Loading your habits">
      <HabitLoader size="lg" label="Preparing your day" />
    </div>
  </div>
);

const App: React.FC = () => {
  const { isAuthenticated, showAuth, isInitializing, initializeAuth } = useAuthStore();
  const { initializeTheme } = useThemeStore();
  
  useEffect(() => {
    initializeTheme();
    initializeAuth();
    initNative();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isInitializing) {
    return <LoadingScreen />;
  }

  // LandingPage is always shown when not authenticated.
  // AuthModal only mounts when the user explicitly clicks Login/Signup
  // (startOnboarding sets hasVisited + showAuth), never on first load.
  let content;
  if (!isAuthenticated) {
    content = (
      <>
        <LandingPage />
        {showAuth && <AuthModal />}
      </>
    );
  } else {
    content = <DashboardLayout />;
  }

  return (
    <>
      {content}
      <PWAReloadPrompt />
      <NativeUpdateDialog />
    </>
  );
};

export default App;
