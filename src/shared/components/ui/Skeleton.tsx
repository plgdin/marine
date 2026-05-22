import { cn } from '@shared/utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('skeleton rounded-md', className)}
      {...props}
    />
  );
}
