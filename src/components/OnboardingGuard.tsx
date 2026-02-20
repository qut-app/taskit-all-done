import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';

interface OnboardingGuardProps {
  children: ReactNode;
}

/**
 * Wraps protected routes to ensure onboarding is completed.
 * If user is authenticated but hasn't completed onboarding, redirect to /onboarding.
 * This guard sits INSIDE AuthGuard (user is already authenticated).
 */
const OnboardingGuard = ({ children }: OnboardingGuardProps) => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  // Still loading profile — show nothing (AuthGuard already handled auth loading)
  if (profileLoading || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if onboarding is incomplete
  const isOnboardingIncomplete =
    !profile.onboarding_completed ||
    !profile.account_type ||
    !profile.active_role ||
    !profile.location;

  // For individual accounts, also require gender
  if (isOnboardingIncomplete || (profile.account_type === 'individual' && !profile.gender)) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default OnboardingGuard;
