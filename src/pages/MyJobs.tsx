import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MobileLayout from '@/components/navigation/MobileLayout';
import JobCard from '@/components/cards/JobCard';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useJobs } from '@/hooks/useJobs';

const MyJobs = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { myJobs, myApplications, loading: jobsLoading } = useJobs();
  const [activeTab, setActiveTab] = useState('active');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isProvider = profile?.active_role === 'provider';

  // For requesters: show jobs they posted
  // For providers: show jobs they applied to
  const jobs = isProvider 
    ? myApplications.map(app => ({ ...app.job, application_status: app.status })).filter(Boolean)
    : myJobs;

  const activeJobs = jobs.filter(j => j && (j.status === 'open' || j.status === 'assigned' || j.status === 'in_progress'));
  const completedJobs = jobs.filter(j => j && j.status === 'completed');
  const cancelledJobs = jobs.filter(j => j && j.status === 'cancelled');

  return (
    <MobileLayout>
      {/* Header */}
      <header className="p-4 safe-top">
        <h1 className="text-2xl font-bold text-foreground">My Jobs</h1>
        <p className="text-muted-foreground">
          {isProvider ? 'Manage your applications' : 'Track your posted jobs'}
        </p>
      </header>

      {/* Tabs */}
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
                job && <JobCard key={job.id} job={job as any} showActions={false} />
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
                job && <JobCard key={job.id} job={job as any} showActions={false} />
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
    </MobileLayout>
  );
};

export default MyJobs;
