import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users, CheckCircle, XCircle, MessageSquare, Star, MapPin, Shield, Clock, DollarSign, CreditCard, AlertTriangle } from 'lucide-react';
import { EscrowStatusBanner } from '@/components/jobs/EscrowStatusBanner';
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
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { usePaystackPayment } from '@/hooks/usePaystackPayment';
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
  const { initializePayment, loading: paymentLoading } = usePaystackPayment();
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

  // Plan selection state
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [showPlanDialog, setShowPlanDialog] = useState(false);

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
      const providerIds = data.map(a => a.provider_id);
      const applicationIds = data.map(a => a.id);
      
      const [profilesRes, providerProfilesRes, plansRes, subsRes] = await Promise.all([
        supabase.from('profiles').select('*').in('user_id', providerIds),
        supabase.from('provider_profiles').select('*').in('user_id', providerIds),
        supabase.from('pricing_plans').select('*').in('application_id', applicationIds),
        supabase.from('subscriptions').select('user_id').in('user_id', providerIds).eq('status', 'active'),
      ]);

      const profileMap = new Map((profilesRes.data || []).map(p => [p.user_id, p]));
      const providerMap = new Map((providerProfilesRes.data || []).map(p => [p.user_id, p]));
      const subsSet = new Set((subsRes.data || []).map(s => s.user_id));
      
      // Group plans by application_id
      const plansMap = new Map<string, any[]>();
      (plansRes.data || []).forEach(plan => {
        const existing = plansMap.get(plan.application_id) || [];
        existing.push(plan);
        plansMap.set(plan.application_id, existing);
      });

      const currentJob = myJobs.find(j => j.id === jobId);
      
      const enrichedApps = data.map(app => {
        const provProfile = profileMap.get(app.provider_id);
        const providerData = providerMap.get(app.provider_id);
        const plans = plansMap.get(app.id) || [];
        const isPaid = subsSet.has(app.provider_id);
        
        let distance: number | null = null;
        if (currentJob?.latitude && currentJob?.longitude && provProfile?.latitude && provProfile?.longitude) {
          distance = calculateDistance(
            Number(currentJob.latitude), Number(currentJob.longitude),
            Number(provProfile.latitude), Number(provProfile.longitude)
          );
        }

        // Auto-ranking score
        const ratingScore = (Number(providerData?.rating) || 0) * 0.4;
        const onTimeScore = (Number(providerData?.on_time_delivery_score) || 0) / 100 * 5 * 0.2;
        const proximityScore = distance != null ? Math.max(0, 5 - distance / 10) * 0.2 : 0;
        const reviewScore = Math.min(5, (Number(providerData?.review_count) || 0) / 10 * 5) * 0.1;
        const subBoost = isPaid ? 10 * 0.1 : 0;
        const totalScore = ratingScore + onTimeScore + proximityScore + reviewScore + subBoost;

        return {
          ...app,
          provider_profile: provProfile,
          provider_data: providerData,
          plans,
          isPaid,
          distance,
          score: totalScore,
        };
      });

      // Sort by score descending
      enrichedApps.sort((a, b) => b.score - a.score);
      setApplications(enrichedApps);
    } else {
      setApplications([]);
    }
    setLoadingApps(false);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleSelectPlan = (app: any, plan: any) => {
    setSelectedApp(app);
    setSelectedPlan(plan);
    setShowPlanDialog(true);
  };

  const handleEscrowPayment = async () => {
    if (!selectedPlan || !selectedApp || !user || !selectedJobId) return;

    const commissionRate = selectedApp.isPaid ? 0.05 : 0.20;
    const amount = Number(selectedPlan.price);
    const commission = Math.round(amount * commissionRate);
    const providerEarnings = amount - commission;

    // Create escrow transaction first
    const reference = `escrow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const { data: escrowData, error: escrowError } = await supabase
      .from('escrow_transactions')
      .insert({
        job_id: selectedJobId,
        application_id: selectedApp.id,
        payer_id: user.id,
        payee_id: selectedApp.provider_id,
        amount: amount,
        commission_rate: commissionRate,
        platform_commission: commission,
        provider_earnings: providerEarnings,
        plan_type: selectedPlan.plan_type,
        pricing_plan_id: selectedPlan.id,
        paystack_reference: reference,
        status: 'pending',
      })
      .select('id')
      .single();

    if (escrowError) {
      toast({ title: 'Error', description: 'Failed to create escrow. Please try again.', variant: 'destructive' });
      return;
    }

    // Initialize Paystack payment
    initializePayment({
      amount,
      subscriptionType: `escrow_${selectedPlan.plan_type}`,
      onSuccess: async (ref) => {
        // Update escrow with reference
        await supabase
          .from('escrow_transactions')
          .update({ paystack_reference: ref, status: 'held' })
          .eq('id', escrowData.id);

        // Accept the provider
        await handleAcceptProvider(selectedApp.id, selectedApp.provider_id);
        
        toast({ title: '💰 Payment secured!', description: `₦${providerEarnings.toLocaleString()} will be released to the provider upon completion.` });
        setShowPlanDialog(false);
        setSelectedPlan(null);
        setSelectedApp(null);
      },
      onCancel: async () => {
        // Clean up the pending escrow
        await supabase
          .from('escrow_transactions')
          .delete()
          .eq('id', escrowData.id);
      },
    });
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

  const [completingJobId, setCompletingJobId] = useState<string | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completeRating, setCompleteRating] = useState(0);
  const [completeComment, setCompleteComment] = useState('');
  const [submittingComplete, setSubmittingComplete] = useState(false);

  const handleMarkComplete = (jobId: string) => {
    setCompletingJobId(jobId);
    setCompleteRating(0);
    setCompleteComment('');
    setShowCompleteDialog(true);
  };

  const handleSubmitCompletion = async () => {
    if (!completingJobId || !user || completeRating === 0) return;
    setSubmittingComplete(true);
    try {
      const { data: acceptedApps } = await supabase
        .from('job_applications')
        .select('provider_id')
        .eq('job_id', completingJobId)
        .eq('status', 'accepted')
        .limit(1);

      const providerId = acceptedApps?.[0]?.provider_id;
      if (!providerId) {
        toast({ title: 'Error', description: 'No accepted provider found for this job.', variant: 'destructive' });
        setSubmittingComplete(false);
        return;
      }

      // Update job status to completed
      const { error: jobError } = await updateJob(completingJobId, { status: 'completed' as any });
      if (jobError) {
        toast({ title: 'Error', description: jobError.message, variant: 'destructive' });
        setSubmittingComplete(false);
        return;
      }

      // Create review
      const { error: reviewError } = await supabase
        .from('reviews')
        .insert({
          job_id: completingJobId,
          reviewer_id: user.id,
          reviewee_id: providerId,
          overall_rating: completeRating,
          comment: completeComment || null,
        });

      if (reviewError) {
        console.error('Review error:', reviewError);
      }

      // Update provider rating
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('overall_rating')
        .eq('reviewee_id', providerId);

      if (allReviews && allReviews.length > 0) {
        const avg = allReviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / allReviews.length;
        await supabase
          .from('provider_profiles')
          .update({ rating: Math.round(avg * 10) / 10, review_count: allReviews.length })
          .eq('user_id', providerId);
      }

      // Release escrow if exists
      const { data: escrowData } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('job_id', completingJobId)
        .eq('status', 'held')
        .limit(1);

      if (escrowData && escrowData[0]) {
        try {
          await supabase.functions.invoke('release-escrow', {
            body: { escrow_id: escrowData[0].id },
          });
        } catch (escrowErr) {
          console.error('Escrow release error:', escrowErr);
          // Still complete the job even if escrow release fails
        }
      }

      // Notify provider
      await supabase.from('notifications').insert({
        user_id: providerId,
        title: '⭐ Job Completed & Reviewed',
        message: `Your job has been marked as completed with a ${completeRating}-star rating.`,
        type: 'review',
        metadata: { job_id: completingJobId },
      });

      toast({ title: 'Job completed!', description: 'Your review has been submitted.' });
      setShowCompleteDialog(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Something went wrong', variant: 'destructive' });
    } finally {
      setSubmittingComplete(false);
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
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('overall_rating')
        .eq('reviewee_id', ratingUserId);

      if (allReviews && allReviews.length > 0) {
        const avg = allReviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / allReviews.length;
        await supabase
          .from('profiles')
          .update({ requester_rating: Math.round(avg * 10) / 10, requester_review_count: allReviews.length })
          .eq('user_id', ratingUserId);
      }

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

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
  };

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
                    {/* Escrow Status Banner */}
                    {(job.status === 'in_progress' || job.status === 'assigned') && (
                      <div className="mt-2">
                        <EscrowStatusBanner
                          jobId={job.id}
                          isProvider={isProvider}
                          isRequester={!isProvider}
                          jobStatus={job.status || 'open'}
                          onJobUpdate={() => handleMarkComplete(job.id)}
                        />
                      </div>
                    )}
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
                    {!isProvider && job.status === 'in_progress' && (
                      <Button
                        size="sm"
                        className="w-full mt-2 gap-1 bg-success hover:bg-success/90"
                        onClick={() => handleMarkComplete(job.id)}
                      >
                        <CheckCircle className="w-4 h-4" />
                        Mark as Completed
                      </Button>
                    )}
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

      {/* Applications Comparison Dialog */}
      <Dialog open={!!selectedJobId} onOpenChange={() => setSelectedJobId(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Applicants ({applications.length})
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
              {applications.map((app) => {
                const currentJob = myJobs.find(j => j.id === selectedJobId);
                const isRemoteJob = currentJob?.service_mode === 'online' || currentJob?.service_mode === 'both';

                return (
                  <Card key={app.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={app.provider_profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {app.provider_profile?.full_name?.charAt(0) || 'P'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-foreground">
                            {app.provider_profile?.full_name || 'Provider'}
                          </p>
                          <VerificationBadge
                            status={(app.provider_profile?.verification_status as any) || 'unverified'}
                            accountType={app.provider_profile?.account_type === 'company' ? 'company' : 'individual'}
                            size="sm"
                          />
                          {app.isPaid && (
                            <Badge variant="default" className="text-[10px] py-0 px-1">PRO</Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          {app.provider_data?.rating > 0 && (
                            <div className="flex items-center gap-0.5 text-xs">
                              <Star className="w-3 h-3 fill-warning text-warning" />
                              <span className="font-medium">{Number(app.provider_data.rating).toFixed(1)}</span>
                            </div>
                          )}
                          {app.provider_data?.review_count > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {app.provider_data.review_count} review{app.provider_data.review_count !== 1 ? 's' : ''}
                            </span>
                          )}
                          {app.provider_data?.on_time_delivery_score != null && (
                            <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {app.provider_data.on_time_delivery_score}% on-time
                            </div>
                          )}
                        </div>

                        {app.distance != null && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            {app.distance < 1 
                              ? `${Math.round(app.distance * 1000)}m away`
                              : `${app.distance.toFixed(1)} km away`}
                            <span className="text-muted-foreground/70">
                              (~{Math.max(1, Math.round((app.distance / 40) * 60))} min)
                            </span>
                          </div>
                        )}

                        {app.message && (
                          <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                            <p className="text-sm text-foreground flex items-start gap-1">
                              <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              {app.message}
                            </p>
                          </div>
                        )}

                        {/* Pricing Plans for remote jobs */}
                        {isRemoteJob && app.plans.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                              <DollarSign className="w-3 h-3" /> Pricing Plans
                            </p>
                            {app.plans.map((plan: any) => (
                              <div 
                                key={plan.id} 
                                className="p-2 border border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                                onClick={() => app.status === 'pending' && handleSelectPlan(app, plan)}
                              >
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline" className="capitalize text-[10px]">{plan.plan_type}</Badge>
                                  <span className="text-sm font-bold text-foreground">{formatBudget(Number(plan.price))}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {plan.delivery_time}
                                </p>
                              </div>
                            ))}
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
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate(`/view-profile/${app.provider_id}`)}
                        >
                          View Profile
                        </Button>
                        {isRemoteJob && app.plans.length > 0 ? (
                          <Button
                            size="sm"
                            className="flex-1 gap-1"
                            onClick={() => handleSelectPlan(app, app.plans[0])}
                          >
                            <CreditCard className="w-4 h-4" />
                            Select Plan
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="flex-1 bg-success hover:bg-success/90"
                            onClick={() => handleAcceptProvider(app.id, app.provider_id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
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
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Plan Selection + Escrow Payment Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Confirm Plan & Pay
            </DialogTitle>
          </DialogHeader>
          {selectedPlan && selectedApp && (
            <div className="space-y-4">
              <Card className="p-4 border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="soft" className="capitalize">{selectedPlan.plan_type} Plan</Badge>
                  <span className="text-lg font-bold text-foreground">{formatBudget(Number(selectedPlan.price))}</span>
                </div>
                <p className="text-sm text-muted-foreground">{selectedPlan.description}</p>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Delivery: {selectedPlan.delivery_time}
                </p>
              </Card>

              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <p className="text-xs font-medium text-foreground">Payment Breakdown</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="text-foreground">{formatBudget(Number(selectedPlan.price))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Commission ({selectedApp.isPaid ? '5%' : '20%'})
                  </span>
                  <span className="text-muted-foreground">
                    -{formatBudget(Math.round(Number(selectedPlan.price) * (selectedApp.isPaid ? 0.05 : 0.20)))}
                  </span>
                </div>
                <div className="border-t border-border pt-1 flex justify-between text-sm font-semibold">
                  <span className="text-foreground">Provider receives</span>
                  <span className="text-foreground">
                    {formatBudget(Number(selectedPlan.price) - Math.round(Number(selectedPlan.price) * (selectedApp.isPaid ? 0.05 : 0.20)))}
                  </span>
                </div>
              </div>

              {/* Other plans from same provider */}
              {selectedApp.plans.length > 1 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">Other plans from this provider:</p>
                  <div className="flex gap-2">
                    {selectedApp.plans.filter((p: any) => p.id !== selectedPlan.id).map((plan: any) => (
                      <Button 
                        key={plan.id} 
                        variant="outline" 
                        size="sm" 
                        className="capitalize"
                        onClick={() => setSelectedPlan(plan)}
                      >
                        {plan.plan_type} — {formatBudget(Number(plan.price))}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Payment is secured in escrow and released only upon job completion.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPlanDialog(false)}>Cancel</Button>
            <Button onClick={handleEscrowPayment} disabled={paymentLoading}>
              {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CreditCard className="w-4 h-4 mr-1" />}
              Pay & Accept
            </Button>
          </DialogFooter>
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
                  <button key={star} onClick={() => setRating(star)} className="p-1">
                    <Star className={`w-8 h-8 transition-colors ${star <= rating ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
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

      {/* Mark as Complete + Rate Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Job & Rate Provider</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Rate the service provider's work to complete this job.</p>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Rating *</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setCompleteRating(star)} className="p-1">
                    <Star className={`w-8 h-8 transition-colors ${star <= completeRating ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Review (optional)</label>
              <Textarea
                value={completeComment}
                onChange={(e) => setCompleteComment(e.target.value)}
                placeholder="How was the service?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitCompletion} disabled={completeRating === 0 || submittingComplete}>
              {submittingComplete ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Complete & Submit
            </Button>
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
        }}
      />
    </MobileLayout>
  );
};

export default MyJobs;
