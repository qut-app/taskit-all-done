import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  ArrowUpRight, 
  Briefcase, 
  Users, 
  Star, 
  Clock, 
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MobileLayout from '@/components/navigation/MobileLayout';
import { useApp, mockProviders } from '@/context/AppContext';
import JobCard from '@/components/cards/JobCard';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, currentRole, jobs } = useApp();

  const openJobs = jobs.filter(j => j.status === 'open');
  const assignedJobs = jobs.filter(j => j.status === 'assigned' || j.status === 'in_progress');

  const renderRequesterDashboard = () => (
    <div className="space-y-6">
      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Card 
            variant="interactive" 
            className="p-4"
            onClick={() => navigate('/post-job')}
          >
            <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center mb-3">
              <Briefcase className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Post a Job</h3>
            <p className="text-xs text-muted-foreground mt-1">Get help today</p>
          </Card>

          <Card 
            variant="interactive" 
            className="p-4"
            onClick={() => navigate('/discover')}
          >
            <div className="w-12 h-12 rounded-xl bg-secondary-light flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-secondary" />
            </div>
            <h3 className="font-semibold text-foreground">Find Providers</h3>
            <p className="text-xs text-muted-foreground mt-1">Browse experts</p>
          </Card>
        </div>
      </section>

      {/* Active Jobs */}
      {assignedJobs.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Active Jobs</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/my-jobs')}>
              View All
            </Button>
          </div>
          <div className="space-y-3">
            {assignedJobs.slice(0, 2).map((job) => (
              <JobCard key={job.id} job={job} variant="compact" />
            ))}
          </div>
        </section>
      )}

      {/* Recommended Providers */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Top Providers</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/discover')}>
            See All
          </Button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {mockProviders.filter(p => p.isRecommended).map((provider) => (
            <Card key={provider.id} variant="elevated" className="flex-shrink-0 w-48 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold">
                  {provider.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm truncate">{provider.fullName}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 text-secondary fill-secondary" />
                    <span>{provider.rating}</span>
                  </div>
                </div>
              </div>
              <Badge variant="soft" className="text-xs">
                {provider.serviceCategories[0]}
              </Badge>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );

  const renderProviderDashboard = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card variant="gradient" className="p-4 text-center">
          <div className="text-2xl font-bold text-primary">2/3</div>
          <div className="text-xs text-muted-foreground mt-1">Active Slots</div>
        </Card>
        <Card variant="gradient" className="p-4 text-center">
          <div className="text-2xl font-bold text-foreground">4.8</div>
          <div className="text-xs text-muted-foreground mt-1">Rating</div>
        </Card>
        <Card variant="gradient" className="p-4 text-center">
          <div className="text-2xl font-bold text-success">96%</div>
          <div className="text-xs text-muted-foreground mt-1">On-Time</div>
        </Card>
      </div>

      {/* Upgrade Banner */}
      <Card className="p-4 gradient-primary">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-primary-foreground">Boost Your Slots</h3>
            <p className="text-sm text-primary-foreground/80">Get more job capacity</p>
          </div>
          <Button variant="secondary" size="sm">
            ₦4,000/mo
          </Button>
        </div>
      </Card>

      {/* Available Jobs */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Jobs For You</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/find-jobs')}>
            View All
          </Button>
        </div>
        <div className="space-y-3">
          {openJobs.slice(0, 3).map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </section>
    </div>
  );

  return (
    <MobileLayout>
      {/* Header */}
      <header className="p-4 safe-top">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Welcome back,</p>
            <h1 className="text-xl font-bold text-foreground">{user?.fullName || 'User'}</h1>
          </div>
          <div className="flex items-center gap-2">
            {user?.verificationStatus === 'pending' && (
              <Badge variant="warning" className="gap-1">
                <AlertCircle className="w-3 h-3" />
                Pending
              </Badge>
            )}
            {user?.verificationStatus === 'verified' && (
              <Badge variant="verified" className="gap-1">
                <CheckCircle className="w-3 h-3" />
                Verified
              </Badge>
            )}
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 pb-4">
        {currentRole === 'provider' ? renderProviderDashboard() : renderRequesterDashboard()}
      </div>
    </MobileLayout>
  );
};

export default Dashboard;
