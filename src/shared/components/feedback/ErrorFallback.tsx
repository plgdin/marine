import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@config/routes';

interface ErrorFallbackProps {
  error?:   Error;
  onReset?: () => void;
}

/**
 * Error fallback UI — shown when ErrorBoundary catches a render error.
 */
export function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--color-surface-base)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center space-y-6"
      >
        {/* Icon */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{
            background: 'rgba(255, 23, 68, 0.12)',
            border: '1px solid rgba(255, 23, 68, 0.2)',
          }}
        >
          <AlertTriangle size={32} style={{ color: 'var(--color-severity-critical)' }} />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Something went wrong
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            An unexpected error occurred. Our team has been notified.
          </p>
          {import.meta.env.DEV && error?.message && (
            <pre
              className="mt-4 p-4 rounded-lg text-left text-xs overflow-auto max-h-32"
              style={{
                background: 'var(--color-surface-overlay)',
                color: 'var(--color-severity-warning)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              {error.message}
            </pre>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          {onReset && (
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150"
              style={{
                background: 'var(--color-surface-overlay)',
                border: '1px solid var(--color-border-default)',
                color: 'var(--color-text-primary)',
              }}
            >
              <RefreshCw size={14} />
              Try again
            </button>
          )}
          <button
            onClick={() => navigate(ROUTES.DASHBOARD)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150"
            style={{
              background: 'var(--color-marine-600)',
              color: 'white',
            }}
          >
            <Home size={14} />
            Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}
