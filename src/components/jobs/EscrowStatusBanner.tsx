import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Clock, CheckCircle, XCircle, Loader2, Camera } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface EscrowStatusBannerProps {
  jobId: string;
  isProvider: boolean;
  isRequester: boolean;
  jobStatus: string;
  onJobUpdate?: () => void;
}

export const EscrowStatusBanner = ({ jobId, isProvider, isRequester, jobStatus, onJobUpdate }: EscrowStatusBannerProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [escrow, setEscrow] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeFiles, setDisputeFiles] = useState<string[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    const fetchEscrow = async () => {
      const { data } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1);
      setEscrow(data?.[0] || null);
      setLoading(false);
    };
    fetchEscrow();
  }, [jobId]);

  // Countdown timer for auto-release (48h after delivered_at)
  useEffect(() => {
    if (!escrow?.delivered_at || escrow?.status !== 'held') return;

    const updateCountdown = () => {
      const deliveredAt = new Date(escrow.delivered_at).getTime();
      const autoReleaseAt = deliveredAt + 48 * 60 * 60 * 1000; // 48 hours
      const now = Date.now();
      const diff = autoReleaseAt - now;

      if (diff <= 0) {
        setCountdown('Auto-releasing...');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [escrow]);

  const handleMarkDelivered = async () => {
    if (!escrow || !user) return;
    setSubmitting(true);
    const { error } = await supabase
      .from('escrow_transactions')
      .update({ delivered_at: new Date().toISOString() })
      .eq('id', escrow.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Notify requester
      await supabase.from('notifications').insert({
        user_id: escrow.payer_id,
        title: '📦 Job Delivered',
        message: 'The provider has marked the job as delivered. You have 48 hours to confirm or report an issue.',
        type: 'job_delivery',
        metadata: { job_id: jobId, escrow_id: escrow.id },
      });
      toast({ title: 'Job marked as delivered!', description: 'The job giver has 48 hours to confirm.' });
      setEscrow({ ...escrow, delivered_at: new Date().toISOString() });
    }
    setSubmitting(false);
  };

  const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' });
      return;
    }
    setUploadingEvidence(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/disputes/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('user-media').upload(path, file);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('user-media').getPublicUrl(path);
      setDisputeFiles(prev => [...prev, publicUrl]);
    }
    setUploadingEvidence(false);
  };

  const handleReportIssue = async () => {
    if (!escrow || !disputeReason.trim()) return;
    setSubmitting(true);
    
    const { error } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'disputed',
        dispute_reason: disputeReason.trim(),
        dispute_evidence_urls: disputeFiles.length > 0 ? disputeFiles : null,
      })
      .eq('id', escrow.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Notify admin and provider
      await Promise.all([
        supabase.from('notifications').insert({
          user_id: escrow.payee_id,
          title: '⚠️ Dispute Raised',
          message: 'A dispute has been raised on your job. Funds are locked pending admin review.',
          type: 'dispute',
          metadata: { job_id: jobId, escrow_id: escrow.id },
        }),
      ]);
      toast({ title: 'Dispute filed', description: 'Funds are locked. Admin will review.' });
      setShowDisputeDialog(false);
      setEscrow({ ...escrow, status: 'disputed' });
    }
    setSubmitting(false);
  };

  const formatBudget = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
  };

  const handleCancel = async (providerArrived: boolean) => {
    if (!escrow || !user) return;
    setSubmitting(true);

    const amount = Number(escrow.amount);
    let cancellationFee = 0;
    let refundAmount = amount;

    if (providerArrived) {
      // 15% or ₦2,000 minimum
      cancellationFee = Math.max(amount * 0.15, 2000);
      refundAmount = amount - cancellationFee;
    }

    const { error } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'cancelled',
        cancellation_fee: cancellationFee,
      })
      .eq('id', escrow.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Update job status
      await supabase.from('jobs').update({ status: 'cancelled' }).eq('id', jobId);

      if (providerArrived && cancellationFee > 0) {
        // Credit call-out fee to provider wallet
        await supabase.from('wallet_transactions').insert({
          user_id: escrow.payee_id,
          type: 'credit',
          source: 'cancellation_fee',
          amount: cancellationFee,
          reference: `cancel_fee_${escrow.id}`,
          escrow_transaction_id: escrow.id,
        });
        // Update provider wallet
        try { await supabase.rpc('process_escrow_release', { _escrow_id: escrow.id }); } catch {}
      }

      // Notify both parties
      const msgs = [
        supabase.from('notifications').insert({
          user_id: escrow.payee_id,
          title: '❌ Job Cancelled',
          message: providerArrived
            ? `Job cancelled after arrival. Call-out fee: ${formatBudget(cancellationFee)}`
            : 'The job has been cancelled. No charges applied.',
          type: 'cancellation',
          metadata: { job_id: jobId, cancellation_fee: cancellationFee },
        }),
      ];
      await Promise.all(msgs);

      toast({
        title: 'Job cancelled',
        description: providerArrived
          ? `Call-out fee: ${formatBudget(cancellationFee)} | Refund: ${formatBudget(refundAmount)}`
          : `Full refund: ${formatBudget(amount)}`,
      });
      setShowCancelDialog(false);
      setEscrow({ ...escrow, status: 'cancelled', cancellation_fee: cancellationFee });
      onJobUpdate?.();
    }
    setSubmitting(false);
  };

  if (loading) return null;

  // No escrow for this job
  if (!escrow) {
    if (isProvider && (jobStatus === 'in_progress' || jobStatus === 'assigned')) {
      return (
        <Card className="p-3 border-warning/30 bg-warning/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
            <p className="text-sm font-medium text-warning">⚠️ Do NOT start work until payment is secured.</p>
          </div>
        </Card>
      );
    }
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Payment Status Banner */}
      {escrow.status === 'held' && !escrow.delivered_at && (
        <Card className="p-3 border-success/30 bg-success/5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-success shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-success">Payment Secured ✅ – {isProvider ? 'You may begin work.' : 'Provider can start work.'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatBudget(Number(escrow.amount))} held in escrow
              </p>
            </div>
          </div>
          {isProvider && (
            <Button size="sm" className="w-full mt-2 gap-1" onClick={handleMarkDelivered} disabled={submitting}>
              {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
              Mark as Delivered
            </Button>
          )}
          {isRequester && (
            <Button size="sm" variant="outline" className="w-full mt-2 gap-1 text-destructive" onClick={() => setShowCancelDialog(true)}>
              Cancel Job
            </Button>
          )}
        </Card>
      )}

      {/* Provider delivered, waiting for requester confirmation */}
      {escrow.status === 'held' && escrow.delivered_at && (
        <Card className="p-3 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {isRequester ? 'Provider has delivered. Please confirm.' : 'Awaiting confirmation from job giver.'}
              </p>
              {countdown && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Auto-release in: <span className="font-mono font-semibold text-primary">{countdown}</span>
                </p>
              )}
            </div>
          </div>
          {isRequester && (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 gap-1 bg-success hover:bg-success/90" onClick={() => onJobUpdate?.()}>
                <CheckCircle className="w-3 h-3" />
                Mark as Completed
              </Button>
              <Button size="sm" variant="outline" className="flex-1 gap-1 text-destructive border-destructive/30" onClick={() => setShowDisputeDialog(true)}>
                <XCircle className="w-3 h-3" />
                Report Issue
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Disputed */}
      {escrow.status === 'disputed' && (
        <Card className="p-3 border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Dispute in progress</p>
              <p className="text-xs text-muted-foreground">Funds locked. Admin is reviewing.</p>
            </div>
          </div>
        </Card>
      )}

      {/* Released */}
      {escrow.status === 'released' && (
        <Card className="p-3 border-success/30 bg-success/5">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success shrink-0" />
            <p className="text-sm font-medium text-success">Payment released ✅</p>
          </div>
        </Card>
      )}

      {/* Dispute Dialog */}
      <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Report an Issue
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Describe the issue. Funds will be locked until admin reviews.</p>
            <Textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={4}
            />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Upload evidence (photos, screenshots)</p>
              <div className="flex flex-wrap gap-2">
                {disputeFiles.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                ))}
                <label className="w-16 h-16 border border-dashed border-border rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/50">
                  {uploadingEvidence ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-muted-foreground" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleUploadEvidence} />
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisputeDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReportIssue} disabled={!disputeReason.trim() || submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Submit Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Has the service provider already arrived or started work?</p>
            <div className="space-y-2">
              <Card className="p-3 cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleCancel(false)}>
                <p className="text-sm font-medium text-foreground">No – Provider hasn't arrived</p>
                <p className="text-xs text-success mt-0.5">100% refund: {formatBudget(Number(escrow.amount))}</p>
              </Card>
              <Card className="p-3 cursor-pointer hover:border-warning/50 transition-colors" onClick={() => handleCancel(true)}>
                <p className="text-sm font-medium text-foreground">Yes – Provider has arrived</p>
                <p className="text-xs text-warning mt-0.5">
                  Call-out fee: {formatBudget(Math.max(Number(escrow.amount) * 0.15, 2000))} | 
                  Refund: {formatBudget(Number(escrow.amount) - Math.max(Number(escrow.amount) * 0.15, 2000))}
                </p>
              </Card>
            </div>
            {submitting && (
              <div className="flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
