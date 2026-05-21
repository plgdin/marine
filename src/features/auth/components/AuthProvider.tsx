import { useEffect, type ReactNode } from 'react';
import { useAuthStore }               from '@features/auth/stores/auth.store';
import { logger }                     from '@shared/utils/logger';
import type { AuthSession, UserProfile } from '@shared/types/domain.types';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider — bootstraps and maintains the auth session.
 *
 * In production this will:
 *   1. Call supabase.auth.getSession() on mount
 *   2. Subscribe to supabase.auth.onAuthStateChange()
 *   3. Map Supabase session → AuthSession → Zustand store
 *
 * For now, this is a development stub that simulates an unauthenticated state
 * so the routing and guards work correctly end-to-end.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { setSession, setLoading, setInitialized } = useAuthStore();

  useEffect(() => {
    // ── STUB: Replace with real Supabase auth once keys are configured ──
    const initAuth = async () => {
      try {
        setLoading(true);

        // TODO: Replace this block with:
        //
        // const { data: { session } } = await supabaseClient.auth.getSession();
        // if (session) {
        //   const profile = await fetchUserProfile(session.user.id);
        //   setSession(mapSupabaseSession(session, profile));
        // }
        //
        // supabaseClient.auth.onAuthStateChange((_event, session) => {
        //   if (session) { ... } else { clearSession(); }
        // });

        // Stub: simulate auth check delay
        await new Promise((r) => setTimeout(r, 300));

        // Stub: Simulate logged in state for testing the dashboard
        setSession({
          user: {
            id: 'mock-user-123',
            email: 'admin@marinetrack.app',
            fullName: 'Admin User',
            avatarUrl: null,
            createdAt: new Date().toISOString(),
          },
          accessToken: 'mock-jwt-token',
          orgId: 'mock-org-123',
          orgRole: 'admin',
        });
        logger.info('AuthProvider: initialized (STUB MODE — LOGGED IN)');
      } catch (error) {
        logger.error('AuthProvider: initialization failed', error);
        setSession(null);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    void initAuth();
  }, [setSession, setLoading, setInitialized]);

  return <>{children}</>;
}

/**
 * Maps a raw Supabase user + session to our internal AuthSession type.
 * TODO: call this from the real auth flow above.
 */
export function mapSupabaseSession(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any,
  profile: Partial<UserProfile> = {},
): AuthSession {
  return {
    user: {
      id:        session.user.id,
      email:     session.user.email ?? '',
      fullName:  profile.fullName ?? session.user.user_metadata?.full_name ?? null,
      avatarUrl: profile.avatarUrl ?? session.user.user_metadata?.avatar_url ?? null,
      createdAt: session.user.created_at,
    },
    accessToken: session.access_token,
    orgId:       session.user.app_metadata?.org_id ?? null,
    orgRole:     session.user.app_metadata?.org_role ?? null,
  };
}
