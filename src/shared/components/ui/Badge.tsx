import { forwardRef } from 'react';
import { cn } from '@shared/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'neutral' | 'info' | 'success' | 'warning' | 'critical';
  size?: 'sm' | 'md';
}

export const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'neutral', size = 'md', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full font-semibold transition-colors',
          {
            'px-2 py-0.5 text-[10px]': size === 'sm',
            'px-2.5 py-0.5 text-xs': size === 'md',
          },
          {
            'bg-surface-overlay text-text-secondary border border-border-default':
              variant === 'neutral',
            'bg-[rgba(64,196,255,0.1)] text-severity-info border border-[rgba(64,196,255,0.2)]':
              variant === 'info',
            'bg-[rgba(0,230,118,0.1)] text-severity-success border border-[rgba(0,230,118,0.2)]':
              variant === 'success',
            'bg-[rgba(255,171,0,0.1)] text-severity-warning border border-[rgba(255,171,0,0.2)]':
              variant === 'warning',
            'bg-[rgba(255,23,68,0.1)] text-severity-critical border border-[rgba(255,23,68,0.2)]':
              variant === 'critical',
          },
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Badge.displayName = 'Badge';
