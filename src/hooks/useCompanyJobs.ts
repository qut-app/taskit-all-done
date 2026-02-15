import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables } from '@/integrations/supabase/types';

type Job = Tables<'jobs'>;

export interface CompanyJobFilters {
  status?: string;
  category?: string;
  budgetMin?: number;
  budgetMax?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export function useCompanyJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<CompanyJobFilters>({});

  const fetchJobs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('jobs')
        .select('*')
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false });

      // Apply filters server-side
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status as any);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.budgetMin !== undefined && filters.budgetMin > 0) {
        query = query.gte('budget', filters.budgetMin);
      }
      if (filters.budgetMax !== undefined && filters.budgetMax > 0) {
        query = query.lte('budget', filters.budgetMax);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Error fetching company jobs:', error);
      }
      setJobs(data || []);
    } catch (err) {
      console.error('Error fetching company jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [user, filters]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const updateFilters = (newFilters: CompanyJobFilters) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
  };

  return { jobs, loading, filters, updateFilters, clearFilters, refetch: fetchJobs };
}
