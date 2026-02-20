import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Loader2, CheckCircle, Image as ImageIcon, BarChart3, Eye, MousePointerClick, TrendingUp, ArrowLeft, Calendar, DollarSign, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { usePaystackPayment } from '@/hooks/usePaystackPayment';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const BUDGET_OPTIONS = [
  { amount: 500, reach: '~300 reach' },
  { amount: 1000, reach: '~750 reach' },
  { amount: 2000, reach: '~1,800 reach' },
  { amount: 5000, reach: '~5,000 reach' },
  { amount: 10000, reach: '~12,000 reach' },
];

const TARGET_AUDIENCES = ['Everyone', 'Service Providers', 'Job Givers', 'Companies', 'Individuals'];

interface AdAnalytics {
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  engagement: number;
  profile_visits: number;
  messages: number;
  job_requests: number;
}

export function AdManagerTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { initializePayment, loading: paymentLoading } = usePaystackPayment();
  const [step, setStep] = useState<'list' | 'create' | 'success' | 'analytics'>('list');
  const [myAds, setMyAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState<any>(null);
  const [adAnalytics, setAdAnalytics] = useState<AdAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

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

  const fetchAdAnalytics = async (ad: any) => {
    setAnalyticsLoading(true);
    setSelectedAd(ad);
    setStep('analytics');

    try {
      const { data: events } = await supabase
        .from('ad_events' as any)
        .select('event_type, user_id')
        .eq('ad_id', ad.id);

      const evts = (events || []) as any[];
      const impressions = evts.filter(e => e.event_type === 'impression').length;
      const uniqueUsers = new Set(evts.filter(e => e.event_type === 'impression' && e.user_id).map(e => e.user_id));
      const clicks = evts.filter(e => e.event_type === 'click').length;
      const likes = evts.filter(e => e.event_type === 'like').length;
      const saves = evts.filter(e => e.event_type === 'save').length;
      const reposts = evts.filter(e => e.event_type === 'repost').length;
      const profile_visits = evts.filter(e => e.event_type === 'profile_visit').length;
      const messages = evts.filter(e => e.event_type === 'message').length;
      const job_requests = evts.filter(e => e.event_type === 'job_request').length;

      setAdAnalytics({
        impressions: impressions || ad.impressions || 0,
        reach: uniqueUsers.size || ad.reach || 0,
        clicks: clicks || ad.clicks || 0,
        ctr: impressions > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0,
        engagement: likes + saves + reposts,
        profile_visits,
        messages,
        job_requests,
      });
    } catch {
      setAdAnalytics({
        impressions: ad.impressions || 0,
        reach: ad.reach || 0,
        clicks: ad.clicks || 0,
        ctr: ad.impressions > 0 ? Number(((ad.clicks / ad.impressions) * 100).toFixed(2)) : 0,
        engagement: 0,
        profile_visits: 0,
        messages: 0,
        job_requests: 0,
      });
    } finally {
      setAnalyticsLoading(false);
    }
  };

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

      initializePayment({
        amount: selectedBudget,
        subscriptionType: `ad_payment_${adData.id}`,
        onSuccess: async (ref) => {
          await supabase
            .from('ads')
            .update({ approval_status: 'pending_approval', paystack_reference: ref, spend_amount: selectedBudget } as any)
            .eq('id', adData.id);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success/10 text-success border-success/20';
      case 'rejected': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'pending_approval': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'pending_payment': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  const getStatusLabel = (ad: any) => {
    if (ad.approval_status === 'approved' && ad.is_active) return 'Active';
    if (ad.approval_status === 'approved' && !ad.is_active) return 'Completed';
    if (ad.approval_status === 'rejected') return 'Rejected';
    return (ad.approval_status || 'pending').replace(/_/g, ' ');
  };

  // ====== ANALYTICS VIEW ======
  if (step === 'analytics' && selectedAd) {
    const budgetSpent = selectedAd.spend_amount || 0;
    const totalBudget = selectedAd.budget || 0;
    const budgetProgress = totalBudget > 0 ? (budgetSpent / totalBudget) * 100 : 0;

    return (
      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="iconSm" onClick={() => { setStep('list'); setSelectedAd(null); setAdAnalytics(null); }}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">{selectedAd.title}</h3>
              <Badge className={`text-xs mt-1 ${getStatusColor(selectedAd.approval_status)}`}>
                {getStatusLabel(selectedAd)}
              </Badge>
            </div>
          </div>

          {selectedAd.image_url && (
            <div className="w-full h-40 rounded-lg bg-muted overflow-hidden mb-4">
              <img src={selectedAd.image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>Started: {selectedAd.start_date ? format(new Date(selectedAd.start_date), 'MMM d, yyyy') : format(new Date(selectedAd.created_at), 'MMM d, yyyy')}</span>
            </div>
            {selectedAd.end_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>Ends: {format(new Date(selectedAd.end_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="w-3.5 h-3.5" />
              <span>Audience: {selectedAd.target_audience || 'Everyone'}</span>
            </div>
            {selectedAd.location_targeting && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>📍 {selectedAd.location_targeting}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Budget Progress */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Budget
            </p>
            <p className="text-sm text-muted-foreground">
              ₦{Number(budgetSpent).toLocaleString()} / ₦{Number(totalBudget).toLocaleString()}
            </p>
          </div>
          <Progress value={budgetProgress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {totalBudget - budgetSpent > 0 ? `₦${(totalBudget - budgetSpent).toLocaleString()} remaining` : 'Budget fully spent'}
          </p>
        </Card>

        {analyticsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : adAnalytics && (
          <>
            {/* Primary Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 text-center">
                <Eye className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{adAnalytics.impressions.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Impressions</p>
              </Card>
              <Card className="p-4 text-center">
                <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{adAnalytics.reach.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Unique Reach</p>
              </Card>
              <Card className="p-4 text-center">
                <MousePointerClick className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{adAnalytics.clicks.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Clicks</p>
              </Card>
              <Card className="p-4 text-center">
                <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{adAnalytics.ctr}%</p>
                <p className="text-xs text-muted-foreground">CTR</p>
              </Card>
            </div>

            {/* Engagement & ROI */}
            <Card className="p-5">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Engagement & ROI
              </h4>
              <div className="space-y-3">
                <MetricRow label="Total Engagement" value={adAnalytics.engagement} description="Likes, saves & reposts" />
                <MetricRow label="Profile Visits" value={adAnalytics.profile_visits} description="Users who visited your profile" />
                <MetricRow label="Messages Generated" value={adAnalytics.messages} description="Direct messages from ad" />
                <MetricRow label="Job Requests" value={adAnalytics.job_requests} description="Hire requests from ad" />
              </div>
            </Card>
          </>
        )}
      </div>
    );
  }

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

  // ====== LIST VIEW ======
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
                  <Badge className={`text-xs capitalize ${getStatusColor(ad.approval_status)}`}>
                    {getStatusLabel(ad)}
                  </Badge>
                  {ad.budget && <Badge variant="outline" className="text-xs">₦{Number(ad.budget).toLocaleString()}</Badge>}
                </div>
                {ad.reject_reason && (
                  <p className="text-xs text-destructive mt-1">Reason: {ad.reject_reason}</p>
                )}
                {(ad.approval_status === 'approved') && (
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{ad.impressions || 0} views</span>
                    <span>{ad.clicks || 0} clicks</span>
                    <span>{ad.reach || 0} reach</span>
                  </div>
                )}
              </div>
            </div>
            {(ad.approval_status === 'approved' || ad.approval_status === 'completed') && (
              <Button variant="soft" size="sm" className="w-full mt-3" onClick={() => fetchAdAnalytics(ad)}>
                <BarChart3 className="w-3.5 h-3.5 mr-1" />
                View Full Analytics
              </Button>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

function MetricRow({ label, value, description }: { label: string; value: number; description: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <p className="text-lg font-bold text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}
