import { QueryClient } from '@tanstack/react-query';
import { QUERY_DEFAULTS } from '@shared/utils/constants';
import { logger } from '@shared/utils/logger';

/**
 * Shared QueryClient instance.
 * Configure once here; import anywhere you need imperative cache access.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:          QUERY_DEFAULTS.staleTime.normal,
      gcTime:             QUERY_DEFAULTS.gcTime,
      retry:              QUERY_DEFAULTS.retry,
      refetchOnWindowFocus: true,
      refetchOnReconnect:   true,
    },
    mutations: {
      onError: (error) => {
        logger.error('Mutation error', error);
      },
    },
  },
});
