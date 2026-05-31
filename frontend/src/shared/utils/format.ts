import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { DATE_FORMATS, NAV_STATUS_LABELS, VESSEL_TYPE_LABELS } from './constants';

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

/** Format a speed in knots: "12.4 kn" */
export function formatSpeed(knots: number | string | null | undefined): string {
  if (knots == null) return '—';
  const num = Number(knots);
  if (isNaN(num)) return '—';
  return `${num.toFixed(1)} kn`;
}

/** Format distance in nautical miles */
export function formatDistance(nm: number | string | null | undefined): string {
  if (nm == null) return '—';
  const num = Number(nm);
  if (isNaN(num)) return '—';
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K nm`;
  return `${num.toFixed(0)} nm`;
}

/** Format a heading/course in degrees: "270°" */
export function formatHeading(deg: number | string | null | undefined): string {
  if (deg == null) return '—';
  const num = Number(deg);
  if (isNaN(num)) return '—';
  return `${Math.round(num)}°`;
}

/** Format tonnage with locale separators: "45,230 GT" */
export function formatTonnage(gt: number | string | null | undefined): string {
  if (gt == null) return '—';
  const num = Number(gt);
  if (isNaN(num)) return '—';
  return `${num.toLocaleString()} GT`;
}

/** Generic number with locale formatting */
export function formatNumber(n: number | string | null | undefined, decimals = 0): string {
  if (n == null) return '—';
  const num = Number(n);
  if (isNaN(num)) return '—';
  return num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format lat/lng in decimal degrees: "12.3456°N, 45.6789°E" */
export function formatCoordinates(
  lat: number | string | null | undefined,
  lng: number | string | null | undefined,
): string {
  if (lat == null || lng == null) return '—';
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (isNaN(latNum) || isNaN(lngNum)) return '—';
  const latDir = latNum >= 0 ? 'N' : 'S';
  const lngDir = lngNum >= 0 ? 'E' : 'W';
  return `${Math.abs(latNum).toFixed(4)}°${latDir}, ${Math.abs(lngNum).toFixed(4)}°${lngDir}`;
}

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

