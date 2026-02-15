import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'>;
type Profile = Tables<'profiles'>;

interface JobWithRequester extends Job {
  requester_profile?: Profile | null;
}

export interface JobSearchFilters {
  searchQuery: string;
  category: string | null;
  serviceMode: 'all' | 'online' | 'offline';
  location: string | null;
  accountType: 'all' | 'individual' | 'company';
  budgetMin: number | null;
  budgetMax: number | null;
  datePosted: 'all' | '24h' | '7d' | '30d';
}

export const DEFAULT_FILTERS: JobSearchFilters = {
  searchQuery: '',
  category: null,
  serviceMode: 'all',
  location: null,
  accountType: 'all',
  budgetMin: null,
  budgetMax: null,
  datePosted: 'all',
};

export function useJobSearch(filters: JobSearchFilters) {
  const [jobs, setJobs] = useState<JobWithRequester[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      // Build server-side query
      let query = supabase
        .from('jobs')
        .select('*', { count: 'exact' })
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      // Category filter
      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      // Service mode filter
      if (filters.serviceMode !== 'all') {
        // Match exact mode OR 'both'
        query = query.or(`service_mode.eq.${filters.serviceMode},service_mode.eq.both`);
      }

      // Location filter (case-insensitive partial match)
      if (filters.location && filters.location.trim()) {
        query = query.ilike('location', `%${filters.location.trim()}%`);
      }

      // Budget range filters
      if (filters.budgetMin !== null && filters.budgetMin > 0) {
        query = query.gte('budget', filters.budgetMin);
      }
      if (filters.budgetMax !== null && filters.budgetMax > 0) {
        query = query.lte('budget', filters.budgetMax);
      }

      // Date posted filter
      if (filters.datePosted !== 'all') {
        const now = new Date();
        let cutoff: Date;
        switch (filters.datePosted) {
          case '24h':
            cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
            cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            cutoff = new Date(0);
        }
        query = query.gte('created_at', cutoff.toISOString());
      }

      // Keyword search (title or description, case-insensitive)
      if (filters.searchQuery && filters.searchQuery.trim()) {
        const term = filters.searchQuery.trim();
        query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
      }

      const { data: jobsData, count, error } = await query;
      if (error) throw error;

      setTotalCount(count || 0);

      // Fetch requester profiles for account type filtering and display
      const requesterIds = [...new Set((jobsData || []).map(j => j.requester_id))];
      let profiles: Profile[] = [];
      if (requesterIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', requesterIds);
        profiles = profilesData || [];
      }

      const profileMap = new Map(profiles.map(p => [p.user_id, p]));

      let typedJobs: JobWithRequester[] = (jobsData || []).map(job => ({
        ...job,
        requester_profile: profileMap.get(job.requester_id) || null,
      }));

      // Account type filter (requires profile data, applied client-side)
      if (filters.accountType !== 'all') {
        typedJobs = typedJobs.filter(job =>
          job.requester_profile?.account_type === filters.accountType
        );
      }

      setJobs(typedJobs);
    } catch (err) {
      console.error('Error fetching jobs:', err);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Debounce the fetch - 300ms for search queries, immediate for other filters
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Use debounce only if there's a search query change
    const delay = filters.searchQuery ? 300 : 50;
    debounceRef.current = setTimeout(() => {
      fetchJobs();
    }, delay);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchJobs]);

  return {
    jobs,
    loading,
    totalCount,
    refetch: fetchJobs,
  };
}
