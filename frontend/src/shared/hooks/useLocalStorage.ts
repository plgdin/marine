import { useState, useEffect, useCallback } from 'react';
import { logger } from '@shared/utils/logger';

/**
 * Persist state in localStorage with JSON serialization.
 * Falls back to the initial value if localStorage is unavailable or corrupted.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [stored, setStored] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      logger.warn('useLocalStorage: read failed', { key }, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const next = value instanceof Function ? value(stored) : value;
        setStored(next);
        window.localStorage.setItem(key, JSON.stringify(next));
      } catch (error) {
        logger.warn('useLocalStorage: write failed', { key }, error);
      }
    },
    [key, stored],
  );

  const removeValue = useCallback(() => {
    try {
      setStored(initialValue);
      window.localStorage.removeItem(key);
    } catch (error) {
      logger.warn('useLocalStorage: remove failed', { key }, error);
    }
  }, [key, initialValue]);

  // Sync across tabs
  useEffect(() => {
    const handler = (event: StorageEvent) => {
      if (event.key !== key) return;
      try {
        setStored(event.newValue ? (JSON.parse(event.newValue) as T) : initialValue);
      } catch {
        /* ignore parse errors from other tabs */
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [key, initialValue]);

  return [stored, setValue, removeValue];
}
