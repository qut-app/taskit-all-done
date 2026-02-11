import { cn } from '@/lib/utils';

interface OnlineIndicatorProps {
  isOnline?: boolean | null;
  lastSeenAt?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}

export const OnlineIndicator = ({ isOnline, lastSeenAt, size = 'sm', className }: OnlineIndicatorProps) => {
  const isActive = (() => {
    if (isOnline) return true;
    if (!lastSeenAt) return false;
    const diff = Date.now() - new Date(lastSeenAt).getTime();
    return diff < 5 * 60 * 1000; // 5 minutes
  })();

  const sizeClass = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';

  return (
    <span
      className={cn(
        'inline-block rounded-full border-2 border-background',
        sizeClass,
        isActive ? 'bg-green-500' : 'bg-muted-foreground/40',
        className
      )}
      title={isActive ? 'Online' : 'Offline'}
    />
  );
};
