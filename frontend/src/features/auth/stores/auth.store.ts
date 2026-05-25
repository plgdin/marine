import { create } from 'zustand';
import type { AuthSession, UserProfile } from '@shared/types/domain.types';
import type { OrgRole } from '@config/permissions';
import { hasPermission, type Resource, type Action } from '@config/permissions';

// ── Types ────────────────────────────────
interface AuthState {
  session:     AuthSession | null;
  isLoading:   boolean;
  isInitialized: boolean;
}

interface AuthActions {
  setSession:      (session: AuthSession | null) => void;
  setLoading:      (loading: boolean) => void;
  setInitialized:  (initialized: boolean) => void;
  clearSession:    () => void;
  updateProfile:   (profile: Partial<UserProfile>) => void;
  /** Check if current user can perform an action on a resource */
  can:             (resource: Resource, action: Action) => boolean;
}

type AuthStore = AuthState & AuthActions;

// ── Store ────────────────────────────────
export const useAuthStore = create<AuthStore>()((set, get) => ({
  // State
  session:       null,
  isLoading:     true,
  isInitialized: false,

  // Actions
  setSession: (session) =>
    set({ session }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setInitialized: (isInitialized) =>
    set({ isInitialized }),

  clearSession: () =>
    set({ session: null }),

  updateProfile: (profile) =>
    set((s) => {
      if (!s.session) return s;
      return {
        session: {
          ...s.session,
          user: { ...s.session.user, ...profile },
        },
      };
    }),

  can: (resource, action) => {
    const role = get().session?.orgRole as OrgRole | null;
    if (!role) return false;
    return hasPermission(role, resource, action);
  },
}));

// ── Selector hooks ───────────────────────
export const useCurrentUser  = () => useAuthStore((s) => s.session?.user ?? null);
export const useOrgId        = () => useAuthStore((s) => s.session?.orgId ?? null);
export const useOrgRole      = () => useAuthStore((s) => s.session?.orgRole ?? null);
export const useIsAuthed     = () => useAuthStore((s) => s.session !== null);
export const useAuthLoading  = () => useAuthStore((s) => s.isLoading);
export const useCanPerform   = (resource: Resource, action: Action) =>
  useAuthStore((s) => s.can(resource, action));
