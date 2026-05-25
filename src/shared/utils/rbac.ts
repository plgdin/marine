import type { OrgRole } from '@config/permissions';
import { useAuthStore } from '@features/auth/stores/auth.store';

/**
 * RBAC Helper Utilities
 * 
 * Used for programmatic permission checks where the HOC `withAuth`
 * or `can()` method is not directly applicable.
 */

const ROLE_HIERARCHY: Record<OrgRole, number> = {
  viewer: 1,
  analyst: 2,
  operator: 3,
  admin: 4,
  owner: 5,
};

export const hasRole = (requiredRole: OrgRole, currentRole?: OrgRole | null): boolean => {
  if (!currentRole) return false;
  return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
};

export const requireRole = (requiredRole: OrgRole): void => {
  const currentRole = useAuthStore.getState().session?.orgRole as OrgRole | undefined;
  if (!hasRole(requiredRole, currentRole)) {
    throw new Error(`Forbidden: Requires ${requiredRole} access.`);
  }
};

export const isAdmin = (): boolean => hasRole('admin', useAuthStore.getState().session?.orgRole as OrgRole | undefined);
export const isOwner = (): boolean => hasRole('owner', useAuthStore.getState().session?.orgRole as OrgRole | undefined);
