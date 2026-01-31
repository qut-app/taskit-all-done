import { ReactNode } from 'react';
import BottomNavigation from './BottomNavigation';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
  className?: string;
}

const MobileLayout = ({ children, showBottomNav = true, className }: MobileLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <main className={cn(
        'flex-1',
        showBottomNav && 'pb-20',
        className
      )}>
        {children}
      </main>
      {showBottomNav && <BottomNavigation />}
    </div>
  );
};

export default MobileLayout;
