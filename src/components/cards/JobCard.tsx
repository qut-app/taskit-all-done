import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, DollarSign, User, Pencil, Scale, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'>;
type Profile = Tables<'profiles'>;

interface JobWithRequester extends Job {
  requester_profile?: Profile | null;
}

interface JobCardProps {
  job: JobWithRequester;
  variant?: 'default' | 'compact';
  showActions?: boolean;
  isOwner?: boolean;
  onView?: () => void;
  onApply?: () => void;
  onEdit?: () => void;
  onBargain?: () => void;
  showBargainHint?: boolean;
  applicationStatus?: 'applied' | 'applying';
}

const JobCard = ({ 
  job, variant = 'default', showActions = true, isOwner = false, 
  onView, onApply, onEdit, onBargain, showBargainHint, applicationStatus 
}: JobCardProps) => {
  const navigate = useNavigate();
  const statusColors = {
    open: 'success',
    assigned: 'warning',
    in_progress: 'soft',
    completed: 'default',
    cancelled: 'destructive',
  } as const;

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (variant === 'compact') {
    return (
      <Card variant="interactive" className="p-4" onClick={onView}>
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate">{job.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{job.description}</p>
          </div>
          <Badge variant={statusColors[job.status || 'open']}>{(job.status || 'open').replace('_', ' ')}</Badge>
        </div>
        <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
          {job.budget && (
            <span className="font-medium text-foreground">{formatBudget(Number(job.budget))}</span>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{job.expected_delivery_time}</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="p-4">
      <div className="flex justify-between items-start gap-2 mb-3">
        <Badge variant="soft">{job.category}</Badge>
        <div className="flex items-center gap-1.5">
          {isOwner && (job.status === 'open' || job.status === 'assigned' || job.status === 'in_progress') && (
            <Button variant="ghost" size="iconSm" onClick={onEdit} className="text-muted-foreground hover:text-primary">
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          <Badge variant={statusColors[job.status || 'open']}>{(job.status || 'open').replace('_', ' ')}</Badge>
        </div>
      </div>

      <h3 className="font-semibold text-lg text-foreground">{job.title}</h3>
      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{job.description}</p>

      <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
        <User className="w-4 h-4" />
        <span>{job.requester_profile?.full_name || 'Anonymous'}</span>
      </div>

      <div className="flex flex-wrap gap-3 mt-3 text-sm">
        {job.budget && (
          <div className="flex items-center gap-1 text-foreground font-semibold">
            <DollarSign className="w-4 h-4 text-success" />
            <span>{formatBudget(Number(job.budget))}</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{job.expected_delivery_time}</span>
        </div>
        {job.location && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{job.location}</span>
          </div>
        )}
      </div>

      <Badge
        variant={job.service_mode === 'online' ? 'online' : 'offline'}
        className="mt-3"
      >
        {job.service_mode === 'online' ? 'Remote' : job.service_mode === 'offline' ? 'On-site' : 'Remote/On-site'}
      </Badge>

      {showActions && job.status === 'open' && (
        <div className="space-y-2 mt-4">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => navigate(`/job/${job.id}`)}>
              View Details
            </Button>
            {applicationStatus === 'applied' ? (
              <Button className="flex-1" disabled variant="soft">
                Pending ⏳
              </Button>
            ) : applicationStatus === 'applying' ? (
              <Button className="flex-1" disabled>
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                Applying...
              </Button>
            ) : (
              <Button className="flex-1" onClick={onApply}>
                Apply Now
              </Button>
            )}
          </div>
          {/* Bargain button */}
          {onBargain && (
            <Button variant="outline" className="w-full gap-1" size="sm" onClick={onBargain}>
              <Scale className="w-4 h-4" />
              Negotiate Price
            </Button>
          )}
          {showBargainHint && !onBargain && (
            <p className="text-[10px] text-center text-muted-foreground">
              ⚖️ Subscribe to negotiate prices
            </p>
          )}
        </div>
      )}
    </Card>
  );
};

export default JobCard;
