import { Navigate }   from 'react-router-dom';
import type { ReactNode } from 'react';
import { useIsAuthed, useAuthLoading } from '@features/auth/stores/auth.store';
import { LoadingScreen }               from '@shared/components/feedback/LoadingScreen';
import { ROUTES }                      from '@config/routes';

interface GuestGuardProps {
  children: ReactNode;
}

/**
 * Prevents authenticated users from accessing auth pages (login, signup).
 * Redirects them to the dashboard instead.
 */
export function GuestGuard({ children }: GuestGuardProps) {
  const isAuthed  = useIsAuthed();
  const isLoading = useAuthLoading();

  if (isLoading)  return <LoadingScreen />;
  if (isAuthed)   return <Navigate to={ROUTES.DASHBOARD} replace />;

  return <>{children}</>;
}
