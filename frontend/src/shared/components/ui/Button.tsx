import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@shared/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-medium transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan',
          'disabled:opacity-50 disabled:cursor-not-allowed',

          // Sizes
          {
            'px-3 py-1.5 text-xs rounded-md': size === 'sm',
            'px-4 py-2 text-sm rounded-lg': size === 'md',
            'px-6 py-3 text-base rounded-xl': size === 'lg',
            'p-2 rounded-lg': size === 'icon',
          },

          // Variants
          {
            'bg-marine-600 text-white hover:bg-marine-500 shadow-sm border border-marine-500':
              variant === 'primary',
            'bg-surface-overlay text-text-primary hover:bg-surface-active border border-border-default':
              variant === 'secondary',
            'bg-transparent text-text-primary hover:bg-surface-hover border border-border-default':
              variant === 'outline',
            'bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary':
              variant === 'ghost',
            'bg-severity-critical text-white hover:bg-red-600 shadow-sm border border-red-500':
              variant === 'danger',
          },
          className,
        )}
        {...props}
      >
        {isLoading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin flex-shrink-0" />
        )}
        {!isLoading && leftIcon && (
          <span className="mr-2 flex-shrink-0">{leftIcon}</span>
        )}
        <span className="truncate">{children}</span>
        {!isLoading && rightIcon && (
          <span className="ml-2 flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
