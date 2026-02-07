import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users, CheckCircle, XCircle, MessageSquare, Star } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import MobileLayout from '@/components/navigation/MobileLayout';
import JobCard from '@/components/cards/JobCard';
import EditJobDialog from '@/components/jobs/EditJobDialog';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useJobs } from '@/hooks/useJobs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tables } from '@/integrations/supabase/types';

const MyJobs = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { myJobs, myApplications, loading: jobsLoading, acceptProvider, updateJob } = useJobs();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('active');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [showRateDialog, setShowRateDialog] = useState(false);
  const [ratingJobId, setRatingJobId] = useState<string | null>(null);
  const [ratingUserId, setRatingUserId] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [editingJob, setEditingJob] = useState<Tables<'jobs'> | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const fetchApplications = async (jobId: string) => {
    setLoadingApps(true);
    setSelectedJobId(jobId);
    
    const { data } = await supabase
      .from('job_applications')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      // Get provider profiles
      const providerIds = data.map(a => a.provider_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', providerIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      
      setApplications(data.map(app => ({
        ...app,
        provider_profile: profileMap.get(app.provider_id),
      })));
    } else {
      setApplications([]);
    }
    setLoadingApps(false);
  };

  const handleAcceptProvider = async (applicationId: string, providerId: string) => {
    if (!selectedJobId) return;
    const { error } = await acceptProvider(selectedJobId, applicationId, providerId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Provider accepted!', description: 'The job is now in progress.' });
      setSelectedJobId(null);
    }
  };

  const handleRateRequester = async () => {
    if (!ratingJobId || !ratingUserId || !user || rating === 0) return;

    const { error } = await supabase
      .from('reviews')
      .insert({
        job_id: ratingJobId,
        reviewer_id: user.id,
        reviewee_id: ratingUserId,
        overall_rating: rating,
        comment: ratingComment || null,
      });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Rating submitted!' });
      setShowRateDialog(false);
      setRating(0);
      setRatingComment('');
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isProvider = profile?.active_role === 'provider';

  const jobs = isProvider 
    ? myApplications.map(app => ({ ...app.job, application_status: app.status })).filter(Boolean)
    : myJobs;

  const activeJobs = jobs.filter(j => j && (j.status === 'open' || j.status === 'assigned' || j.status === 'in_progress'));
  const completedJobs = jobs.filter(j => j && j.status === 'completed');
  const cancelledJobs = jobs.filter(j => j && j.status === 'cancelled');

  return (
    <MobileLayout>
      <header className="p-4 safe-top">
        <h1 className="text-2xl font-bold text-foreground">My Jobs</h1>
        <p className="text-muted-foreground">
          {isProvider ? 'Manage your applications' : 'Track your posted jobs'}
        </p>
      </header>

      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="active" className="flex-1">
              Active ({activeJobs.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1">
              Completed ({completedJobs.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="flex-1">
              Cancelled ({cancelledJobs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-3">
            {jobsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : activeJobs.length > 0 ? (
              activeJobs.map((job) => (
                job && (
                  <div key={job.id}>
                    <JobCard
                      job={job as any}
                      showActions={false}
                      isOwner={!isProvider}
                      onEdit={() => setEditingJob(job as any)}
                    />
                    {/* Show "View Applications" for requesters on open jobs */}
                    {!isProvider && job.status === 'open' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2 gap-1"
                        onClick={() => fetchApplications(job.id)}
                      >
                        <Users className="w-4 h-4" />
                        View Applications
                      </Button>
                    )}
                    {/* Providers can rate the requester on completed jobs */}
                    {isProvider && job.status === 'completed' && (
                      <Button
                        variant="soft"
                        size="sm"
                        className="w-full mt-2 gap-1"
                        onClick={() => {
                          setRatingJobId(job.id);
                          setRatingUserId((job as any).requester_id);
                          setShowRateDialog(true);
                        }}
                      >
                        <Star className="w-4 h-4" />
                        Rate Job Giver
                      </Button>
                    )}
                  </div>
                )
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No active jobs</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4 space-y-3">
            {completedJobs.length > 0 ? (
              completedJobs.map((job) => (
                job && (
                  <div key={job.id}>
                    <JobCard job={job as any} showActions={false} />
                    {isProvider && (
                      <Button
                        variant="soft"
                        size="sm"
                        className="w-full mt-2 gap-1"
                        onClick={() => {
                          setRatingJobId(job.id);
                          setRatingUserId((job as any).requester_id);
                          setShowRateDialog(true);
                        }}
                      >
                        <Star className="w-4 h-4" />
                        Rate Job Giver
                      </Button>
                    )}
                  </div>
                )
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No completed jobs yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-4 space-y-3">
            {cancelledJobs.length > 0 ? (
              cancelledJobs.map((job) => (
                job && <JobCard key={job.id} job={job as any} showActions={false} />
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No cancelled jobs</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Applications Dialog */}
      <Dialog open={!!selectedJobId} onOpenChange={() => setSelectedJobId(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Applications
            </DialogTitle>
          </DialogHeader>

          {loadingApps ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No applications yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications.map((app) => (
                <Card key={app.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {app.provider_profile?.full_name?.charAt(0) || 'P'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">
                        {app.provider_profile?.full_name || 'Provider'}
                      </p>
                      <p className="text-xs text-muted-foreground">{app.provider_profile?.email}</p>
                      {app.message && (
                        <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                          <p className="text-sm text-foreground flex items-start gap-1">
                            <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            {app.message}
                          </p>
                        </div>
                      )}
                      <Badge variant="outline" className="mt-2 text-xs">
                        {app.status || 'pending'}
                      </Badge>
                    </div>
                  </div>
                  {app.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        className="flex-1 bg-success hover:bg-success/90"
                        onClick={() => handleAcceptProvider(app.id, app.provider_id)}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-destructive"
                        onClick={() => {
                          supabase
                            .from('job_applications')
                            .update({ status: 'rejected' })
                            .eq('id', app.id)
                            .then(() => {
                              if (selectedJobId) fetchApplications(selectedJobId);
                            });
                        }}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rate Job Giver Dialog */}
      <Dialog open={showRateDialog} onOpenChange={setShowRateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate Job Giver</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= rating
                          ? 'fill-warning text-warning'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Comment (optional)</label>
              <Textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Share your experience..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRateDialog(false)}>Cancel</Button>
            <Button onClick={handleRateRequester} disabled={rating === 0}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Job Dialog */}
      <EditJobDialog
        job={editingJob}
        open={!!editingJob}
        onOpenChange={(open) => { if (!open) setEditingJob(null); }}
        onSaved={() => {
          setEditingJob(null);
          // refetch is handled by useJobs internally
        }}
      />
    </MobileLayout>
  );
};

export default MyJobs;
