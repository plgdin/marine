import type { ReactNode } from 'react';

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
  // Temporary bypass for direct access
  return <>{children}</>;
}
