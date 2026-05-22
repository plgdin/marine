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
  member: 2,
  admin: 3,
  owner: 4,
};

export const hasRole = (requiredRole: OrgRole, currentRole?: OrgRole | null): boolean => {
  if (!currentRole) return false;
  return ROLE_HIERARCHY[currentRole] >= ROLE_HIERARCHY[requiredRole];
};

export const requireRole = (requiredRole: OrgRole): void => {
  const currentRole = useAuthStore.getState().orgRole;
  if (!hasRole(requiredRole, currentRole)) {
    throw new Error(`Forbidden: Requires ${requiredRole} access.`);
  }
};

export const isAdmin = (): boolean => hasRole('admin', useAuthStore.getState().orgRole);
export const isOwner = (): boolean => hasRole('owner', useAuthStore.getState().orgRole);
