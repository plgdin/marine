import { forwardRef } from 'react';
import { cn } from '@shared/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="w-full relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            'flex h-10 w-full rounded-lg border bg-surface-overlay px-3 py-2 text-sm text-text-primary',
            'border-border-default placeholder:text-text-tertiary',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan',
            'disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
            error && 'border-severity-critical focus-visible:ring-severity-critical',
            leftIcon && 'pl-9',
            rightIcon && 'pr-9',
            className,
          )}
          ref={ref}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">
            {rightIcon}
          </div>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-severity-critical font-medium">{error}</p>
        )}
      </div>
    );
  },
);
Input.displayName = 'Input';
