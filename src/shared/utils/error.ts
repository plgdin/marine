/**
 * Custom typed error classes for the platform.
 * All errors must extend AppError to carry a code and optional details.
 */

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AUTH_ERROR', message, details);
    this.name = 'AuthError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, public readonly statusCode?: number) {
    super('NETWORK_ERROR', message, { statusCode });
    this.name = 'NetworkError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly fields?: Record<string, string>) {
    super('VALIDATION_ERROR', message, { fields });
    this.name = 'ValidationError';
  }
}

export class PermissionError extends AppError {
  constructor(resource: string, action: string) {
    super('PERMISSION_DENIED', `You don't have permission to ${action} ${resource}.`);
    this.name = 'PermissionError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found.`);
    this.name = 'NotFoundError';
  }
}

/** Extract a user-friendly message from any thrown value */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred.';
}

/** True if the error is a specific AppError code */
export function isErrorCode(error: unknown, code: string): boolean {
  return error instanceof AppError && error.code === code;
}
