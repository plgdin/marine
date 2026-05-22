import { useEffect, type ReactNode } from 'react';
import { useAuthStore }               from '@features/auth/stores/auth.store';
import { logger }                     from '@shared/utils/logger';
import type { AuthSession, UserProfile } from '@shared/types/domain.types';
import { supabase }                   from '@config/supabase';

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
  const { setSession, setLoading, setInitialized, clearSession } = useAuthStore();

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        setLoading(true);

        // 1. Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session && mounted) {
          // In a real app, you might fetch additional profile data here.
          setSession(mapSupabaseSession(session));
          logger.info('AuthProvider: initialized (authenticated)');
        } else if (mounted) {
          setSession(null);
          logger.info('AuthProvider: initialized (unauthenticated)');
        }

        // 2. Listen for auth changes (login, logout, token refresh)
        supabase.auth.onAuthStateChange((_event, newSession) => {
          if (newSession) {
            setSession(mapSupabaseSession(newSession));
          } else {
            clearSession();
          }
        });

      } catch (error) {
        logger.error('AuthProvider: initialization failed', error);
        if (mounted) setSession(null);
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    void initAuth();

    return () => {
      mounted = false;
    };
  }, [setSession, setLoading, setInitialized, clearSession]);

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
