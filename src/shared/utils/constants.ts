/** Platform-wide constants */

// ── App Info ──────────────────────────────
export const APP_NAME    = 'MarineTrack';
export const APP_VERSION = '1.0.0';
export const APP_TAGLINE = 'Global Maritime Intelligence';

// ── Map ───────────────────────────────────
export const MAP_DEFAULTS = {
  center:    [0, 20] as [number, number],
  zoom:      3,
  minZoom:   1,
  maxZoom:   20,
  style:     'mapbox://styles/mapbox/dark-v11',
} as const;

export const MAP_ZOOM_THRESHOLDS = {
  heatmap:  4,
  cluster:  8,
  icon:     9,
  detailed: 13,
} as const;

// ── Realtime ─────────────────────────────
export const REALTIME = {
  positionUpdateIntervalMs: 500,
  reconnectMaxAttempts:     5,
  reconnectBaseDelayMs:     1000,
  reconnectMaxDelayMs:      30000,
  gapFillWindowMs:          60000,
} as const;

// ── Position ─────────────────────────────
export const POSITION = {
  maxTrackPoints:   1000,
  staleThresholdMs: 5 * 60 * 1000,  // 5 minutes
} as const;

// ── Vessel ───────────────────────────────
export const VESSEL_TYPE_LABELS: Record<string, string> = {
  cargo:     'Cargo',
  tanker:    'Tanker',
  passenger: 'Passenger',
  fishing:   'Fishing',
  tug:       'Tug',
  pleasure:  'Pleasure Craft',
  military:  'Military',
  sailing:   'Sailing',
  other:     'Other',
};

export const NAV_STATUS_LABELS: Record<string, string> = {
  underway:         'Underway',
  anchored:         'Anchored',
  'not-under-command': 'Not Under Command',
  restricted:       'Restricted Maneuverability',
  moored:           'Moored',
  aground:          'Aground',
  fishing:          'Fishing',
  sailing:          'Sailing',
  unknown:          'Unknown',
};

// ── Alert Severity ───────────────────────
export const SEVERITY_COLORS = {
  critical: '#ff1744',
  warning:  '#ffab00',
  info:     '#40c4ff',
  success:  '#00e676',
} as const;

// ── Date/Time ─────────────────────────────
export const DATE_FORMATS = {
  display:   'MMM d, yyyy',
  datetime:  'MMM d, yyyy HH:mm',
  time:      'HH:mm',
  timeShort: 'HH:mm:ss',
  iso:       "yyyy-MM-dd'T'HH:mm:ssxxx",
} as const;

// ── Query defaults ───────────────────────
export const QUERY_DEFAULTS = {
  staleTime: {
    realtime:    0,
    fast:        30_000,
    normal:      60_000,
    slow:        5 * 60_000,
    static:      60 * 60_000,
  },
  gcTime: 10 * 60_000,
  retry:  1,
} as const;

// ── Table ───────────────────────────────
export const TABLE_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 25;

// ── Sidebar ─────────────────────────────
export const SIDEBAR_COLLAPSED_KEY = 'marinetrack:sidebar:collapsed';
export const THEME_STORAGE_KEY     = 'marinetrack:theme';
