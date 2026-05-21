/**
 * RBAC permission definitions.
 * Roles and their allowed actions per resource type.
 */

export type OrgRole = 'owner' | 'admin' | 'operator' | 'analyst' | 'viewer';

export type Resource =
  | 'org.settings'
  | 'org.billing'
  | 'org.members'
  | 'vessels'
  | 'fleets'
  | 'voyages'
  | 'alerts'
  | 'geofences'
  | 'analytics'
  | 'api.keys'
  | 'exports';

export type Action = 'read' | 'write' | 'delete' | 'acknowledge';

type PermissionMatrix = Record<OrgRole, Partial<Record<Resource, Action[]>>>;

export const PERMISSIONS: PermissionMatrix = {
  owner: {
    'org.settings': ['read', 'write', 'delete'],
    'org.billing':  ['read', 'write'],
    'org.members':  ['read', 'write', 'delete'],
    vessels:        ['read', 'write', 'delete'],
    fleets:         ['read', 'write', 'delete'],
    voyages:        ['read', 'write', 'delete'],
    alerts:         ['read', 'write', 'delete', 'acknowledge'],
    geofences:      ['read', 'write', 'delete'],
    analytics:      ['read'],
    'api.keys':     ['read', 'write', 'delete'],
    exports:        ['read', 'write'],
  },
  admin: {
    'org.settings': ['read', 'write'],
    'org.members':  ['read', 'write', 'delete'],
    vessels:        ['read', 'write', 'delete'],
    fleets:         ['read', 'write', 'delete'],
    voyages:        ['read', 'write', 'delete'],
    alerts:         ['read', 'write', 'delete', 'acknowledge'],
    geofences:      ['read', 'write', 'delete'],
    analytics:      ['read'],
    'api.keys':     ['read', 'write', 'delete'],
    exports:        ['read', 'write'],
  },
  operator: {
    vessels:   ['read', 'write'],
    fleets:    ['read', 'write'],
    voyages:   ['read', 'write'],
    alerts:    ['read', 'write', 'acknowledge'],
    geofences: ['read', 'write'],
    analytics: ['read'],
    exports:   ['read', 'write'],
  },
  analyst: {
    vessels:   ['read'],
    fleets:    ['read'],
    voyages:   ['read'],
    alerts:    ['read', 'acknowledge'],
    geofences: ['read'],
    analytics: ['read'],
    exports:   ['read'],
  },
  viewer: {
    vessels:   ['read'],
    fleets:    ['read'],
    voyages:   ['read'],
    alerts:    ['read'],
    geofences: ['read'],
    analytics: ['read'],
  },
};

/** Check if a role has the given permission */
export function hasPermission(
  role: OrgRole,
  resource: Resource,
  action: Action,
): boolean {
  const allowed = PERMISSIONS[role]?.[resource];
  return allowed?.includes(action) ?? false;
}

/** Role display metadata */
export const ROLE_META: Record<OrgRole, { label: string; color: string; description: string }> = {
  owner:    { label: 'Owner',    color: 'text-accent-cyan',   description: 'Full control including billing' },
  admin:    { label: 'Admin',    color: 'text-marine-300',    description: 'Manage members and all data' },
  operator: { label: 'Operator', color: 'text-accent-teal',   description: 'CRUD vessels, fleets, voyages' },
  analyst:  { label: 'Analyst',  color: 'text-accent-amber',  description: 'Read all, create reports' },
  viewer:   { label: 'Viewer',   color: 'text-text-secondary', description: 'Read-only access' },
};
