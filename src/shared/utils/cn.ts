import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with clsx — the standard utility for conditional classes.
 * Usage: cn('base-class', condition && 'conditional-class', { 'object-class': isActive })
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
