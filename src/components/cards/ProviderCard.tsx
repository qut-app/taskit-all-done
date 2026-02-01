import { Star, MapPin, Clock, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProviderProfile } from '@/context/AppContext';

interface ProviderCardProps {
  provider: ProviderProfile;
  onView?: () => void;
  onHire?: () => void;
}

const ProviderCard = ({ provider, onView, onHire }: ProviderCardProps) => {
  return (
    <Card variant="interactive" className="p-4">
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xl">
            {provider.fullName.charAt(0)}
          </div>
          {provider.verificationStatus === 'verified' && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-primary" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground truncate">{provider.fullName}</h3>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{provider.location}</span>
              </div>
            </div>
            {provider.isRecommended && (
              <Badge variant="soft" className="flex-shrink-0">Recommended</Badge>
            )}
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-1 mt-2">
            {provider.serviceCategories.slice(0, 2).map((category) => (
              <Badge key={category} variant="outline" className="text-xs">
                {category}
              </Badge>
            ))}
            {provider.serviceCategories.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{provider.serviceCategories.length - 2}
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-secondary fill-secondary" />
              <span className="font-semibold">{provider.rating}</span>
              <span className="text-muted-foreground">({provider.reviewCount})</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{provider.deliveryTime}</span>
            </div>
            <Badge
              variant={provider.serviceMode === 'online' ? 'online' : provider.serviceMode === 'offline' ? 'offline' : 'soft'}
              className="text-xs"
            >
              {provider.serviceMode === 'both' ? 'Online & Offline' : provider.serviceMode}
            </Badge>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <Button variant="outline" className="flex-1" onClick={onView}>
          View Profile
        </Button>
        <Button variant="hero" className="flex-1" onClick={onHire}>
          Hire Now
        </Button>
      </div>
    </Card>
  );
};

export default ProviderCard;
