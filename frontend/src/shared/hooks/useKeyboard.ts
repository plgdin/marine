import { useEffect, useCallback, type RefObject } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface UseKeyboardOptions {
  /** Element to attach listener to. Defaults to window. */
  target?: RefObject<HTMLElement> | null;
  /** Only fire when the element is focused. */
  enabledWhenFocused?: boolean;
}

/**
 * Listen for keyboard shortcuts.
 * Usage: useKeyboard('Escape', () => closeModal())
 * Usage: useKeyboard('k', handler, { modifier: 'meta' })
 */
export function useKeyboard(
  key: string,
  handler: KeyHandler,
  options: UseKeyboardOptions & { modifier?: 'ctrl' | 'meta' | 'alt' | 'shift' } = {},
): void {
  const { target, modifier } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const modMatch = modifier
        ? (modifier === 'ctrl' && event.ctrlKey)
          || (modifier === 'meta' && event.metaKey)
          || (modifier === 'alt' && event.altKey)
          || (modifier === 'shift' && event.shiftKey)
        : true;

      if (event.key === key && modMatch) {
        handler(event);
      }
    },
    [key, handler, modifier],
  );

  useEffect(() => {
    const el = target?.current ?? window;
    el.addEventListener('keydown', handleKeyDown as EventListener);
    return () => el.removeEventListener('keydown', handleKeyDown as EventListener);
  }, [target, handleKeyDown]);
}
