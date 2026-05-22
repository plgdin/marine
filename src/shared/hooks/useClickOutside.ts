import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * Call handler when a click happens outside the referenced element.
 * Used for dropdowns, modals, tooltips, etc.
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void,
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current) return;
      if (ref.current.contains(event.target as Node)) return;
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [handler]);

  return ref as RefObject<T>;
}
