import { lazy, Suspense } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom';

import { AuthGuard }    from '@features/auth/components/AuthGuard';
import { GuestGuard }   from '@features/auth/components/GuestGuard';
import { AppLayout }    from '@shared/components/layout/AppLayout';
import { AuthLayout }   from '@shared/components/layout/AuthLayout';
import { LoadingScreen } from '@shared/components/feedback/LoadingScreen';
import { ErrorFallback } from '@shared/components/feedback/ErrorFallback';
import { ROUTES }        from '@config/routes';

// ── Lazy page imports ─────────────────────────────────────────
// Auth pages (loaded immediately — small and critical path)
const LoginPage    = lazy(() => import('@features/auth/pages/LoginPage'));
const SignupPage   = lazy(() => import('@features/auth/pages/SignupPage'));
const InvitePage   = lazy(() => import('@features/auth/pages/InvitePage'));

// App pages (lazy-loaded, code-split per route)
const DashboardPage  = lazy(() => import('@features/dashboard/pages/DashboardPage'));
const MapPage        = lazy(() => import('@features/map/pages/MapPage'));
const VesselsPage    = lazy(() => import('@features/vessels/pages/VesselsPage'));
const VesselDetailPage = lazy(() => import('@features/vessels/pages/VesselDetailPage'));
const FleetsPage     = lazy(() => import('@features/fleets/pages/FleetsPage'));
const FleetDetailPage = lazy(() => import('@features/fleets/pages/FleetDetailPage'));
const VoyagesPage    = lazy(() => import('@features/voyages/pages/VoyagesPage'));
const VoyageDetailPage = lazy(() => import('@features/voyages/pages/VoyageDetailPage'));
const AlertsPage     = lazy(() => import('@features/alerts/pages/AlertsPage'));
const AnalyticsPage  = lazy(() => import('@features/analytics/pages/AnalyticsPage'));
const GeofencesPage  = lazy(() => import('@features/geofences/pages/GeofencesPage'));
const SettingsPage   = lazy(() => import('@features/settings/pages/SettingsPage'));
const MembersPage    = lazy(() => import('@features/settings/pages/MembersPage'));
const BillingPage    = lazy(() => import('@features/settings/pages/BillingPage'));
const ApiKeysPage    = lazy(() => import('@features/settings/pages/ApiKeysPage'));
const ProfilePage    = lazy(() => import('@features/settings/pages/ProfilePage'));

// ── Route tree ───────────────────────────────────────────────
const router = createBrowserRouter([
  // ── Root: redirect to dashboard ─────────────────────────
  {
    path: ROUTES.ROOT,
    element: <Navigate to={ROUTES.DASHBOARD} replace />,
  },

  // ── Auth layout (guests only) ────────────────────────────
  {
    element: (
      <GuestGuard>
        <AuthLayout>
          <Suspense fallback={<LoadingScreen />}>
            <Outlet />
          </Suspense>
        </AuthLayout>
      </GuestGuard>
    ),
    errorElement: <ErrorFallback />,
    children: [
      { path: ROUTES.LOGIN,           element: <LoginPage /> },
      { path: ROUTES.SIGNUP,          element: <SignupPage /> },
      { path: ROUTES.INVITE,          element: <InvitePage /> },
    ],
  },

  // ── App layout (authenticated only) ─────────────────────
  {
    path: ROUTES.APP,
    element: (
      <AuthGuard>
        <AppLayout>
          <Suspense fallback={<LoadingScreen />}>
            <Outlet />
          </Suspense>
        </AppLayout>
      </AuthGuard>
    ),
    errorElement: <ErrorFallback />,
    children: [
      // Default: redirect /app → /app/dashboard
      { index: true, element: <Navigate to={ROUTES.DASHBOARD} replace /> },

      // Dashboard
      { path: 'dashboard', element: <DashboardPage /> },

      // Map
      { path: 'map',              element: <MapPage /> },
      { path: 'map/vessel/:id',   element: <MapPage /> },

      // Vessels
      { path: 'vessels',          element: <VesselsPage /> },
      { path: 'vessels/:id',      element: <VesselDetailPage /> },

      // Fleets
      { path: 'fleets',           element: <FleetsPage /> },
      { path: 'fleets/:id',       element: <FleetDetailPage /> },

      // Voyages
      { path: 'voyages',          element: <VoyagesPage /> },
      { path: 'voyages/:id',      element: <VoyageDetailPage /> },

      // Alerts
      { path: 'alerts',           element: <AlertsPage /> },

      // Analytics
      { path: 'analytics',        element: <AnalyticsPage /> },

      // Geofences
      { path: 'geofences',        element: <GeofencesPage /> },

      // Settings (nested)
      {
        path: 'settings',
        children: [
          { index: true,          element: <SettingsPage /> },
          { path: 'members',      element: <MembersPage /> },
          { path: 'billing',      element: <BillingPage /> },
          { path: 'api-keys',     element: <ApiKeysPage /> },
          { path: 'profile',      element: <ProfilePage /> },
        ],
      },

      // 404 catch-all within app
      { path: '*', element: <Navigate to={ROUTES.DASHBOARD} replace /> },
    ],
  },

  // ── Global 404 ──────────────────────────────────────────
  {
    path: '*',
    element: <Navigate to={ROUTES.ROOT} replace />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
