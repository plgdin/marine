import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { DATE_FORMATS, NAV_STATUS_LABELS, VESSEL_TYPE_LABELS } from './constants';

// ── Date / Time ──────────────────────────────────────────────

/** Format an ISO string for display: "May 21, 2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = parseISO(iso);
  return isValid(d) ? format(d, DATE_FORMATS.display) : '—';
}

/** Format an ISO string to datetime: "May 21, 2026 14:30" */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = parseISO(iso);
  return isValid(d) ? format(d, DATE_FORMATS.datetime) : '—';
}

/** Format an ISO string to time: "14:30" */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = parseISO(iso);
  return isValid(d) ? format(d, DATE_FORMATS.time) : '—';
}

/** Relative time: "3 minutes ago" */
export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = parseISO(iso);
  return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '—';
}

// ── Numbers ──────────────────────────────────────────────────

/** Format a speed in knots: "12.4 kn" */
export function formatSpeed(knots: number | null | undefined): string {
  if (knots == null) return '—';
  return `${knots.toFixed(1)} kn`;
}

/** Format distance in nautical miles */
export function formatDistance(nm: number | null | undefined): string {
  if (nm == null) return '—';
  if (nm >= 1000) return `${(nm / 1000).toFixed(1)}K nm`;
  return `${nm.toFixed(0)} nm`;
}

/** Format a heading/course in degrees: "270°" */
export function formatHeading(deg: number | null | undefined): string {
  if (deg == null) return '—';
  return `${Math.round(deg)}°`;
}

/** Format tonnage with locale separators: "45,230 GT" */
export function formatTonnage(gt: number | null | undefined): string {
  if (gt == null) return '—';
  return `${gt.toLocaleString()} GT`;
}

/** Generic number with locale formatting */
export function formatNumber(n: number | null | undefined, decimals = 0): string {
  if (n == null) return '—';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ── Coordinates ──────────────────────────────────────────────

/** Format lat/lng in decimal degrees: "12.3456°N, 45.6789°E" */
export function formatCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
): string {
  if (lat == null || lng == null) return '—';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

// ── Labels ───────────────────────────────────────────────────

export function formatNavStatus(status: string | null | undefined): string {
  if (!status) return '—';
  return NAV_STATUS_LABELS[status] ?? status;
}

export function formatVesselType(type: string | null | undefined): string {
  if (!type) return '—';
  return VESSEL_TYPE_LABELS[type] ?? type;
}

/** Convert snake_case or kebab-case to Title Case */
export function formatLabel(str: string): string {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── String ───────────────────────────────────────────────────

/** Truncate a string with ellipsis */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 1)}…`;
}

/** Format MMSI with visual separator: "123 456 789" */
export function formatMMSI(mmsi: string | null | undefined): string {
  if (!mmsi) return '—';
  return mmsi.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
}
