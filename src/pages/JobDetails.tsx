import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, Clock, DollarSign, User, Wifi, Map, 
  Users, Loader2, Calendar, Building2, Shield, Send, Scale
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { OnlineIndicator } from '@/components/ui/OnlineIndicator';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { formatDistanceToNow } from 'date-fns';

type Job = Tables<'jobs'>;
type Profile = Tables<'profiles'>;

interface JobWithRequester extends Job {
  requester_profile?: Profile | null;
}

const JobDetails = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [job, setJob] = useState<JobWithRequester | null>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  const [applicantCount, setApplicantCount] = useState(0);
  const [hasApplied, setHasApplied] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    
    const fetchJobDetails = async () => {
      const { data: jobData, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error || !jobData) {
        setLoading(false);
        return;
      }

      // Fetch requester profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', jobData.requester_id)
        .single();

      setJob({ ...jobData, requester_profile: profileData });

      // Fetch application count
      const { count } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', jobId);

      setApplicantCount(count || 0);

      // Check if current user applied
      if (user) {
        const { data: myApp } = await supabase
          .from('job_applications')
          .select('id')
          .eq('job_id', jobId)
          .eq('provider_id', user.id)
          .maybeSingle();
        setHasApplied(!!myApp);

        // If owner, fetch applications
        if (jobData.requester_id === user.id) {
          const { data: apps } = await supabase
            .from('job_applications')
            .select('*')
            .eq('job_id', jobId)
            .order('created_at', { ascending: false });

          if (apps && apps.length > 0) {
            const providerIds = apps.map(a => a.provider_id);
            const { data: appProfiles } = await supabase
              .from('profiles')
              .select('*')
              .in('user_id', providerIds);
            const { data: appProvProfiles } = await supabase
              .from('provider_profiles')
              .select('*')
              .in('user_id', providerIds);

            const profileMap: Record<string, any> = {};
            (appProfiles || []).forEach(p => { profileMap[p.user_id] = p; });
            const provMap: Record<string, any> = {};
            (appProvProfiles || []).forEach(p => { provMap[p.user_id] = p; });

            setApplications(apps.map(app => ({
              ...app,
              profile: profileMap[app.provider_id],
              providerProfile: provMap[app.provider_id],
            })));
          }
        }
      }

      setLoading(false);
    };

    fetchJobDetails();

    // Realtime updates
    const channel = supabase
      .channel(`job-detail-${jobId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs', filter: `id=eq.${jobId}` }, () => fetchJobDetails())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_applications', filter: `job_id=eq.${jobId}` }, () => fetchJobDetails())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [jobId, user]);

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
  };

  const statusColors = {
    open: 'success',
    assigned: 'warning',
    in_progress: 'soft',
    completed: 'default',
    cancelled: 'destructive',
  } as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <h2 className="text-xl font-bold text-foreground">Job not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const isOwner = user?.id === job.requester_id;
  const profile = job.requester_profile;
  const isCompany = profile?.account_type === 'company';

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 safe-top border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold text-lg flex-1">Job Details</h1>
        <Badge variant={statusColors[job.status || 'open']}>
          {(job.status || 'open').replace('_', ' ')}
        </Badge>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 space-y-4"
      >
        {/* Title & Category */}
        <div>
          <Badge variant="soft" className="mb-2">{job.category}</Badge>
          <h2 className="text-2xl font-bold text-foreground">{job.title}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Posted {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
          </p>
        </div>

        {/* Description */}
        {job.description && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Description</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
          </Card>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          {job.budget && (
            <Card className="p-3 text-center">
              <DollarSign className="w-5 h-5 text-success mx-auto mb-1" />
              <span className="text-lg font-bold text-foreground">{formatBudget(Number(job.budget))}</span>
              <p className="text-xs text-muted-foreground">Budget</p>
            </Card>
          )}
          <Card className="p-3 text-center">
            <Clock className="w-5 h-5 text-primary mx-auto mb-1" />
            <span className="text-lg font-bold text-foreground">{job.expected_delivery_time}</span>
            <p className="text-xs text-muted-foreground">Delivery Time</p>
          </Card>
          <Card className="p-3 text-center">
            <Users className="w-5 h-5 text-secondary mx-auto mb-1" />
            <span className="text-lg font-bold text-foreground">{applicantCount}</span>
            <p className="text-xs text-muted-foreground">Applicants</p>
          </Card>
          <Card className="p-3 text-center">
            {job.service_mode === 'online' ? (
              <Wifi className="w-5 h-5 text-primary mx-auto mb-1" />
            ) : (
              <Map className="w-5 h-5 text-primary mx-auto mb-1" />
            )}
            <span className="text-sm font-bold text-foreground">
              {job.service_mode === 'online' ? 'Remote' : job.service_mode === 'offline' ? 'On-site' : 'Both'}
            </span>
            <p className="text-xs text-muted-foreground">Mode</p>
          </Card>
        </div>

        {/* Location */}
        {job.location && (
          <Card className="p-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-foreground">{job.location}</span>
          </Card>
        )}

        {/* Requester Profile */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Posted by</h3>
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => profile && navigate(`/view-profile/${profile.user_id}`)}
          >
            <div className="relative">
              <Avatar className="w-12 h-12">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {(isCompany ? profile?.company_name : profile?.full_name)?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <OnlineIndicator
                isOnline={profile?.is_online}
                lastSeenAt={profile?.last_seen_at}
                size="sm"
                className="absolute -bottom-0.5 -right-0.5"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground truncate">
                  {isCompany ? profile?.company_name : profile?.full_name || 'Anonymous'}
                </span>
                <VerificationBadge
                  status={profile?.verification_status as any}
                  accountType={isCompany ? 'company' : 'individual'}
                  size="sm"
                />
              </div>
              {profile?.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{profile.location}
                </p>
              )}
              {profile?.requester_rating ? (
                <p className="text-xs text-muted-foreground">
                  ⭐ {Number(profile.requester_rating).toFixed(1)} ({profile.requester_review_count || 0} reviews)
                </p>
              ) : null}
            </div>
            {isCompany && <Badge variant="outline" className="flex-shrink-0"><Building2 className="w-3 h-3 mr-1" />Company</Badge>}
          </div>
        </Card>

        {/* Applications (for job owner) */}
        {isOwner && applications.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">
              Applications ({applications.length})
            </h3>
            <div className="space-y-2">
              {applications.map((app) => (
                <Card key={app.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={app.profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {app.profile?.full_name?.charAt(0) || 'P'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{app.profile?.full_name || 'Provider'}</p>
                      <p className="text-xs text-muted-foreground">
                        {app.providerProfile?.rating ? `⭐ ${Number(app.providerProfile.rating).toFixed(1)}` : 'New provider'}
                        {' · '}
                        {app.status || 'pending'}
                      </p>
                    </div>
                    <Badge variant={app.status === 'accepted' ? 'success' : app.status === 'rejected' ? 'destructive' : 'soft'}>
                      {app.status || 'pending'}
                    </Badge>
                  </div>
                  {app.message && (
                    <p className="text-xs text-muted-foreground mt-2 pl-13">{app.message}</p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isOwner && job.status === 'open' && (
          <div className="safe-bottom pt-2 space-y-2">
            {hasApplied ? (
              <Button variant="soft" size="lg" className="w-full" disabled>
                Applied ⏳
              </Button>
            ) : (
              <Button 
                variant="hero" 
                size="lg" 
                className="w-full"
                onClick={() => navigate(`/find-jobs?apply=${jobId}`)}
              >
                <Send className="w-5 h-5 mr-2" />
                Apply Now
              </Button>
            )}
          </div>
        )}

        {isOwner && job.status === 'open' && (
          <div className="safe-bottom pt-2">
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full"
              onClick={() => navigate('/my-jobs')}
            >
              <Users className="w-5 h-5 mr-2" />
              Manage Applications
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default JobDetails;
