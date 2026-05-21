import { Component, type ReactNode, type ErrorInfo } from 'react';
import { ErrorFallback } from '@shared/components/feedback/ErrorFallback';
import { logger }        from '@shared/utils/logger';

interface Props {
  children:  ReactNode;
  fallback?: ReactNode;
  onError?:  (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error:    Error | null;
}

/**
 * Class-based error boundary (required by React for componentDidCatch).
 * Wrap route segments or feature modules to isolate rendering failures.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error('ErrorBoundary caught error', error, {
      componentStack: info.componentStack ?? undefined,
    });
    this.props.onError?.(error, info);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <ErrorFallback
          error={this.state.error ?? undefined}
          onReset={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}
