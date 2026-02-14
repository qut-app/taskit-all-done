import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useModeration() {
  const [reports, setReports] = useState<any[]>([]);
  const [roleSwitchLogs, setRoleSwitchLogs] = useState<any[]>([]);
  const [suspiciousFlags, setSuspiciousFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportsRes, logsRes, flagsRes] = await Promise.all([
        supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('role_switch_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('suspicious_flags')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      setReports(reportsRes.data || []);
      setRoleSwitchLogs(logsRes.data || []);
      setSuspiciousFlags(flagsRes.data || []);
    } catch (err) {
      console.error('Error fetching moderation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateReportStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('reports').update({ status }).eq('id', id);
    if (!error) await fetchData();
    return { error };
  };

  const addAdminNotes = async (id: string, notes: string) => {
    const { error } = await supabase.from('reports').update({ admin_notes: notes }).eq('id', id);
    if (!error) await fetchData();
    return { error };
  };

  const setAdminAction = async (id: string, action: string) => {
    const { error } = await supabase.from('reports').update({ admin_action: action, status: 'resolved' }).eq('id', id);
    if (!error) await fetchData();
    return { error };
  };

  const sendWarning = async (userId: string, message: string) => {
    const [profileRes, notifRes] = await Promise.all([
      supabase.from('profiles').update({ admin_warning: message, admin_warning_at: new Date().toISOString() }).eq('user_id', userId),
      supabase.from('notifications').insert({
        user_id: userId,
        title: '⚠️ Admin Warning',
        message,
        type: 'warning',
      }),
    ]);
    if (!profileRes.error) {
      toast({ title: 'Warning sent' });
      await fetchData();
    }
    return { error: profileRes.error || notifRes.error };
  };

  const suspendUser = async (userId: string, duration?: string) => {
    const { error } = await supabase.from('profiles').update({ is_suspended: true }).eq('user_id', userId);
    if (!error) {
      await supabase.from('notifications').insert({
        user_id: userId,
        title: '🔒 Account Suspended',
        message: duration ? `Your account has been suspended for ${duration}.` : 'Your account has been permanently suspended.',
        type: 'suspension',
      });
      await supabase.from('suspicious_flags').insert({
        user_id: userId,
        flag_type: 'admin_suspension',
        description: duration ? `Suspended for ${duration}` : 'Permanently suspended',
      });
      toast({ title: 'User suspended' });
      await fetchData();
    }
    return { error };
  };

  const flagAccount = async (userId: string) => {
    const { error } = await supabase.from('suspicious_flags').insert({
      user_id: userId,
      flag_type: 'admin_flagged',
      description: 'Flagged by admin for restricted visibility',
    });
    if (!error) {
      toast({ title: 'Account flagged' });
      await fetchData();
    }
    return { error };
  };

  const resolveFlag = async (flagId: string) => {
    const { error } = await supabase.from('suspicious_flags').update({ is_resolved: true }).eq('id', flagId);
    if (!error) await fetchData();
    return { error };
  };

  // Auto-detect abuse
  const checkAbuseThresholds = (userId: string) => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const recentReports = reports.filter(
      (r) => r.reported_user_id === userId && new Date(r.created_at) > sevenDaysAgo
    );
    const paymentComplaints = recentReports.filter((r) => r.reason?.includes('Payment'));
    const recentSwitches = roleSwitchLogs.filter(
      (l) => l.user_id === userId && new Date(l.created_at) > twoDaysAgo
    );

    return {
      hasThreeReports: recentReports.length >= 3,
      hasTwoPaymentComplaints: paymentComplaints.length >= 2,
      hasFiveSwitches: recentSwitches.length >= 5,
      shouldFlag: recentReports.length >= 3 || paymentComplaints.length >= 2 || recentSwitches.length >= 5,
    };
  };

  // Detect suspicious role switch patterns
  const getSuspiciousSwitchers = () => {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const recentLogs = roleSwitchLogs.filter((l) => new Date(l.created_at) > twoDaysAgo);

    const userCounts: Record<string, number> = {};
    recentLogs.forEach((l) => {
      userCounts[l.user_id] = (userCounts[l.user_id] || 0) + 1;
    });

    return Object.entries(userCounts)
      .filter(([, count]) => count >= 3)
      .map(([userId, count]) => ({ userId, count }));
  };

  return {
    reports,
    roleSwitchLogs,
    suspiciousFlags,
    loading,
    refetch: fetchData,
    updateReportStatus,
    addAdminNotes,
    setAdminAction,
    sendWarning,
    suspendUser,
    flagAccount,
    resolveFlag,
    checkAbuseThresholds,
    getSuspiciousSwitchers,
  };
}
