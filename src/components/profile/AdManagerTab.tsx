import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Loader2, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePaystackPayment } from '@/hooks/usePaystackPayment';
import { supabase } from '@/integrations/supabase/client';

const BUDGET_OPTIONS = [
  { amount: 500, reach: '~300 reach' },
  { amount: 1000, reach: '~750 reach' },
  { amount: 2000, reach: '~1,800 reach' },
  { amount: 5000, reach: '~5,000 reach' },
  { amount: 10000, reach: '~12,000 reach' },
];

const TARGET_AUDIENCES = ['Everyone', 'Service Providers', 'Job Givers', 'Companies', 'Individuals'];

export function AdManagerTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { initializePayment, loading: paymentLoading } = usePaystackPayment();
  const [step, setStep] = useState<'list' | 'create' | 'success'>('list');
  const [myAds, setMyAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [targetAudience, setTargetAudience] = useState('Everyone');
  const [locationTarget, setLocationTarget] = useState('');
  const [selectedBudget, setSelectedBudget] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchMyAds = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('ads')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setMyAds(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchMyAds(); }, [user]);

  const wordCount = description.trim().split(/\s+/).filter(Boolean).length;

  const handleSubmit = async () => {
    if (!user || !selectedBudget || !title.trim()) return;
    setSubmitting(true);

    try {
      let image_url: string | null = null;
      if (mediaFile) {
        const ext = mediaFile.name.split('.').pop();
        const path = `${user.id}/ads/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('user-media')
          .upload(path, mediaFile, { upsert: false });
        if (uploadErr) throw uploadErr;
        const { data: { publicUrl } } = supabase.storage.from('user-media').getPublicUrl(path);
        image_url = publicUrl;
      }

      // Create ad first with pending status
      const { data: adData, error: adError } = await supabase
        .from('ads')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          image_url,
          target_audience: targetAudience,
          location_targeting: locationTarget || null,
          budget: selectedBudget,
          ad_type: mediaFile?.type?.startsWith('video') ? 'video' : 'image',
          approval_status: 'pending_payment',
          is_active: false,
        } as any)
        .select()
        .single();

      if (adError) throw adError;

      // Redirect to Paystack
      initializePayment({
        amount: selectedBudget,
        subscriptionType: `ad_payment_${adData.id}`,
        onSuccess: async (ref) => {
          await supabase
            .from('ads')
            .update({ approval_status: 'pending_approval', paystack_reference: ref, spend_amount: selectedBudget } as any)
            .eq('id', adData.id);

          // Notify admins
          const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
          if (adminRoles) {
            const notifications = adminRoles.map(r => ({
              user_id: r.user_id,
              title: '📢 New Ad Submission',
              message: `A new ad "${title.trim()}" has been submitted and paid for. Please review.`,
              type: 'ad_submission',
            }));
            await supabase.from('notifications').insert(notifications);
          }

          setStep('success');
          fetchMyAds();
        },
        onCancel: async () => {
          await supabase.from('ads').delete().eq('id', adData.id);
          toast({ title: 'Payment cancelled', description: 'Ad was not created.' });
        },
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setMediaFile(null);
    setTargetAudience('Everyone'); setLocationTarget('');
    setSelectedBudget(null); setStep('list');
  };

  if (step === 'success') {
    return (
      <Card className="p-5">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
          <p className="font-semibold text-foreground">Ad submitted successfully!</p>
          <p className="text-sm text-muted-foreground mt-1">Your ad is pending admin approval.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={resetForm}>Back to My Ads</Button>
        </motion.div>
      </Card>
    );
  }

  if (step === 'create') {
    return (
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Create Ad</h3>
          <Button variant="ghost" size="sm" onClick={() => setStep('list')}>Cancel</Button>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Title (max 60 chars)</label>
          <Input value={title} onChange={e => setTitle(e.target.value.slice(0, 60))} placeholder="Your ad title" />
          <p className="text-xs text-muted-foreground mt-1">{title.length}/60</p>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Description (max 150 words)</label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your ad..." rows={3} />
          <p className="text-xs text-muted-foreground mt-1">{wordCount}/150 words</p>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Image/Video</label>
          <Input type="file" accept="image/*,video/*" onChange={e => setMediaFile(e.target.files?.[0] || null)} />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Audience</label>
          <div className="flex flex-wrap gap-2">
            {TARGET_AUDIENCES.map(a => (
              <Badge key={a} variant={targetAudience === a ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setTargetAudience(a)}>
                {a}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Location Targeting (optional)</label>
          <Input value={locationTarget} onChange={e => setLocationTarget(e.target.value)} placeholder="e.g. Lagos, Abuja" />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Budget</label>
          <div className="grid grid-cols-2 gap-2">
            {BUDGET_OPTIONS.map(opt => (
              <Card
                key={opt.amount}
                className={`p-3 cursor-pointer transition-all text-center ${selectedBudget === opt.amount ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:bg-muted/50'}`}
                onClick={() => setSelectedBudget(opt.amount)}
              >
                <p className="text-lg font-bold text-foreground">₦{opt.amount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{opt.reach}</p>
              </Card>
            ))}
          </div>
          {selectedBudget && (
            <p className="text-sm text-primary font-medium mt-2 text-center">
              Estimated reach: {BUDGET_OPTIONS.find(b => b.amount === selectedBudget)?.reach}
            </p>
          )}
        </div>

        <Button
          className="w-full"
          disabled={!title.trim() || wordCount > 150 || !selectedBudget || submitting || paymentLoading}
          onClick={handleSubmit}
        >
          {(submitting || paymentLoading) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Megaphone className="w-4 h-4 mr-2" />}
          Pay ₦{selectedBudget?.toLocaleString() || '0'} & Submit
        </Button>
      </Card>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Ad Manager</h3>
          <Button size="sm" onClick={() => setStep('create')}>
            <Megaphone className="w-4 h-4 mr-1" />
            Create Ad
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Create and manage ads to promote your services or products.</p>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : myAds.length === 0 ? (
        <Card className="p-8 text-center">
          <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No ads yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first ad to reach more people</p>
        </Card>
      ) : (
        myAds.map(ad => (
          <Card key={ad.id} className="p-4">
            <div className="flex items-start gap-3">
              {ad.image_url && (
                <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  <img src={ad.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm">{ad.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant={
                    ad.approval_status === 'approved' ? 'default' :
                    ad.approval_status === 'rejected' ? 'destructive' : 'secondary'
                  } className="text-xs capitalize">
                    {(ad.approval_status || 'pending').replace('_', ' ')}
                  </Badge>
                  {ad.budget && <Badge variant="outline" className="text-xs">₦{Number(ad.budget).toLocaleString()}</Badge>}
                </div>
                {ad.reject_reason && (
                  <p className="text-xs text-destructive mt-1">Reason: {ad.reject_reason}</p>
                )}
                {ad.approval_status === 'approved' && (
                  <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{ad.impressions || 0} views</span>
                    <span>{ad.clicks || 0} clicks</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
