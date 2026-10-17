import SubmissionsPage from '@/pages/Submissions';
import AccountRecovery from '@/pages/AccountRecovery';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { CommandPalette } from '@/components/CommandPalette';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore'; 







import { Layout } from '@/components/Layout';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

// Lazy load pages
const HomePage = lazy(() => import('@/pages/Home'));
const ProblemsPage = lazy(() => import('@/pages/Problems'));
const ProblemDetailPage = lazy(() => import('@/pages/ProblemDetail'));
const ProfilePage = lazy(() => import('@/pages/Profile'));
const ContestsPage = lazy(() => import('@/pages/Contests'));
const ContestDetailPage = lazy(() => import('@/pages/ContestDetail'));
const StudyPlansPage = lazy(() => import('@/pages/StudyPlans'));
const CourseDetailPage = lazy(() => import('@/pages/CourseDetail'));
const LeaderboardPage = lazy(() => import('@/pages/Leaderboard'));
const TagPage = lazy(() => import('@/pages/Tag'));
const CompanyPage = lazy(() => import('@/pages/Company'));
const LoginPage = lazy(() => import('@/pages/Login'));
const RegisterPage = lazy(() => import('@/pages/Register'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const PremiumPage = lazy(() => import('@/pages/Premium'));
const AdminPage = lazy(() => import('@/pages/Admin'));
const NotFoundPage = lazy(() => import('@/pages/NotFound'));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (!user?.isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default function App() {
  const { theme } = useThemeStore();
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
      root.classList.toggle('light', !prefersDark);
    }
  }, [theme]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent('open-command-palette'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Auth pages (no layout) */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<AccountRecovery />} />
          <Route path="/reset-password" element={<AccountRecovery />} />
          <Route path="/verify-email" element={<AccountRecovery />} />

          {/* Main app with layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/problems" element={<ProblemsPage />} />
            <Route path="/problems/:slug" element={<ProblemDetailPage />} />
            <Route path="/u/:username" element={<ProfilePage />} />
            <Route path="/contest" element={<ContestsPage />} />
            <Route path="/contest/:id" element={<ContestDetailPage />} />
            <Route path="/study-plan" element={<StudyPlansPage />} />
            <Route path="/study-plan/:id" element={<CourseDetailPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/tag/:slug" element={<TagPage />} />
            <Route path="/company/:slug" element={<CompanyPage />} />
            <Route path="/premium" element={<PremiumPage />} />

            {/* Protected routes */}
            <Route path="/submissions" element={<ProtectedRoute><SubmissionsPage /></ProtectedRoute>} />
            <Route path="/settings" element={
              <ProtectedRoute><SettingsPage /></ProtectedRoute>
            } />

            {/* Admin routes */}
            <Route path="/admin/*" element={
              <AdminRoute><AdminPage /></AdminRoute>
            } />

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>

      <CommandPalette />
      <Toaster />
    </>
  );
}
