import React, { useEffect, lazy, Suspense } from 'react';
import { HabitLoader } from '@/components/habits/HabitLoader';
import { NativeUpdateDialog } from '@/components/common/NativeUpdateDialog';
import { WebUpdateBanner } from '@/components/common/WebUpdateBanner';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { useAuthStore } from '@/store/useAuthStore';
import { useThemeStore } from '@/store/useThemeStore';
import { PWAReloadPrompt } from '@/components/common/PWAReloadPrompt';
import { initNative } from '@/native';
import { DesignSystemProvider } from '@/ds/DesignSystemProvider';
import { DeleteConfirmPopup } from '@/components/common/DeleteConfirmPopup';

const DashboardLayout = lazy(() => import('@/components/layout/DashboardLayout').then(m => ({ default: m.DashboardLayout })));
const LandingPage = lazy(() => import('@/components/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const AuthModal = lazy(() => import('@/components/auth/AuthModal').then(m => ({ default: m.AuthModal })));

const PublicShareView = lazy(() => import('@/components/shared/PublicShareView').then(m => ({ default: m.PublicShareView })));
const PublicChallengeView = lazy(() => import('@/components/social/PublicChallengeView').then(m => ({ default: m.PublicChallengeView })));
const ShareCardModal = lazy(() => import('@/components/shared/ShareCardModal').then(m => ({ default: m.ShareCardModal })));
const StreakDetailModal = lazy(() => import('@/components/shared/StreakDetailModal').then(m => ({ default: m.StreakDetailModal })));
const AchievementUnlockModal = lazy(() => import('@/components/shared/AchievementUnlockModal').then(m => ({ default: m.AchievementUnlockModal })));
const CreateChallengeModal = lazy(() => import('@/components/social/CreateChallengeModal').then(m => ({ default: m.CreateChallengeModal })));

const LoadingScreen = ({ label = 'Preparing your day' }: { label?: string }) => (
  <div className="flex h-dvh items-center justify-center bg-background text-foreground font-sans">
    <div role="status" aria-label={label}>
      <HabitLoader size="lg" label={label} />
    </div>
  </div>
);

const App: React.FC = () => {
  const { isAuthenticated, showAuth, isInitializing, initializeAuth } = useAuthStore();
  const { initializeTheme } = useThemeStore();
  
  // Check for public share link or challenge link in hash or path
  const [shareToken, setShareToken] = React.useState<string | null>(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/share/')) return hash.replace('#/share/', '').split('?')[0];
    const path = window.location.pathname;
    if (path.startsWith('/share/')) return path.replace('/share/', '').split('?')[0];
    return null;
  });

  const [challengeToken, setChallengeToken] = React.useState<string | null>(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#/challenge/')) return hash.replace('#/challenge/', '').split('?')[0];
    const path = window.location.pathname;
    if (path.startsWith('/challenge/')) return path.replace('/challenge/', '').split('?')[0];
    return null;
  });

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/share/')) {
        setShareToken(hash.replace('#/share/', '').split('?')[0]);
      } else if (hash.startsWith('#/challenge/')) {
        setChallengeToken(hash.replace('#/challenge/', '').split('?')[0]);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    initializeTheme();
    initializeAuth();
    initNative();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (challengeToken) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <PublicChallengeView token={challengeToken} />
      </Suspense>
    );
  }

  if (shareToken) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <PublicShareView token={shareToken} />
      </Suspense>
    );
  }

  if (isInitializing) {
    return <LoadingScreen label="Checking session..." />;
  }

  // LandingPage is always shown when not authenticated.
  // AuthModal only mounts when the user explicitly clicks Login/Signup
  // (startOnboarding sets hasVisited + showAuth), never on first load.
  let content;
  if (!isAuthenticated) {
    content = (
      <DesignSystemProvider intensity="kinetic" motion="kinetic" density="spacious">
        <Suspense fallback={<LoadingScreen />}>
          <LandingPage />
          {showAuth && <AuthModal />}
        </Suspense>
      </DesignSystemProvider>
    );
  } else {
    content = (
      <DesignSystemProvider intensity="bold" motion="standard" density="comfortable">
        <Suspense fallback={<LoadingScreen />}>
          <DashboardLayout />
        </Suspense>
      </DesignSystemProvider>
    );
  }

  return (
    <>
      <OfflineBanner />
      {content}
      <Suspense fallback={null}>
        <ShareCardModal />
        <StreakDetailModal />
        <AchievementUnlockModal />
        <CreateChallengeModal />
      </Suspense>
      <PWAReloadPrompt />
      <WebUpdateBanner />
      <NativeUpdateDialog />
      <DeleteConfirmPopup />
    </>
  );
};

export default App;
