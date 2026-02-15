import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Users, Star, Loader2, Settings, Building2,
  ArrowRight, CreditCard, FileText, Filter, X, Search, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useAdmin } from '@/hooks/useAdmin';
import { useCompanyJobs, CompanyJobFilters } from '@/hooks/useCompanyJobs';
import { useCompanySubscription } from '@/hooks/useCompanySubscription';
import { VerificationBadge, VerificationStatus } from '@/components/ui/VerificationBadge';
import { NotificationsSheet } from '@/components/notifications/NotificationsSheet';
import CompanyLayout from '@/components/navigation/CompanyLayout';
import CompanyGlobalFeed from '@/components/company/CompanyGlobalFeed';
import { SERVICE_CATEGORIES } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { isAdmin } = useAdmin();
  const { jobs, loading: jobsLoading, filters, updateFilters, clearFilters } = useCompanyJobs();
  const { isGated } = useCompanySubscription();
  const { toast } = useToast();
  const [showFilters, setShowFilters] = useState(false);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Loader2 className="w-8 h-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (!user || !profile) return null;

  const companyName = (profile as any).company_name || profile.full_name;
  const companyPlan = (profile as any).company_plan;
  const activeJobs = jobs.filter(j => j.status === 'open' || j.status === 'assigned' || j.status === 'in_progress');
  const completedJobs = jobs.filter(j => j.status === 'completed');

  const gatedAction = (action: () => void) => {
    if (isGated) {
      toast({ title: 'Subscription Required', description: 'Subscribe to access this feature.', variant: 'destructive' });
      navigate('/company/upgrade');
      return;
    }
    action();
  };

  const handleFilterChange = (key: keyof CompanyJobFilters, value: string | number | undefined) => {
    updateFilters({ ...filters, [key]: value || undefined });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.1, duration: 0.3 }
    })
  };

  return (
    <CompanyLayout>
      {/* Header */}
      <motion.header className="p-4 safe-top" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
            >
              <Building2 className="w-6 h-6" />
            </motion.div>
            <div>
              <p className="text-sm text-muted-foreground">Company Dashboard</p>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground">{companyName}</h1>
                <VerificationBadge
                  status={profile.verification_status as any}
                  accountType="company"
                  size="sm"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isAdmin && (
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                <Settings className="w-5 h-5" />
              </Button>
            )}
            <NotificationsSheet />
          </div>
        </div>

        {profile.verification_status !== 'verified' && (
          <motion.div className="mt-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <VerificationStatus status={profile.verification_status as any} />
          </motion.div>
        )}
      </motion.header>

      <div className="px-4 pb-4">
        <motion.div className="space-y-6" initial="hidden" animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>

          {/* Subscription Status */}
          <motion.div variants={cardVariants} custom={0}>
            <Card className={`p-4 ${companyPlan ? 'bg-gradient-to-r from-secondary/10 to-transparent' : 'bg-gradient-to-r from-warning/10 to-transparent'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${companyPlan ? 'bg-secondary/20' : 'bg-warning/20'}`}>
                    <CreditCard className={`w-5 h-5 ${companyPlan ? 'text-secondary' : 'text-warning'}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {companyPlan ? `${companyPlan.charAt(0).toUpperCase() + companyPlan.slice(1)} Plan` : 'No Active Plan'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {companyPlan ? 'Your subscription is active' : 'Subscribe to unlock company features'}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => companyPlan ? navigate('/profile?tab=payments') : navigate('/company/upgrade')}>
                  {companyPlan ? 'Manage' : 'Subscribe'}
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* Company Stats */}
          <motion.div className="grid grid-cols-3 gap-3" variants={cardVariants} custom={1}>
            <Card className="p-4 text-center bg-gradient-to-br from-primary/5 to-transparent">
              <div className="text-2xl font-bold text-primary">{activeJobs.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Active Jobs</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{completedJobs.length}</div>
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

          {/* Quick Actions */}
          <motion.section variants={cardVariants} custom={2}>
            <h2 className="text-lg font-semibold text-foreground mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Card className={`p-4 cursor-pointer hover:border-primary/30 transition-colors ${isGated ? 'opacity-70' : ''}`}
                  onClick={() => gatedAction(() => navigate('/post-job'))}>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 relative">
                    <Briefcase className="w-6 h-6 text-primary" />
                    {isGated && <Lock className="w-3.5 h-3.5 text-warning absolute -top-1 -right-1" />}
                  </div>
                  <h3 className="font-semibold text-foreground flex items-center gap-1">
                    {isGated && <Lock className="w-3.5 h-3.5 text-warning" />} Post a Job
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">{isGated ? 'Upgrade to unlock' : 'Hire talent now'}</p>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Card className={`p-4 cursor-pointer hover:border-secondary/30 transition-colors ${isGated ? 'opacity-70' : ''}`}
                  onClick={() => gatedAction(() => navigate('/discover'))}>
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-3 relative">
                    <Users className="w-6 h-6 text-secondary" />
                    {isGated && <Lock className="w-3.5 h-3.5 text-warning absolute -top-1 -right-1" />}
                  </div>
                  <h3 className="font-semibold text-foreground flex items-center gap-1">
                    {isGated && <Lock className="w-3.5 h-3.5 text-warning" />} Find Providers
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">{isGated ? 'Upgrade to unlock' : 'Browse experts'}</p>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Card className={`p-4 cursor-pointer hover:border-primary/30 transition-colors ${isGated ? 'opacity-70' : ''}`}
                  onClick={() => gatedAction(() => navigate('/my-jobs'))}>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 relative">
                    <FileText className="w-6 h-6 text-primary" />
                    {isGated && <Lock className="w-3.5 h-3.5 text-warning absolute -top-1 -right-1" />}
                  </div>
                  <h3 className="font-semibold text-foreground flex items-center gap-1">
                    {isGated && <Lock className="w-3.5 h-3.5 text-warning" />} Applicants
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">{isGated ? 'Upgrade to unlock' : 'Manage responses'}</p>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Card className="p-4 cursor-pointer hover:border-secondary/30 transition-colors"
                  onClick={() => navigate('/company/upgrade')}>
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-3">
                    <CreditCard className="w-6 h-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold text-foreground">Plan & Billing</h3>
                  <p className="text-xs text-muted-foreground mt-1">Subscription</p>
                </Card>
              </motion.div>
            </div>
          </motion.section>

          {/* Global Marketplace Feed */}
          <motion.section variants={cardVariants} custom={3}>
            <CompanyGlobalFeed />
          </motion.section>

          {/* Jobs with Filters */}
          <motion.section variants={cardVariants} custom={4}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">My Jobs</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant={showFilters ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="w-4 h-4 mr-1" />
                  Filters
                  {hasActiveFilters && <span className="ml-1 w-2 h-2 rounded-full bg-primary" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => gatedAction(() => navigate('/my-jobs'))}>
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-4 space-y-3"
              >
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Filter Jobs</span>
                    {hasActiveFilters && (
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="w-3 h-3 mr-1" /> Clear
                      </Button>
                    )}
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search jobs..."
                      className="pl-9"
                      value={filters.search || ''}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Select
                      value={filters.status || 'all'}
                      onValueChange={(v) => handleFilterChange('status', v === 'all' ? undefined : v)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="assigned">Assigned</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={filters.category || 'all'}
                      onValueChange={(v) => handleFilterChange('category', v === 'all' ? undefined : v)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {SERVICE_CATEGORIES.map(c => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      placeholder="Min budget"
                      value={filters.budgetMin || ''}
                      onChange={(e) => handleFilterChange('budgetMin', e.target.value ? Number(e.target.value) : undefined)}
                    />
                    <Input
                      type="number"
                      placeholder="Max budget"
                      value={filters.budgetMax || ''}
                      onChange={(e) => handleFilterChange('budgetMax', e.target.value ? Number(e.target.value) : undefined)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="date"
                      placeholder="From date"
                      value={filters.dateFrom || ''}
                      onChange={(e) => handleFilterChange('dateFrom', e.target.value || undefined)}
                    />
                    <Input
                      type="date"
                      placeholder="To date"
                      value={filters.dateTo || ''}
                      onChange={(e) => handleFilterChange('dateTo', e.target.value || undefined)}
                    />
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Job List */}
            {jobsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : jobs.length === 0 ? (
              <Card className="p-8 text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {hasActiveFilters ? 'No jobs match your filters' : 'No jobs posted yet'}
                </p>
                {hasActiveFilters ? (
                  <Button className="mt-3" variant="outline" onClick={clearFilters}>Clear Filters</Button>
                ) : (
                  <Button className="mt-3" onClick={() => gatedAction(() => navigate('/post-job'))}>Post Your First Job</Button>
                )}
              </Card>
            ) : (
              <div className="space-y-3">
                {jobs.slice(0, 5).map(job => (
                  <Card key={job.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{job.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">{job.category}</p>
                          {job.budget && (
                            <span className="text-xs text-muted-foreground">• ₦{job.budget.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      <Badge variant={
                        job.status === 'open' ? 'default' :
                        job.status === 'completed' ? 'secondary' : 'outline'
                      }>
                        {job.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </motion.section>
        </motion.div>
      </div>
    </CompanyLayout>
  );
};

export default CompanyDashboard;
