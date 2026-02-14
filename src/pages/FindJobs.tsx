import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Wifi, Map, Loader2, MapPin, Building2, User, 
  Clock, DollarSign, X, Scale, Send
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
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
    // Hide jobs that are not open
    if (job.status !== 'open') return false;

    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || job.category === selectedCategory;
    const matchesMode = serviceMode === 'all' || job.service_mode === serviceMode || job.service_mode === 'both';
    
    // Location filter
    if (locationFilter) {
      const jobLoc = job.location?.toLowerCase() || '';
      if (!jobLoc.includes(locationFilter.toLowerCase())) return false;
    }

    // Account type filter
    if (accountTypeFilter !== 'all') {
      if ((job.requester_profile as any)?.account_type !== accountTypeFilter) return false;
    }
    
    return matchesSearch && matchesCategory && matchesMode;
  });

  const handleApply = async (jobId: string) => {
    if (appliedJobIds.has(jobId)) {
      toast({ title: 'Already applied', description: 'You have already applied to this job.', variant: 'destructive' });
      return;
    }
    setApplyingJobId(jobId);
    const { error } = await applyToJob(jobId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Applied!', description: 'Your application has been submitted.' });
    }
    setApplyingJobId(null);
  };

  const handleBargain = async () => {
    if (!bargainJob || !user || !bargainAmount) return;
    const wordCount = bargainReason.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 70) {
      toast({ title: 'Too many words', description: 'Reason must be 70 words or less.', variant: 'destructive' });
      return;
    }
    setSubmittingBargain(true);
    try {
      // Create a negotiation record
      const { error } = await supabase.from('negotiations').insert({
        job_id: bargainJob.id,
        application_id: bargainJob.id, // placeholder - will be linked if application exists
        initiator_id: user.id,
        responder_id: bargainJob.requester_id,
        original_price: Number(bargainJob.budget) || 0,
        proposed_price: Number(bargainAmount),
        message: bargainReason || null,
        status: 'pending',
      });
      
      if (error) throw error;

      // Notify the job giver
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
              if (locationFilter) {
                setLocationFilter(null);
              } else {
                setLocationFilter(geo.locationName || profile?.location || '');
              }
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
                  onApply={() => handleApply(job.id)}
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
              <Button onClick={() => { handleApply(viewingJob.id); setViewingJob(null); }}>
                Apply Now
              </Button>
            )}
            {viewingJob && appliedJobIds.has(viewingJob.id) && (
              <Button disabled variant="soft">Applied ✓</Button>
            )}
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
                  Reason <span className="text-muted-foreground text-xs">(max 70 words)</span>
                </label>
                <Textarea
                  placeholder="Why should the price change?"
                  value={bargainReason}
                  onChange={(e) => {
                    const words = e.target.value.trim().split(/\s+/).filter(Boolean);
                    if (words.length <= 70) {
                      setBargainReason(e.target.value);
                    }
                  }}
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
