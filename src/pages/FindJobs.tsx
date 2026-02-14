import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Wifi, Map, Loader2, MapPin, Building2, User, 
  Clock, DollarSign, X, Scale, Send, Plus, Trash2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MobileLayout from '@/components/navigation/MobileLayout';
import JobCard from '@/components/cards/JobCard';
import { useAuth } from '@/hooks/useAuth';
import { useJobs } from '@/hooks/useJobs';
import { useCategories } from '@/hooks/useCategories';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface PricingPlan {
  plan_type: string;
  price: string;
  description: string;
  delivery_time: string;
  delivery_unit: 'hours' | 'days';
}

const EMPTY_PLAN: PricingPlan = { plan_type: '', price: '', description: '', delivery_time: '', delivery_unit: 'days' };

const FindJobs = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { jobs, myApplications, loading: jobsLoading, applyToJob } = useJobs();
  const { categories } = useCategories();
  const { profile } = useProfile();
  const geo = useGeolocation();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [serviceMode, setServiceMode] = useState<'all' | 'online' | 'offline'>('all');
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'individual' | 'company'>('all');
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [viewingJob, setViewingJob] = useState<any | null>(null);

  // Apply with plans state (remote jobs)
  const [applyJob, setApplyJob] = useState<any | null>(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [applyDeliveryTime, setApplyDeliveryTime] = useState('');
  const [applyDeliveryUnit, setApplyDeliveryUnit] = useState<'hours' | 'days'>('days');
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([
    { plan_type: 'basic', price: '', description: '', delivery_time: '', delivery_unit: 'days' },
    { plan_type: 'standard', price: '', description: '', delivery_time: '', delivery_unit: 'days' },
    { plan_type: 'gold', price: '', description: '', delivery_time: '', delivery_unit: 'days' },
  ]);
  const [submittingApply, setSubmittingApply] = useState(false);

  // Bargain state
  const [bargainJob, setBargainJob] = useState<any | null>(null);
  const [bargainAmount, setBargainAmount] = useState('');
  const [bargainReason, setBargainReason] = useState('');
  const [submittingBargain, setSubmittingBargain] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);

  // Check subscription status
  useEffect(() => {
    if (user) {
      supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .then(({ data }) => {
          setHasSubscription(!!(data && data.length > 0));
        });
    }
  }, [user]);

  // Build set of already-applied job IDs
  const appliedJobIds = new Set(myApplications.map(a => a.job_id));

  // Default location from geolocation or profile
  useEffect(() => {
    if (geo.locationName && !locationFilter) {
      setLocationFilter(geo.locationName);
    } else if (!geo.locationName && profile?.location && !locationFilter) {
      setLocationFilter(profile.location);
    }
  }, [geo.locationName, profile?.location]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const filteredJobs = jobs.filter((job) => {
    if (job.status !== 'open') return false;
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || job.category === selectedCategory;
    const matchesMode = serviceMode === 'all' || job.service_mode === serviceMode || job.service_mode === 'both';
    if (locationFilter) {
      const jobLoc = job.location?.toLowerCase() || '';
      if (!jobLoc.includes(locationFilter.toLowerCase())) return false;
    }
    if (accountTypeFilter !== 'all') {
      if ((job.requester_profile as any)?.account_type !== accountTypeFilter) return false;
    }
    return matchesSearch && matchesCategory && matchesMode;
  });

  const handleApplyClick = (job: any) => {
    if (appliedJobIds.has(job.id)) {
      toast({ title: 'Already applied', description: 'You have already applied to this job.', variant: 'destructive' });
      return;
    }
    // Remote jobs: show pricing plan modal
    if (job.service_mode === 'online' || job.service_mode === 'both') {
      setApplyJob(job);
      setApplyMessage('');
      setApplyDeliveryTime('');
      setApplyDeliveryUnit('days');
      setPricingPlans([
        { plan_type: 'basic', price: '', description: '', delivery_time: '', delivery_unit: 'days' },
        { plan_type: 'standard', price: '', description: '', delivery_time: '', delivery_unit: 'days' },
        { plan_type: 'gold', price: '', description: '', delivery_time: '', delivery_unit: 'days' },
      ]);
    } else {
      // Onsite jobs: show simple apply modal
      setApplyJob(job);
      setApplyMessage('');
      setApplyDeliveryTime('');
      setApplyDeliveryUnit('days');
      setPricingPlans([]);
    }
  };

  const handleSubmitApplication = async () => {
    if (!applyJob || !user) return;
    setSubmittingApply(true);

    try {
      const isRemote = applyJob.service_mode === 'online' || applyJob.service_mode === 'both';
      
      // Validate pricing plans for remote jobs
      if (isRemote) {
        const filledPlans = pricingPlans.filter(p => p.price && p.description);
        if (filledPlans.length === 0) {
          toast({ title: 'Add at least one plan', description: 'Remote jobs require at least one pricing plan.', variant: 'destructive' });
          setSubmittingApply(false);
          return;
        }
      }

      const deliveryTimeStr = applyDeliveryTime 
        ? `${applyDeliveryTime} ${applyDeliveryUnit}` 
        : undefined;

      // Submit application
      const { error } = await applyToJob(applyJob.id, applyMessage || undefined, deliveryTimeStr);
      if (error) throw error;

      // Create pricing plans for remote jobs
      if (isRemote) {
        // Get the application we just created
        const { data: appData } = await supabase
          .from('job_applications')
          .select('id')
          .eq('job_id', applyJob.id)
          .eq('provider_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (appData && appData[0]) {
          const filledPlans = pricingPlans.filter(p => p.price && p.description);
          const planInserts = filledPlans.map(p => ({
            application_id: appData[0].id,
            plan_type: p.plan_type,
            price: Number(p.price),
            description: p.description,
            delivery_time: p.delivery_time ? `${p.delivery_time} ${p.delivery_unit}` : applyJob.expected_delivery_time,
          }));

          if (planInserts.length > 0) {
            await supabase.from('pricing_plans').insert(planInserts);
          }
        }
      }

      toast({ title: 'Applied!', description: 'Your application has been submitted.' });
      setApplyJob(null);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to apply', variant: 'destructive' });
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleQuickApply = async (jobId: string) => {
    if (appliedJobIds.has(jobId)) {
      toast({ title: 'Already applied', description: 'You have already applied to this job.', variant: 'destructive' });
      return;
    }
    // Find the job to check service_mode
    const job = filteredJobs.find(j => j.id === jobId);
    if (job) {
      handleApplyClick(job);
    }
  };

  const updatePlan = (index: number, field: keyof PricingPlan, value: string) => {
    setPricingPlans(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleBargain = async () => {
    if (!bargainJob || !user || !bargainAmount) return;
    const wordCount = bargainReason.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount !== 70) {
      toast({ title: 'Exactly 70 words required', description: `Your reason has ${wordCount} words. It must be exactly 70 words.`, variant: 'destructive' });
      return;
    }
    setSubmittingBargain(true);
    try {
      const { error } = await supabase.from('negotiations').insert({
        job_id: bargainJob.id,
        application_id: bargainJob.id,
        initiator_id: user.id,
        responder_id: bargainJob.requester_id,
        original_price: Number(bargainJob.budget) || 0,
        proposed_price: Number(bargainAmount),
        message: bargainReason || null,
        status: 'pending',
      });
      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: bargainJob.requester_id,
        title: '⚖️ New Price Negotiation',
        message: `A provider wants to negotiate the price for "${bargainJob.title}" — proposed ₦${Number(bargainAmount).toLocaleString()}.`,
        type: 'negotiation',
        metadata: { job_id: bargainJob.id, proposed_price: Number(bargainAmount) },
      });

      toast({ title: 'Offer sent!', description: 'The job giver will review your proposal.' });
      setBargainJob(null);
      setBargainAmount('');
      setBargainReason('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to send offer', variant: 'destructive' });
    } finally {
      setSubmittingBargain(false);
    }
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MobileLayout>
      <header className="p-4 safe-top space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Find Jobs</h1>
          <p className="text-muted-foreground">Browse available opportunities</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input variant="filled" placeholder="Search jobs..." className="pl-12" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        {/* Service Mode Filter */}
        <div className="flex gap-2">
          <Button variant={serviceMode === 'all' ? 'soft' : 'ghost'} size="sm" onClick={() => setServiceMode('all')}>All</Button>
          <Button variant={serviceMode === 'online' ? 'soft' : 'ghost'} size="sm" onClick={() => setServiceMode('online')} className="gap-1">
            <Wifi className="w-4 h-4" />Remote
          </Button>
          <Button variant={serviceMode === 'offline' ? 'soft' : 'ghost'} size="sm" onClick={() => setServiceMode('offline')} className="gap-1">
            <Map className="w-4 h-4" />On-Site
          </Button>
        </div>

        {/* Footer Filters: Location + Account Type */}
        <div className="flex gap-2">
          <Button
            variant={locationFilter ? 'soft' : 'outline'}
            size="sm"
            className="gap-1"
            onClick={() => {
              if (locationFilter) setLocationFilter(null);
              else setLocationFilter(geo.locationName || profile?.location || '');
            }}
          >
            <MapPin className="w-3.5 h-3.5" />
            {locationFilter || 'Location'}
          </Button>
          <Button
            variant={accountTypeFilter === 'individual' ? 'soft' : 'ghost'}
            size="sm"
            className="gap-1"
            onClick={() => setAccountTypeFilter(accountTypeFilter === 'individual' ? 'all' : 'individual')}
          >
            <User className="w-3.5 h-3.5" />Individual
          </Button>
          <Button
            variant={accountTypeFilter === 'company' ? 'soft' : 'ghost'}
            size="sm"
            className="gap-1"
            onClick={() => setAccountTypeFilter(accountTypeFilter === 'company' ? 'all' : 'company')}
          >
            <Building2 className="w-3.5 h-3.5" />Company
          </Button>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <Button variant={selectedCategory === null ? 'soft' : 'outline'} size="sm" onClick={() => setSelectedCategory(null)}>All</Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.name ? 'soft' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.name)}
              className="flex-shrink-0"
            >
              {category.name}
            </Button>
          ))}
        </div>
      </header>

      {/* Results */}
      <div className="px-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} available
          </p>
          <Button variant="ghost" size="sm" className="gap-1">
            <Filter className="w-4 h-4" />Filters
          </Button>
        </div>

        {jobsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredJobs.length > 0 ? (
          filteredJobs.map((job, index) => {
            const isApplied = appliedJobIds.has(job.id);
            const isApplying = applyingJobId === job.id;
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <JobCard
                  job={job}
                  onApply={() => handleQuickApply(job.id)}
                  onView={() => setViewingJob(job)}
                  applicationStatus={isApplied ? 'applied' : isApplying ? 'applying' : undefined}
                  onBargain={hasSubscription ? () => setBargainJob(job) : undefined}
                  showBargainHint={!hasSubscription}
                />
              </motion.div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">No jobs found</h3>
            <p className="text-sm text-muted-foreground mt-1">Check back later for new opportunities</p>
          </div>
        )}
      </div>

      {/* View Details Dialog */}
      <Dialog open={!!viewingJob} onOpenChange={() => setViewingJob(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingJob?.title}</DialogTitle>
          </DialogHeader>
          {viewingJob && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="soft">{viewingJob.category}</Badge>
                <Badge variant={viewingJob.service_mode === 'online' ? 'online' : 'offline'}>
                  {viewingJob.service_mode === 'online' ? 'Remote' : viewingJob.service_mode === 'offline' ? 'On-site' : 'Remote/On-site'}
                </Badge>
              </div>
              {viewingJob.description && (
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{viewingJob.description}</p>
                </div>
              )}
              {viewingJob.budget && (
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-success" />
                  <span className="font-semibold text-foreground">{formatBudget(Number(viewingJob.budget))}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Expected delivery: {viewingJob.expected_delivery_time}</span>
              </div>
              {viewingJob.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{viewingJob.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Posted by: {viewingJob.requester_profile?.full_name || 'Anonymous'}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Posted {new Date(viewingJob.created_at).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setViewingJob(null)}>Close</Button>
            {viewingJob && !appliedJobIds.has(viewingJob.id) && (
              <Button onClick={() => { handleApplyClick(viewingJob); setViewingJob(null); }}>
                Apply Now
              </Button>
            )}
            {viewingJob && appliedJobIds.has(viewingJob.id) && (
              <Button disabled variant="soft">Applied ✓</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Dialog (with pricing plans for remote jobs) */}
      <Dialog open={!!applyJob} onOpenChange={() => setApplyJob(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Apply to: {applyJob?.title}
            </DialogTitle>
          </DialogHeader>
          {applyJob && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Message (optional)</label>
                <Textarea
                  placeholder="Why are you the best fit for this job?"
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Custom delivery time */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  <Clock className="w-3.5 h-3.5 inline mr-1" />
                  Your Delivery Time
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="e.g. 3"
                    value={applyDeliveryTime}
                    onChange={(e) => setApplyDeliveryTime(e.target.value)}
                    className="flex-1"
                  />
                  <Select value={applyDeliveryUnit} onValueChange={(v: 'hours' | 'days') => setApplyDeliveryUnit(v)}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hours">Hours</SelectItem>
                      <SelectItem value="days">Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pricing Plans (remote jobs only) */}
              {(applyJob.service_mode === 'online' || applyJob.service_mode === 'both') && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    Pricing Plans
                    <span className="text-xs text-muted-foreground font-normal">(at least 1 required)</span>
                  </h4>

                  {pricingPlans.map((plan, idx) => (
                    <Card key={idx} className="p-3 space-y-2 border-border/50">
                      <div className="flex items-center justify-between">
                        <Badge variant={idx === 0 ? 'outline' : idx === 1 ? 'soft' : 'default'} className="capitalize">
                          {plan.plan_type}
                        </Badge>
                      </div>
                      <Input
                        type="number"
                        placeholder="Price (₦)"
                        value={plan.price}
                        onChange={(e) => updatePlan(idx, 'price', e.target.value)}
                      />
                      <Textarea
                        placeholder="What's included in this plan?"
                        value={plan.description}
                        onChange={(e) => updatePlan(idx, 'description', e.target.value)}
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Delivery time"
                          value={plan.delivery_time}
                          onChange={(e) => updatePlan(idx, 'delivery_time', e.target.value)}
                          className="flex-1"
                        />
                        <Select 
                          value={plan.delivery_unit} 
                          onValueChange={(v: 'hours' | 'days') => updatePlan(idx, 'delivery_unit', v)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hours">Hours</SelectItem>
                            <SelectItem value="days">Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyJob(null)}>Cancel</Button>
            <Button onClick={handleSubmitApplication} disabled={submittingApply}>
              {submittingApply ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bargain Dialog */}
      <Dialog open={!!bargainJob} onOpenChange={() => setBargainJob(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Negotiate Price
            </DialogTitle>
          </DialogHeader>
          {bargainJob && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Current budget: <span className="font-semibold text-foreground">{formatBudget(Number(bargainJob.budget) || 0)}</span>
              </p>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Your Proposed Price (₦)</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={bargainAmount}
                  onChange={(e) => setBargainAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Reason <span className="text-muted-foreground text-xs">(exactly 70 words required)</span>
                </label>
                <Textarea
                  placeholder="Why should the price change?"
                  value={bargainReason}
                  onChange={(e) => setBargainReason(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {bargainReason.trim().split(/\s+/).filter(Boolean).length}/70 words
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBargainJob(null)}>Cancel</Button>
            <Button onClick={handleBargain} disabled={!bargainAmount || submittingBargain}>
              {submittingBargain ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
              Send Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
};

export default FindJobs;
