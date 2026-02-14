import { motion } from 'framer-motion';
import { Star, MapPin, Clock, Building2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { OnlineIndicator } from '@/components/ui/OnlineIndicator';
import { Tables } from '@/integrations/supabase/types';

type ProviderProfile = Tables<'provider_profiles'>;

interface Profile {
  full_name: string;
  location?: string | null;
  verification_status: 'unverified' | 'pending' | 'verified';
  account_type?: string | null;
  company_name?: string | null;
  avatar_url?: string | null;
  is_online?: boolean | null;
  last_seen_at?: string | null;
}

interface ProviderWithProfile extends ProviderProfile {
  profile?: Profile | null;
}

interface ProviderCardProps {
  provider: ProviderWithProfile;
  onView?: () => void;
  onHire?: () => void;
  hiringState?: 'idle' | 'loading' | 'sent';
}

const ProviderCard = ({ provider, onView, onHire, hiringState = 'idle' }: ProviderCardProps) => {
  const profile = provider.profile;
  const isCompany = profile?.account_type === 'company';
  const displayName = isCompany ? profile?.company_name : profile?.full_name;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-4 border border-border hover:border-primary/30 transition-colors">
        <div className="flex gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <motion.div 
              className={`w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-xl ${
                isCompany 
                  ? 'bg-secondary/10 text-secondary' 
                  : 'bg-primary/10 text-primary'
              }`}
              whileHover={{ scale: 1.05 }}
            >
              {isCompany ? (
                <Building2 className="w-7 h-7" />
              ) : (
                displayName?.charAt(0) || 'P'
              )}
            </motion.div>
            <OnlineIndicator
              isOnline={profile?.is_online}
              lastSeenAt={profile?.last_seen_at}
              size="sm"
              className="absolute -bottom-0.5 -right-0.5"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground truncate">
                    {displayName || 'Provider'}
                  </h3>
                  <VerificationBadge 
                    status={profile?.verification_status || 'unverified'} 
                    accountType={isCompany ? 'company' : 'individual'}
                    size="sm"
                  />
                  {isCompany && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      Business
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{profile?.location || 'Location not set'}</span>
                </div>
              </div>
              {provider.is_recommended && (
                <Badge className="flex-shrink-0 bg-primary/10 text-primary border-0">
                  ⭐ Top Rated
                </Badge>
              )}
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(provider.service_categories || []).slice(0, 2).map((category) => (
                <Badge key={category} variant="secondary" className="text-xs">
                  {category}
                </Badge>
              ))}
              {(provider.service_categories?.length || 0) > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{provider.service_categories!.length - 2}
                </Badge>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-3 text-sm">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-warning fill-warning" />
                <span className="font-semibold">{Number(provider.rating) || 0}</span>
                <span className="text-muted-foreground">({provider.review_count || 0})</span>
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{provider.delivery_time || '3 days'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={onView}>
            View Profile
          </Button>
          <Button
            className="flex-1"
            onClick={onHire}
            disabled={hiringState !== 'idle'}
          >
            {hiringState === 'loading' ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Hiring...
              </span>
            ) : hiringState === 'sent' ? (
              '✅ Request Sent'
            ) : (
              'Hire Now'
            )}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

export default ProviderCard;