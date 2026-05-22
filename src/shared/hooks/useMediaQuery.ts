import { useEffect, useState } from 'react';

const breakpoints = {
  sm:  '(min-width: 640px)',
  md:  '(min-width: 768px)',
  lg:  '(min-width: 1024px)',
  xl:  '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
} as const;

type Breakpoint = keyof typeof breakpoints;

/**
 * Returns true when the viewport matches the given media query or breakpoint alias.
 * Usage: useMediaQuery('md') or useMediaQuery('(min-width: 900px)')
 */
export function useMediaQuery(query: Breakpoint | string): boolean {
  const mediaQuery = breakpoints[query as Breakpoint] ?? query;

  const [matches, setMatches] = useState<boolean>(
    () => window.matchMedia(mediaQuery).matches,
  );

  useEffect(() => {
    const mql      = window.matchMedia(mediaQuery);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);

    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [mediaQuery]);

  return matches;
}

/** Convenience hooks for common breakpoints */
export const useIsMobile  = () => !useMediaQuery('md');
export const useIsTablet  = () => useMediaQuery('md') && !useMediaQuery('lg');
export const useIsDesktop = () => useMediaQuery('lg');
