import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MobileLayout from '@/components/navigation/MobileLayout';
import JobCard from '@/components/cards/JobCard';
import { useApp } from '@/context/AppContext';

const MyJobs = () => {
  const { jobs, currentRole } = useApp();
  const [activeTab, setActiveTab] = useState('active');

  // Filter jobs based on role
  const myJobs = currentRole === 'requester' 
    ? jobs.filter(j => j.requesterId === 'current-user' || j.requesterId === 'user1' || j.requesterId === 'user2')
    : jobs.filter(j => j.assignedProviderId === '3' || j.status === 'assigned');

  const activeJobs = myJobs.filter(j => j.status === 'open' || j.status === 'assigned' || j.status === 'in_progress');
  const completedJobs = myJobs.filter(j => j.status === 'completed');
  const cancelledJobs = myJobs.filter(j => j.status === 'cancelled');

  return (
    <MobileLayout>
      {/* Header */}
      <header className="p-4 safe-top">
        <h1 className="text-2xl font-bold text-foreground">My Jobs</h1>
        <p className="text-muted-foreground">
          {currentRole === 'requester' ? 'Track your posted jobs' : 'Manage your assigned jobs'}
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
            {activeJobs.length > 0 ? (
              activeJobs.map((job) => (
                <JobCard key={job.id} job={job} showActions={false} />
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
                <JobCard key={job.id} job={job} showActions={false} />
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
                <JobCard key={job.id} job={job} showActions={false} />
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
