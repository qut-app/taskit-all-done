import { Home, Search, PlusCircle, Briefcase, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';

const BottomNavigation = () => {
  const location = useLocation();
  const { currentRole } = useApp();

  const requesterItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Search, label: 'Discover', path: '/discover' },
    { icon: PlusCircle, label: 'Post Job', path: '/post-job' },
    { icon: Briefcase, label: 'My Jobs', path: '/my-jobs' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  const providerItems = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Search, label: 'Find Jobs', path: '/find-jobs' },
    { icon: Briefcase, label: 'My Jobs', path: '/my-jobs' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  const items = currentRole === 'provider' ? providerItems : requesterItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                isActive ? 'text-accent' : 'text-muted-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'w-5 h-5 mb-1 transition-all',
                  isActive && 'scale-110'
                )}
              />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
