import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Briefcase, 
  Users, 
  Star, 
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  Building2,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MobileLayout from '@/components/navigation/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useJobs } from '@/hooks/useJobs';
import { useProviders } from '@/hooks/useProviders';
import { useAdmin } from '@/hooks/useAdmin';
import { useRecommendedProviders } from '@/hooks/useRecommendedProviders';
import { useShowcaseFeed } from '@/hooks/useShowcaseFeed';
import JobCard from '@/components/cards/JobCard';
import RecommendedExperts from '@/components/dashboard/RecommendedExperts';
import ShowcaseFeed from '@/components/dashboard/ShowcaseFeed';
import { VerificationBadge, VerificationStatus } from '@/components/ui/VerificationBadge';
import { NotificationsSheet } from '@/components/notifications/NotificationsSheet';
import { SUBSCRIPTION_PLANS, formatNaira } from '@/config/subscriptionConfig';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, providerProfile, loading: profileLoading } = useProfile();
  const { jobs, myJobs, loading: jobsLoading } = useJobs();
  const { providers, loading: providersLoading } = useProviders();
  const { isAdmin } = useAdmin();
  const { providers: recommendedExperts, loading: recommendedLoading } = useRecommendedProviders();
  const { items: feedItems, loading: feedLoading, toggleLike } = useShowcaseFeed();
  const { isPremium, subscriptionType } = useSubscriptionStatus();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Redirect company accounts to company dashboard
  useEffect(() => {
    if (!authLoading && !profileLoading && profile) {
      if ((profile as any).account_type === 'company') {
        navigate('/company-dashboard', { replace: true });
      }
    }
  }, [authLoading, profileLoading, profile, navigate]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-8 h-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const isProvider = profile.active_role === 'provider';
  const isCompany = (profile as any).account_type === 'company';
  const openJobs = jobs.filter(j => j.status === 'open');
  const assignedJobs = myJobs.filter(j => j.status === 'assigned' || j.status === 'in_progress');
  const recommendedProviders = providers.filter(p => p.is_recommended).slice(0, 5);

  // Requester slots
  const requesterActiveSlots = (profile as any).requester_active_slots || 0;
  const requesterMaxSlots = (profile as any).requester_max_slots || 3;

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.3 }
    })
  };

  const renderRequesterDashboard = () => (
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.1 } }
      }}
    >
      {/* Requester Stats */}
      <motion.div 
        className="grid grid-cols-3 gap-3"
        variants={cardVariants}
        custom={0}
      >
        <Card className="p-4 text-center bg-gradient-to-br from-primary/5 to-transparent">
          <div className="text-2xl font-bold text-primary">
            {requesterActiveSlots}/{requesterMaxSlots}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Active Jobs</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-foreground">
            {(profile as any).requester_completed_jobs || 0}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Completed</div>
        </Card>
        <Card className="p-4 text-center bg-gradient-to-br from-success/5 to-transparent">
          <div className="flex items-center justify-center gap-1">
            <span className="text-2xl font-bold text-success">
              {(profile as any).requester_rating || 0}
            </span>
            <Star className="w-4 h-4 text-warning fill-warning" />
          </div>
          <div className="text-xs text-muted-foreground mt-1">Rating</div>
        </Card>
      </motion.div>

      {/* Requester Slot Usage */}
      <motion.div variants={cardVariants} custom={1}>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-foreground">Job Slots</h3>
            <Badge variant="outline">{requesterActiveSlots} / {requesterMaxSlots} used</Badge>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{
              width: `${(requesterActiveSlots / requesterMaxSlots) * 100}%`
            }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {requesterMaxSlots - requesterActiveSlots} slots remaining · 3 free slots/month
          </p>
        </Card>
      </motion.div>

      {/* Requester Upgrade Banner */}
      {requesterMaxSlots <= 3 && !isPremium && (
        <motion.div variants={cardVariants} custom={2}>
          <Card className="p-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Unlimited Hiring</h3>
                <p className="text-sm opacity-80">Post unlimited jobs with premium</p>
              </div>
              <Button variant="secondary" size="sm" className="shrink-0">
                {formatNaira(SUBSCRIPTION_PLANS.requester_unlimited.price)}/mo
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.section variants={cardVariants} custom={3}>
        <h2 className="text-lg font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card 
              className="p-4 cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => navigate('/post-job')}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Post a Job</h3>
              <p className="text-xs text-muted-foreground mt-1">Get help today</p>
            </Card>
          </motion.div>

          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Card 
              className="p-4 cursor-pointer hover:border-secondary/30 transition-colors"
              onClick={() => navigate('/discover')}
            >
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-3">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="font-semibold text-foreground">Find Providers</h3>
              <p className="text-xs text-muted-foreground mt-1">Browse experts</p>
            </Card>
          </motion.div>
        </div>
      </motion.section>

      {/* Active Jobs */}
      <AnimatePresence>
        {assignedJobs.length > 0 && (
          <motion.section 
            variants={cardVariants} 
            custom={4}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Active Jobs</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/my-jobs')}>
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {assignedJobs.slice(0, 2).map((job, i) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <JobCard job={job} variant="compact" />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Recommended Experts */}
      <motion.section variants={cardVariants} custom={5}>
        <RecommendedExperts
          providers={recommendedExperts}
          loading={recommendedLoading}
          onSeeAll={() => navigate('/discover')}
        />
      </motion.section>

      {/* Showcase Feed */}
      <motion.section variants={cardVariants} custom={6}>
        <ShowcaseFeed
          items={feedItems}
          loading={feedLoading}
          onToggleLike={toggleLike}
          onViewProvider={(userId) => navigate(`/discover`)}
        />
      </motion.section>
    </motion.div>
  );

  const renderProviderDashboard = () => (
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.1 } }
      }}
    >
      {/* Stats */}
      <motion.div 
        className="grid grid-cols-3 gap-3"
        variants={cardVariants}
        custom={0}
      >
        <Card className="p-4 text-center bg-gradient-to-br from-primary/5 to-transparent">
          <div className="text-2xl font-bold text-primary">
            {providerProfile?.active_job_slots || 0}/{providerProfile?.max_job_slots || 3}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Active Slots</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <span className="text-2xl font-bold text-foreground">
              {providerProfile?.rating || 0}
            </span>
            <Star className="w-4 h-4 text-warning fill-warning" />
          </div>
          <div className="text-xs text-muted-foreground mt-1">Rating</div>
        </Card>
        <Card className="p-4 text-center bg-gradient-to-br from-success/5 to-transparent">
          <div className="text-2xl font-bold text-success">
            {providerProfile?.on_time_delivery_score || 100}%
          </div>
          <div className="text-xs text-muted-foreground mt-1">On-Time</div>
        </Card>
      </motion.div>

      {/* Slot Usage */}
      <motion.div variants={cardVariants} custom={1}>
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-foreground">Job Slots</h3>
            <Badge variant="outline">{providerProfile?.active_job_slots || 0} / {providerProfile?.max_job_slots || 3} used</Badge>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{
              width: `${((providerProfile?.active_job_slots || 0) / (providerProfile?.max_job_slots || 3)) * 100}%`
            }} />
          </div>
           <p className="text-xs text-muted-foreground mt-2">
             {(providerProfile?.max_job_slots || 3) - (providerProfile?.active_job_slots || 0)} slots remaining · {isPremium ? '15 premium' : '3 free'} slots
          </p>
        </Card>
      </motion.div>

      {/* Upgrade Banner */}
      {!providerProfile?.is_premium && !isPremium && (
        <motion.div variants={cardVariants} custom={2}>
          <Card className="p-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Boost Your Slots</h3>
                <p className="text-sm opacity-80">Get more job capacity with premium</p>
              </div>
              <Button variant="secondary" size="sm" className="shrink-0">
                {formatNaira(SUBSCRIPTION_PLANS.service_provider.price)}/mo
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Available Jobs */}
      <motion.section variants={cardVariants} custom={3}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Jobs For You</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/find-jobs')}>
            View All
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
        <div className="space-y-3">
          {jobsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : openJobs.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No jobs available yet</p>
              <p className="text-sm text-muted-foreground mt-1">Check back soon!</p>
            </motion.div>
          ) : (
            openJobs.slice(0, 3).map((job, i) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <JobCard job={job} />
              </motion.div>
            ))
          )}
        </div>
      </motion.section>
    </motion.div>
  );

  return (
    <MobileLayout>
      {/* Header */}
      <motion.header 
        className="p-4 safe-top"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                isCompany 
                  ? 'bg-secondary/10 text-secondary' 
                  : 'bg-primary/10 text-primary'
              }`}
              whileHover={{ scale: 1.05 }}
            >
              {isCompany ? (
                <Building2 className="w-6 h-6" />
              ) : (
                profile.full_name?.charAt(0) || 'U'
              )}
            </motion.div>
            <div>
              <p className="text-sm text-muted-foreground">Welcome back,</p>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground">
                  {isCompany ? (profile as any).company_name : profile.full_name}
                </h1>
                <VerificationBadge 
                  status={profile.verification_status as any} 
                  accountType={isCompany ? 'company' : 'individual'}
                  size="sm"
                />
                {isPremium && (
                  <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white border-0 text-[10px] px-1.5 py-0.5 font-semibold">
                    <Zap className="w-3 h-3 mr-0.5" />
                    PRO
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                  <Settings className="w-5 h-5" />
                </Button>
              </motion.div>
            )}
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <NotificationsSheet />
            </motion.div>
          </div>
        </div>

        {/* Verification Status Banner */}
        {profile.verification_status !== 'verified' && (
          <motion.div 
            className="mt-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <VerificationStatus status={profile.verification_status as any} />
          </motion.div>
        )}
      </motion.header>

      {/* Content */}
      <div className="px-4 pb-4">
        {isProvider ? renderProviderDashboard() : renderRequesterDashboard()}
      </div>
    </MobileLayout>
  );
};

export default Dashboard;
