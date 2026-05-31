/**
 * Route path constants.
 * All navigation and link references must use these constants — never raw strings.
 */
export const ROUTES = {
  // Public
  ROOT:            '/',
  LOGIN:           '/login',
  SIGNUP:          '/signup',
  INVITE:          '/invite/:token',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD:  '/reset-password',

  // App shell
  APP: '/app',

  // Dashboard
  DASHBOARD: '/app/dashboard',

  // Map
  MAP:             '/app/map',
  MAP_VESSEL:      '/app/map/vessel/:id',

  // Vessels
  VESSELS:         '/app/vessels',
  VESSEL_DETAIL:   '/app/vessels/:id',
  VESSEL_HISTORY:  '/app/vessels/:id/history',

  // Fleets
  FLEETS:          '/app/fleets',
  FLEET_DETAIL:    '/app/fleets/:id',

  // Voyages
  VOYAGES:         '/app/voyages',
  VOYAGE_DETAIL:   '/app/voyages/:id',

  // Alerts
  ALERTS:          '/app/alerts',
  ALERT_DETAIL:    '/app/alerts/:id',

  // Analytics
  ANALYTICS:       '/app/analytics',
  ANALYTICS_REPORTS: '/app/analytics/reports',

  // Geofences
  GEOFENCES:       '/app/geofences',

  // Settings
  SETTINGS:         '/app/settings',
  SETTINGS_MEMBERS: '/app/settings/members',
  SETTINGS_BILLING: '/app/settings/billing',
  SETTINGS_API_KEYS: '/app/settings/api-keys',
  SETTINGS_PROFILE: '/app/settings/profile',
} as const;

/** Build a concrete path by replacing :param tokens */
export function buildPath(
  route: string,
  params: Record<string, string>,
): string {
  return Object.entries(params).reduce(
    (path, [key, value]) => path.replace(`:${key}`, value),
    route,
  );
}
