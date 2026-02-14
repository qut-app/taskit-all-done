import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, Clock, Shield, Loader2, Heart, Flag } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { OnlineIndicator } from '@/components/ui/OnlineIndicator';
import { ReportUserDialog } from '@/components/ReportUserDialog';
import { useProvider } from '@/hooks/useProviders';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const ViewProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { provider, loading } = useProvider(userId || '');
  const { toast } = useToast();
  const [hiringState, setHiringState] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [reviews, setReviews] = useState<any[]>([]);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('reviews')
      .select('*')
      .eq('reviewee_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setReviews(data || []));
  }, [userId]);

  const handleHire = async () => {
    if (!user || !userId) return;
    setHiringState('loading');
    try {
      // Create a quick hire request - need a job context, create a direct hire job
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          title: `Direct Hire: ${provider?.profile?.full_name}`,
          category: (provider?.service_categories || ['General'])[0],
          service_mode: provider?.service_mode || 'both',
          expected_delivery_time: provider?.delivery_time || '3 days',
          requester_id: user.id,
        })
        .select()
        .single();

      if (jobError) throw jobError;

      const { error: hireError } = await supabase
        .from('hire_requests')
        .insert({
          job_id: job.id,
          provider_id: userId,
          requester_id: user.id,
        });

      if (hireError) throw hireError;

      // Notify provider
      await supabase.from('notifications').insert({
        user_id: userId,
        title: '🤝 Incoming Hire Request',
        message: `Someone wants to hire you! Check your hire requests.`,
        type: 'hire_request',
        metadata: { job_id: job.id, requester_id: user.id },
      });

      setHiringState('sent');
      toast({ title: 'Hire request sent!', description: 'The provider has been notified.' });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setHiringState('idle');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <h2 className="text-xl font-bold text-foreground">Provider not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const profile = provider.profile;
  const isCompany = profile?.account_type === 'company';
  const displayName = isCompany ? profile?.company_name : profile?.full_name;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 safe-top border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold text-lg flex-1">Provider Profile</h1>
        {user && user.id !== userId && (
          <Button variant="ghost" size="icon" onClick={() => setReportOpen(true)} className="text-muted-foreground hover:text-destructive">
            <Flag className="w-5 h-5" />
          </Button>
        )}
      </header>

      {userId && (
        <ReportUserDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          reportedUserId={userId}
          reportedUserName={displayName || undefined}
        />
      )}

      {/* Profile Header */}
      <div className="p-6 text-center">
        <div className="relative inline-block">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold mx-auto ${
            isCompany ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'
          }`}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName || ''} className="w-full h-full rounded-full object-cover" />
            ) : (
              displayName?.charAt(0) || 'P'
            )}
          </div>
          {/* Verified badge moved inline next to role label below */}
          <OnlineIndicator
            isOnline={profile?.is_online}
            lastSeenAt={profile?.last_seen_at}
            size="md"
            className="absolute bottom-0 right-0"
          />
        </div>

        <h2 className="text-xl font-bold text-foreground mt-3 flex items-center justify-center gap-2">
          {displayName || 'Provider'}
          {isCompany && <Badge variant="outline">Business</Badge>}
        </h2>
        <div className="flex items-center justify-center gap-2 mt-1">
          <Badge variant={isCompany ? 'secondary' : 'default'}>
            {isCompany ? 'Company' : 'Service Provider'}
          </Badge>
          <VerificationBadge
            status={profile?.verification_status as any}
            accountType={isCompany ? 'company' : 'individual'}
            size="sm"
          />
        </div>

        {profile?.location && (
          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mt-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{profile.location}</span>
          </div>
        )}

        {provider.service_description && (
          <p className="text-sm text-muted-foreground mt-3 max-w-xs mx-auto">{provider.service_description}</p>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 px-6 pb-4">
        <Card className="p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Star className="w-4 h-4 text-warning fill-warning" />
            <span className="text-lg font-bold">{Number(provider.rating) || 0}</span>
          </div>
          <p className="text-xs text-muted-foreground">{provider.review_count || 0} reviews</p>
        </Card>
        <Card className="p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-lg font-bold">{provider.on_time_delivery_score || 0}%</span>
          </div>
          <p className="text-xs text-muted-foreground">On-time</p>
        </Card>
        <Card className="p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Shield className="w-4 h-4 text-success" />
            <span className="text-lg font-bold">{provider.delivery_time || '3d'}</span>
          </div>
          <p className="text-xs text-muted-foreground">Delivery</p>
        </Card>
      </div>

      {/* Categories */}
      <div className="px-6 pb-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Services</h3>
        <div className="flex flex-wrap gap-2">
          {(provider.service_categories || []).map((cat) => (
            <Badge key={cat} variant="secondary">{cat}</Badge>
          ))}
        </div>
      </div>

      {/* Portfolio */}
      {(provider.work_showcases || []).length > 0 && (
        <div className="px-6 pb-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Portfolio</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {provider.work_showcases!.map((showcase) => (
              <motion.div
                key={showcase.id}
                className="aspect-square rounded-lg overflow-hidden bg-muted"
                whileHover={{ scale: 1.02 }}
              >
                {showcase.media_type === 'video' ? (
                  <video src={showcase.media_url} className="w-full h-full object-cover" />
                ) : (
                  <img src={showcase.media_url} alt={showcase.caption || ''} className="w-full h-full object-cover" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="px-6 pb-4">
        <h3 className="text-sm font-semibold text-foreground mb-2">Reviews</h3>
        {reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((review) => (
              <Card key={review.id} className="p-3">
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i < (review.overall_rating || 0) ? 'text-warning fill-warning' : 'text-muted'}`}
                    />
                  ))}
                </div>
                {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No reviews yet</p>
        )}
      </div>

      {/* Hire Button */}
      {user && user.id !== userId && (
        <div className="p-6 safe-bottom">
          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={handleHire}
            disabled={hiringState !== 'idle'}
          >
            {hiringState === 'loading' ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending request…
              </span>
            ) : hiringState === 'sent' ? (
              '✅ Hire Request Sent!'
            ) : (
              'Hire Now'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ViewProfile;
