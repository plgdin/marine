/**
 * TanStack Query key factories.
 * All query keys must be defined here for consistent cache management.
 */

// ── Vessel Keys ──────────────────────────────────────────────
export const vesselKeys = {
  all:       ['vessels'] as const,
  lists:     () => [...vesselKeys.all, 'list'] as const,
  list:      (filters?: Record<string, unknown>) =>
               [...vesselKeys.lists(), filters ?? {}] as const,
  details:   () => [...vesselKeys.all, 'detail'] as const,
  detail:    (id: string) => [...vesselKeys.details(), id] as const,
  positions: (id: string) => [...vesselKeys.detail(id), 'positions'] as const,
  track:     (id: string, from?: string, to?: string) =>
               [...vesselKeys.detail(id), 'track', { from, to }] as const,
  search:    (query: string) => [...vesselKeys.all, 'search', query] as const,
};

// ── Fleet Keys ──────────────────────────────────────────────
export const fleetKeys = {
  all:     ['fleets'] as const,
  lists:   () => [...fleetKeys.all, 'list'] as const,
  list:    (filters?: Record<string, unknown>) =>
             [...fleetKeys.lists(), filters ?? {}] as const,
  details: () => [...fleetKeys.all, 'detail'] as const,
  detail:  (id: string) => [...fleetKeys.details(), id] as const,
  vessels: (id: string) => [...fleetKeys.detail(id), 'vessels'] as const,
};

// ── Voyage Keys ─────────────────────────────────────────────
export const voyageKeys = {
  all:     ['voyages'] as const,
  lists:   () => [...voyageKeys.all, 'list'] as const,
  list:    (filters?: Record<string, unknown>) =>
             [...voyageKeys.lists(), filters ?? {}] as const,
  details: () => [...voyageKeys.all, 'detail'] as const,
  detail:  (id: string) => [...voyageKeys.details(), id] as const,
};

// ── Alert Keys ──────────────────────────────────────────────
export const alertKeys = {
  all:     ['alerts'] as const,
  events:  () => [...alertKeys.all, 'events'] as const,
  event:   (filters?: Record<string, unknown>) =>
             [...alertKeys.events(), filters ?? {}] as const,
  rules:   () => [...alertKeys.all, 'rules'] as const,
  rule:    (id: string) => [...alertKeys.rules(), id] as const,
};

// ── Analytics Keys ──────────────────────────────────────────
export const analyticsKeys = {
  all:       ['analytics'] as const,
  dashboard: () => [...analyticsKeys.all, 'dashboard'] as const,
  fleet:     (id: string) => [...analyticsKeys.all, 'fleet', id] as const,
  vessel:    (id: string) => [...analyticsKeys.all, 'vessel', id] as const,
};

// ── Geofence Keys ──────────────────────────────────────────
export const geofenceKeys = {
  all:    ['geofences'] as const,
  lists:  () => [...geofenceKeys.all, 'list'] as const,
  detail: (id: string) => [...geofenceKeys.all, 'detail', id] as const,
};

// ── Org / Settings Keys ─────────────────────────────────────
export const orgKeys = {
  all:     ['org'] as const,
  current: () => [...orgKeys.all, 'current'] as const,
  members: () => [...orgKeys.all, 'members'] as const,
  teams:   () => [...orgKeys.all, 'teams'] as const,
  billing: () => [...orgKeys.all, 'billing'] as const,
  apiKeys: () => [...orgKeys.all, 'api-keys'] as const,
};

// ── Auth Keys ───────────────────────────────────────────────
export const authKeys = {
  all:     ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  profile: () => [...authKeys.all, 'profile'] as const,
};
