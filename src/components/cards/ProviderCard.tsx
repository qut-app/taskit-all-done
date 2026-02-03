import { Star, MapPin, Clock, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tables } from '@/integrations/supabase/types';

type ProviderProfile = Tables<'provider_profiles'>;
type Profile = Tables<'profiles'>;

interface ProviderWithProfile extends ProviderProfile {
  profile?: Profile | null;
}

interface ProviderCardProps {
  provider: ProviderWithProfile;
  onView?: () => void;
  onHire?: () => void;
}

const ProviderCard = ({ provider, onView, onHire }: ProviderCardProps) => {
  const profile = provider.profile;
  
  return (
    <Card variant="interactive" className="p-4">
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold text-xl">
            {profile?.full_name?.charAt(0) || 'P'}
          </div>
          {profile?.verification_status === 'verified' && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-success rounded-full flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-success-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground truncate">{profile?.full_name || 'Provider'}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{profile?.location || 'Location not set'}</span>
              </div>
            </div>
            {provider.is_recommended && (
              <Badge variant="soft" className="flex-shrink-0">Recommended</Badge>
            )}
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-1 mt-2">
            {(provider.service_categories || []).slice(0, 2).map((category) => (
              <Badge key={category} variant="outline" className="text-xs">
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
              <Star className="w-4 h-4 text-secondary fill-secondary" />
              <span className="font-semibold">{Number(provider.rating) || 0}</span>
              <span className="text-muted-foreground">({provider.review_count || 0})</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{provider.delivery_time || '3 days'}</span>
            </div>
            <Badge
              variant={provider.service_mode === 'online' ? 'online' : provider.service_mode === 'offline' ? 'offline' : 'soft'}
              className="text-xs"
            >
              {provider.service_mode === 'both' ? 'Online & Offline' : provider.service_mode}
            </Badge>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <Button variant="outline" className="flex-1" onClick={onView}>
          View Profile
        </Button>
        <Button className="flex-1" onClick={onHire}>
          Hire Now
        </Button>
      </div>
    </Card>
  );
};

export default ProviderCard;
