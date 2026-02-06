import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

export type UserRole = 'requester' | 'provider' | null;

interface AppContextType {
  currentRole: UserRole;
  switchRole: (role: UserRole) => void;
  isInitialized: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const SERVICE_CATEGORIES = [
  'Cleaning', 'Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Moving',
  'Tutoring', 'Web Development', 'Graphic Design', 'Writing', 'Photography',
  'Video Editing', 'Social Media', 'Virtual Assistant', 'Data Entry',
  'Translation', 'Cooking', 'Gardening', 'Pet Care', 'Delivery',
];

export const DELIVERY_TIMES = ['1 day', '2 days', '3 days', '1 week', '2 weeks', '1 month'];

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const [currentRole, setCurrentRole] = useState<UserRole>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Sync role from profile
  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (profile?.active_role) {
        setCurrentRole(profile.active_role as UserRole);
      }
      setIsInitialized(true);
    }
  }, [authLoading, profileLoading, profile]);

  const switchRole = async (role: UserRole) => {
    setCurrentRole(role);
    if (user && role) {
      await updateProfile({ active_role: role });
    }
  };

  return (
    <AppContext.Provider value={{ currentRole, switchRole, isInitialized }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
