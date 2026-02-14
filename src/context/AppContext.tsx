import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'requester' | 'provider' | null;

interface AppContextType {
  currentRole: UserRole;
  switchRole: (role: UserRole) => Promise<{ error?: string }>;
  isInitialized: boolean;
  roleSwitchCooldown: number; // seconds remaining
  isActionRestricted: boolean; // 10-min post-switch restriction
  isAdmin: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const SERVICE_CATEGORIES = [
  'Cleaning', 'Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Moving',
  'Tutoring', 'Web Development', 'Graphic Design', 'Writing', 'Photography',
  'Video Editing', 'Social Media', 'Virtual Assistant', 'Data Entry',
  'Translation', 'Cooking', 'Gardening', 'Pet Care', 'Delivery',
];

export const DELIVERY_TIMES = ['1 day', '2 days', '3 days', '1 week', '2 weeks', '1 month'];

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const ACTION_RESTRICT_MS = 10 * 60 * 1000; // 10 minutes

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, updateProfile } = useProfile();
  const [currentRole, setCurrentRole] = useState<UserRole>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [roleSwitchCooldown, setRoleSwitchCooldown] = useState(0);
  const [isActionRestricted, setIsActionRestricted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [lastSwitchAt, setLastSwitchAt] = useState<Date | null>(null);

  // Check admin status
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  // Sync role from profile
  useEffect(() => {
    if (!authLoading && !profileLoading) {
      if (profile?.active_role) {
        setCurrentRole(profile.active_role as UserRole);
      }
      if (profile?.last_role_switch_at) {
        setLastSwitchAt(new Date(profile.last_role_switch_at));
      }
      setIsInitialized(true);
    }
  }, [authLoading, profileLoading, profile]);

  // Cooldown timer
  useEffect(() => {
    if (!lastSwitchAt || isAdmin) {
      setRoleSwitchCooldown(0);
      return;
    }
    const updateCooldown = () => {
      const elapsed = Date.now() - lastSwitchAt.getTime();
      const remaining = Math.max(0, Math.ceil((COOLDOWN_MS - elapsed) / 1000));
      setRoleSwitchCooldown(remaining);
      setIsActionRestricted(elapsed < ACTION_RESTRICT_MS);
    };
    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [lastSwitchAt, isAdmin]);

  const switchRole = async (role: UserRole): Promise<{ error?: string }> => {
    if (!user || !role) return { error: 'Not authenticated' };

    // Check cooldown (admins bypass)
    if (!isAdmin && roleSwitchCooldown > 0) {
      const hours = Math.ceil(roleSwitchCooldown / 3600);
      return { error: `Please wait ${hours}h before switching roles again.` };
    }

    const previousRole = currentRole;
    const now = new Date().toISOString();

    setCurrentRole(role);
    setLastSwitchAt(new Date());

    // Update profile
    await updateProfile({ active_role: role, last_role_switch_at: now });

    // Log the switch
    const deviceType = /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop';
    await supabase.from('role_switch_logs').insert({
      user_id: user.id,
      previous_role: previousRole || 'none',
      new_role: role,
      device_type: deviceType,
    });

    // Check for abuse: 5+ switches in 48h → auto-flag
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('role_switch_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', twoDaysAgo);

    if (count && count >= 5) {
      // Auto-flag
      await supabase.from('suspicious_flags').insert({
        user_id: user.id,
        flag_type: 'excessive_role_switching',
        description: `${count} role switches in 48 hours`,
      });
      // Notify admins
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');
      if (adminRoles) {
        const notifications = adminRoles.map((ar) => ({
          user_id: ar.user_id,
          title: '⚠️ Role Abuse Detected',
          message: `User has switched roles ${count} times in 48 hours.`,
          type: 'moderation',
          metadata: { flagged_user_id: user.id },
        }));
        await supabase.from('notifications').insert(notifications);
      }
    }

    return {};
  };

  return (
    <AppContext.Provider value={{ currentRole, switchRole, isInitialized, roleSwitchCooldown, isActionRestricted, isAdmin }}>
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
