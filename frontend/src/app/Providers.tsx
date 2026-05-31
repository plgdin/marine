import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools }  from '@tanstack/react-query-devtools';
import type { ReactNode }      from 'react';
import { queryClient }         from './query-client';
import { AuthProvider }        from '@features/auth/components/AuthProvider';
import { ToastProvider }       from '@shared/components/feedback/ToastProvider';
import env                     from '@config/env';

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Providers composition root.
 * Order matters: outer providers must not depend on inner ones.
 *
 * Stack (outermost → innermost):
 *   1. QueryClientProvider — async data layer
 *   2. AuthProvider        — reads session, syncs auth store
 *   3. ToastProvider       — global toast notifications
 *   4. children            — app content
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>

      {/* DevTools only in dev */}
      {env.isDev && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  );
}
