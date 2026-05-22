import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode }        from 'react';
import { useIsAuthed, useAuthLoading } from '@features/auth/stores/auth.store';
import { LoadingScreen }               from '@shared/components/feedback/LoadingScreen';
import { ROUTES }                      from '@config/routes';

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * Protects all routes under /app.
 * - While auth is initializing: shows LoadingScreen (prevents flash of wrong content).
 * - If unauthenticated: redirects to /login, preserving the intended destination.
 * - If authenticated: renders children.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const isAuthed    = useIsAuthed();
  const isLoading   = useAuthLoading();
  const location    = useLocation();

  // Block until auth state is resolved
  if (isLoading) return <LoadingScreen />;

  // Redirect to login with return URL
  if (!isAuthed) {
    return (
      <Navigate
        to={ROUTES.LOGIN}
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  return <>{children}</>;
}
