import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useCompanySubscription } from '@/hooks/useCompanySubscription';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';

interface CompanySubscriptionGateProps {
  children: ReactNode;
}

const CompanySubscriptionGate = ({ children }: CompanySubscriptionGateProps) => {
  const { profile, loading: profileLoading } = useProfile();
  const { isGated, loading } = useCompanySubscription();

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only gate company accounts
  const isCompany = (profile as any)?.account_type === 'company';
  if (isCompany && isGated) {
    return <Navigate to="/company/upgrade" replace />;
  }

  return <>{children}</>;
};

export default CompanySubscriptionGate;
