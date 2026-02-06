import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'>;
type JobApplication = Tables<'job_applications'>;
type Profile = Tables<'profiles'>;

interface JobWithRequester extends Job {
  requester_profile?: Profile | null;
}

export function useJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobWithRequester[]>([]);
  const [myJobs, setMyJobs] = useState<JobWithRequester[]>([]);
  const [myApplications, setMyApplications] = useState<(JobApplication & { job?: Job })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      // Fetch all open jobs
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      
      // Fetch profiles for requesters
      const requesterIds = [...new Set((jobsData || []).map(j => j.requester_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', requesterIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      
      const typedJobs: JobWithRequester[] = (jobsData || []).map(job => ({
        ...job,
        requester_profile: profileMap.get(job.requester_id) || null
      }));
      
      setJobs(typedJobs);

      // Fetch my posted jobs if user exists
      if (user) {
        const { data: myJobsData } = await supabase
          .from('jobs')
          .select('*')
          .eq('requester_id', user.id)
          .order('created_at', { ascending: false });
        
        const typedMyJobs: JobWithRequester[] = (myJobsData || []).map(job => ({
          ...job,
          requester_profile: profileMap.get(job.requester_id) || null
        }));
        
        setMyJobs(typedMyJobs);

        // Fetch my applications
        const { data: applicationsData } = await supabase
          .from('job_applications')
          .select('*')
          .eq('provider_id', user.id)
          .order('created_at', { ascending: false });
        
        // Fetch jobs for applications
        if (applicationsData && applicationsData.length > 0) {
          const jobIds = applicationsData.map(a => a.job_id);
          const { data: appJobs } = await supabase
            .from('jobs')
            .select('*')
            .in('id', jobIds);
          
          const jobMap = new Map((appJobs || []).map(j => [j.id, j]));
          
          setMyApplications(applicationsData.map(app => ({
            ...app,
            job: jobMap.get(app.job_id)
          })));
        } else {
          setMyApplications([]);
        }
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [user]);

  const createJob = async (data: Partial<Job>) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('jobs')
      .insert({
        title: data.title || '',
        description: data.description,
        category: data.category || '',
        service_mode: data.service_mode || 'both',
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        expected_delivery_time: data.expected_delivery_time || '1 week',
        budget: data.budget,
        max_providers: data.max_providers || 3,
        requester_id: user.id,
      });

    if (!error) await fetchJobs();
    return { error };
  };

  const updateJob = async (id: string, data: Partial<Job>) => {
    const { error } = await supabase
      .from('jobs')
      .update(data)
      .eq('id', id);

    if (!error) await fetchJobs();
    return { error };
  };

  const deleteJob = async (id: string) => {
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (!error) await fetchJobs();
    return { error };
  };

  const applyToJob = async (jobId: string, message?: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('job_applications')
      .insert({
        job_id: jobId,
        provider_id: user.id,
        message,
      });

    if (!error) {
      // Find the job to get the requester_id for notification
      const job = jobs.find(j => j.id === jobId);
      if (job) {
        await supabase.from('notifications').insert({
          user_id: job.requester_id,
          title: '📋 New Job Application',
          message: `A Service Provider has applied to your job "${job.title}".`,
          type: 'job_application',
          metadata: { job_id: jobId, provider_id: user.id },
        });
      }
      await fetchJobs();
    }
    return { error };
  };

  const updateApplication = async (applicationId: string, status: string) => {
    const { error } = await supabase
      .from('job_applications')
      .update({ status })
      .eq('id', applicationId);

    if (!error) await fetchJobs();
    return { error };
  };

  const acceptProvider = async (jobId: string, applicationId: string, providerId: string) => {
    // Accept this application
    const { error: acceptError } = await supabase
      .from('job_applications')
      .update({ status: 'accepted' })
      .eq('id', applicationId);

    if (acceptError) return { error: acceptError };

    // Reject all other applications for this job
    await supabase
      .from('job_applications')
      .update({ status: 'rejected' })
      .eq('job_id', jobId)
      .neq('id', applicationId);

    // Update job status to in_progress
    const { error: jobError } = await supabase
      .from('jobs')
      .update({ 
        status: 'in_progress',
        assigned_provider_count: 1,
      })
      .eq('id', jobId);

    if (!jobError) {
      // Notify the accepted provider
      await supabase.from('notifications').insert({
        user_id: providerId,
        title: '🎉 Application Accepted!',
        message: 'Your job application has been accepted. The job is now active!',
        type: 'job_accepted',
        metadata: { job_id: jobId },
      });

      await fetchJobs();
    }
    return { error: jobError };
  };

  return {
    jobs,
    myJobs,
    myApplications,
    loading,
    refetch: fetchJobs,
    createJob,
    updateJob,
    deleteJob,
    applyToJob,
    updateApplication,
    acceptProvider,
  };
}
