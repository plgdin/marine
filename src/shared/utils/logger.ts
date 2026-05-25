/**
 * Structured application logger.
 * In production, errors are sent to Sentry (or similar).
 * In development, logs go to the console with context.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level:   LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?:  unknown;
}

const isDev = import.meta.env.DEV;

function emit({ level, message, context, error }: LogEntry): void {
  if (!isDev && level === 'debug') return;

  const timestamp = new Date().toISOString();
  const prefix    = `[MarineTrack] [${timestamp}]`;

  switch (level) {
    case 'debug': console.debug(prefix, message, context ?? '');         break;
    case 'info':  console.info(prefix, message, context ?? '');          break;
    case 'warn':  console.warn(prefix, message, context ?? '', error ?? ''); break;
    case 'error': console.error(prefix, message, context ?? '', error ?? ''); break;
  }

  // Production: forward to error tracking service
  if (!isDev && (level === 'error' || level === 'warn')) {
    // TODO: Sentry.captureMessage(message, { level, extra: { context, error } });
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    emit({ level: 'debug', message, context }),

  info: (message: string, context?: Record<string, unknown>) =>
    emit({ level: 'info', message, context }),

  warn: (message: string, context?: Record<string, unknown>, error?: unknown) =>
    emit({ level: 'warn', message, context, error }),

  error: (message: string, error?: unknown, context?: Record<string, unknown>) =>
    emit({ level: 'error', message, context, error }),
};
