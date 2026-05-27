import { useEffect, useState } from 'react';

/**
 * Debounce a rapidly changing value.
 * Useful for search inputs to avoid firing queries on every keystroke.
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
