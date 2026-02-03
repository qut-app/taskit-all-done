import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (error) throw error;
        setIsAdmin(!!data);
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  return { isAdmin, loading };
}

export function useAdminData() {
  const [users, setUsers] = useState<any[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [showcases, setShowcases] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      setUsers(profilesData || []);

      // Fetch pending verifications
      const { data: pendingData } = await supabase
        .from('profiles')
        .select('*')
        .eq('verification_status', 'pending')
        .order('created_at', { ascending: false });
      setPendingVerifications(pendingData || []);

      // Fetch unapproved showcases
      const { data: showcasesData } = await supabase
        .from('work_showcases')
        .select(`
          *,
          provider_profiles(
            user_id,
            profiles:user_id(full_name)
          )
        `)
        .eq('is_approved', false)
        .order('created_at', { ascending: false });
      setShowcases(showcasesData || []);

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('service_categories')
        .select('*')
        .order('name');
      setCategories(categoriesData || []);

      // Fetch ads
      const { data: adsData } = await supabase
        .from('ads')
        .select('*')
        .order('created_at', { ascending: false });
      setAds(adsData || []);

      // Fetch subscriptions
      const { data: subsData } = await supabase
        .from('subscriptions')
        .select(`
          *,
          profiles:user_id(full_name, email)
        `)
        .order('created_at', { ascending: false });
      setSubscriptions(subsData || []);

    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const approveVerification = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ verification_status: 'verified' })
      .eq('user_id', userId);
    
    if (!error) await fetchData();
    return { error };
  };

  const rejectVerification = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ verification_status: 'unverified' })
      .eq('user_id', userId);
    
    if (!error) await fetchData();
    return { error };
  };

  const approveShowcase = async (showcaseId: string) => {
    const { error } = await supabase
      .from('work_showcases')
      .update({ is_approved: true })
      .eq('id', showcaseId);
    
    if (!error) await fetchData();
    return { error };
  };

  const rejectShowcase = async (showcaseId: string) => {
    const { error } = await supabase
      .from('work_showcases')
      .delete()
      .eq('id', showcaseId);
    
    if (!error) await fetchData();
    return { error };
  };

  const createCategory = async (name: string, icon: string) => {
    const { error } = await supabase
      .from('service_categories')
      .insert({ name, icon });
    
    if (!error) await fetchData();
    return { error };
  };

  const updateCategory = async (id: string, data: { name?: string; icon?: string; is_active?: boolean }) => {
    const { error } = await supabase
      .from('service_categories')
      .update(data)
      .eq('id', id);
    
    if (!error) await fetchData();
    return { error };
  };

  const createAd = async (data: { title: string; image_url?: string; link_url?: string; ad_type: string }) => {
    const { error } = await supabase
      .from('ads')
      .insert(data);
    
    if (!error) await fetchData();
    return { error };
  };

  const updateAd = async (id: string, data: { is_active?: boolean; title?: string }) => {
    const { error } = await supabase
      .from('ads')
      .update(data)
      .eq('id', id);
    
    if (!error) await fetchData();
    return { error };
  };

  const deleteAd = async (id: string) => {
    const { error } = await supabase
      .from('ads')
      .delete()
      .eq('id', id);
    
    if (!error) await fetchData();
    return { error };
  };

  return {
    users,
    pendingVerifications,
    showcases,
    categories,
    ads,
    subscriptions,
    loading,
    refetch: fetchData,
    approveVerification,
    rejectVerification,
    approveShowcase,
    rejectShowcase,
    createCategory,
    updateCategory,
    createAd,
    updateAd,
    deleteAd,
  };
}
