import { ReactNode } from 'react';
import CompanyBottomNavigation from './CompanyBottomNavigation';
import { cn } from '@/lib/utils';

interface CompanyLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
  className?: string;
}

const CompanyLayout = ({ children, showBottomNav = true, className }: CompanyLayoutProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-lg mx-auto">
      <main className={cn('flex-1', showBottomNav && 'pb-20', className)}>
        {children}
      </main>
      {showBottomNav && <CompanyBottomNavigation />}
    </div>
  );
};

export default CompanyLayout;
