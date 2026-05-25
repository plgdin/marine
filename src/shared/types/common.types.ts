/** Common utility types used across the platform */

// ── Pagination ──────────────────────────
export interface PaginationParams {
  page:  number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

// ── Sorting ─────────────────────────────
export interface SortParams {
  field:     string;
  direction: 'asc' | 'desc';
}

// ── API Response ─────────────────────────
export type ApiResponse<T> =
  | { data: T;    error: null }
  | { data: null; error: ApiError };

export interface ApiError {
  code:    string;
  message: string;
  details?: Record<string, unknown>;
}

// ── Select options ───────────────────────
export interface SelectOption<V = string> {
  label: string;
  value: V;
  icon?: React.ReactNode;
  disabled?: boolean;
}

// ── Form state ──────────────────────────
export type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

// ── Table ────────────────────────────────
export interface TableColumn<T> {
  key:       keyof T | string;
  header:    string;
  width?:    string;
  sortable?: boolean;
  render?:   (row: T) => React.ReactNode;
}

// ── Filter ──────────────────────────────
export interface FilterState {
  search?:   string;
  status?:   string[];
  type?:     string[];
  dateFrom?: string;
  dateTo?:   string;
  [key: string]: unknown;
}

// ── Async state ─────────────────────────
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data:   T | null;
  status: AsyncStatus;
  error:  string | null;
}
