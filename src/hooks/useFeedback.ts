import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Feedback {
  id: string;
  user_id: string;
  role: string;
  category: string;
  message: string;
  attachment_url: string | null;
  status: string;
  admin_notes: string | null;
  priority: string | null;
  created_at: string;
  updated_at: string;
}

const FEEDBACK_CATEGORIES = [
  'Bug Report',
  'Feature Request',
  'UI/UX Issue',
  'Payment Issue',
  'Account Issue',
  'General Suggestion',
] as const;

const RATE_LIMIT_MS = 2 * 60 * 1000; // 2 minutes

export function useFeedback() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmittedAt, setLastSubmittedAt] = useState<number>(0);

  const canSubmit = Date.now() - lastSubmittedAt > RATE_LIMIT_MS;

  const submitFeedback = async ({
    category,
    message,
    role,
    attachmentFile,
  }: {
    category: string;
    message: string;
    role: string;
    attachmentFile?: File | null;
  }) => {
    if (!user) return { error: new Error('Not authenticated') };
    if (!canSubmit) {
      toast({ title: 'Please wait', description: 'You can submit feedback once every 2 minutes.', variant: 'destructive' });
      return { error: new Error('Rate limited') };
    }

    setSubmitting(true);
    let attachment_url: string | null = null;

    try {
      if (attachmentFile) {
        const ext = attachmentFile.name.split('.').pop();
        const path = `${user.id}/feedback/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('user-media')
          .upload(path, attachmentFile, { upsert: false });
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage
          .from('user-media')
          .getPublicUrl(path);
        attachment_url = publicUrl;
      }

      const { error } = await supabase.from('feedback' as any).insert({
        user_id: user.id,
        role,
        category,
        message,
        attachment_url,
      } as any);

      if (error) throw error;

      setLastSubmittedAt(Date.now());
      return { error: null };
    } catch (err: any) {
      return { error: err };
    } finally {
      setSubmitting(false);
    }
  };

  return { submitFeedback, submitting, canSubmit, FEEDBACK_CATEGORIES };
}

export function useAdminFeedback() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedbacks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('feedback' as any)
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setFeedbacks(data as any[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const updateFeedback = async (id: string, updates: { status?: string; admin_notes?: string; priority?: string }) => {
    const { error } = await supabase
      .from('feedback' as any)
      .update(updates as any)
      .eq('id', id);
    if (!error) await fetchFeedbacks();
    return { error };
  };

  return { feedbacks, loading, updateFeedback, refetch: fetchFeedbacks };
}
