import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import { PageLoader } from '../components/common/Feedback';
import { PERMISSIONS } from '../constants/app';
import { useAuth } from '../hooks/useAuth';
import { RequireAuth, RequireGuest, RequirePermission } from './guards';

const LandingPage = lazy(() => import('../pages/LandingPage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const FeedPage = lazy(() => import('../pages/FeedPage'));
const CommunitiesPage = lazy(() => import('../pages/communities/CommunitiesPage'));
const CommunityPage = lazy(() => import('../pages/communities/CommunityPage'));
const PostPage = lazy(() => import('../pages/posts/PostPage'));
const PostEditorPage = lazy(() => import('../pages/posts/PostEditorPage'));
const MessagesPage = lazy(() => import('../pages/MessagesPage'));
const ProjectsPage = lazy(() => import('../pages/projects/ProjectsPage'));
const ProjectPage = lazy(() => import('../pages/projects/ProjectPage'));
const ProjectEditorPage = lazy(() => import('../pages/projects/ProjectEditorPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage'));
const SearchPage = lazy(() => import('../pages/SearchPage'));
const PricingPage = lazy(() => import('../pages/billing/PricingPage'));
const BillingSuccessPage = lazy(() => import('../pages/billing/BillingSuccessPage'));
const BillingCancelPage = lazy(() => import('../pages/billing/BillingCancelPage'));
const AdminLayout = lazy(() => import('../pages/admin/AdminLayout'));
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'));
const AdminCommunitiesPage = lazy(() => import('../pages/admin/AdminCommunitiesPage'));
const AdminReportsPage = lazy(() => import('../pages/admin/AdminReportsPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

function HomeRoute() {
  const { isAuthenticated, isResolving } = useAuth();
  if (isResolving) return <PageLoader />;
  return isAuthenticated ? <Navigate to="/feed" replace /> : <LandingPage />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomeRoute />} />

        <Route element={<RequireGuest />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<AppShell />}>
          {/* Guests can browse community previews, search communities and see pricing. */}
          <Route path="/communities" element={<CommunitiesPage />} />
          <Route path="/communities/:slug" element={<CommunityPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/pricing" element={<PricingPage />} />

          <Route element={<RequireAuth />}>
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/posts/new" element={<PostEditorPage />} />
            <Route path="/posts/:id" element={<PostPage />} />
            <Route path="/posts/:id/edit" element={<PostEditorPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:conversationId" element={<MessagesPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/new" element={<ProjectEditorPage />} />
            <Route path="/projects/:id" element={<ProjectPage />} />
            <Route path="/projects/:id/edit" element={<ProjectEditorPage />} />
            <Route path="/profile/:username" element={<ProfilePage />} />
            <Route path="/settings/*" element={<SettingsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/billing/success" element={<BillingSuccessPage />} />
            <Route path="/billing/cancel" element={<BillingCancelPage />} />

            <Route element={<RequirePermission permission={PERMISSIONS.ADMIN_ACCESS} />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="communities" element={<AdminCommunitiesPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
