import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Users, Star, Zap, Loader2, Settings, Building2,
  ArrowRight, CreditCard, Megaphone, FileText, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useJobs } from '@/hooks/useJobs';
import { useAdmin } from '@/hooks/useAdmin';
import { VerificationBadge, VerificationStatus } from '@/components/ui/VerificationBadge';
import { NotificationsSheet } from '@/components/notifications/NotificationsSheet';
import CompanyLayout from '@/components/navigation/CompanyLayout';

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { myJobs, loading: jobsLoading } = useJobs();
  const { isAdmin } = useAdmin();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

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
  const activeJobs = myJobs.filter(j => j.status === 'open' || j.status === 'assigned' || j.status === 'in_progress');
  const completedJobs = myJobs.filter(j => j.status === 'completed');

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
                <Button variant="outline" size="sm" onClick={() => navigate('/profile?tab=payments')}>
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
                <Card className="p-4 cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => navigate('/post-job')}>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Briefcase className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">Post a Job</h3>
                  <p className="text-xs text-muted-foreground mt-1">Hire talent now</p>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Card className="p-4 cursor-pointer hover:border-secondary/30 transition-colors"
                  onClick={() => navigate('/discover')}>
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold text-foreground">Find Providers</h3>
                  <p className="text-xs text-muted-foreground mt-1">Browse experts</p>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Card className="p-4 cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => navigate('/my-jobs')}>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">Applicants</h3>
                  <p className="text-xs text-muted-foreground mt-1">Manage responses</p>
                </Card>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Card className="p-4 cursor-pointer hover:border-secondary/30 transition-colors"
                  onClick={() => navigate('/profile?tab=payments')}>
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-3">
                    <CreditCard className="w-6 h-6 text-secondary" />
                  </div>
                  <h3 className="font-semibold text-foreground">Plan & Billing</h3>
                  <p className="text-xs text-muted-foreground mt-1">Subscription</p>
                </Card>
              </motion.div>
            </div>
          </motion.section>

          {/* Recent Jobs */}
          <motion.section variants={cardVariants} custom={3}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Recent Jobs</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/my-jobs')}>
                View All <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            {jobsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : myJobs.length === 0 ? (
              <Card className="p-8 text-center">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No jobs posted yet</p>
                <Button className="mt-3" onClick={() => navigate('/post-job')}>Post Your First Job</Button>
              </Card>
            ) : (
              <div className="space-y-3">
                {myJobs.slice(0, 3).map(job => (
                  <Card key={job.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{job.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{job.category}</p>
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
