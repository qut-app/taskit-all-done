import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const REPORT_CATEGORIES = [
  'Fraud / Scam',
  'Abuse / Harassment',
  'Fake Profile',
  'Payment Issue',
  'Inappropriate Content',
  'Other',
];

interface ReportUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId: string;
  reportedUserName?: string;
}

export function ReportUserDialog({ open, onOpenChange, reportedUserId, reportedUserName }: ReportUserDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const wordCount = message.trim().split(/\s+/).filter(Boolean).length;

  const handleSubmit = async () => {
    if (!user || !category || wordCount < 1 || wordCount > 300) return;
    setSubmitting(true);
    try {
      const reason = `[${category}] ${message}`;
      const { error } = await supabase.from('reports').insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        reason,
      });
      if (error) throw error;

      // Notify admins
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (adminRoles) {
        const notifications = adminRoles.map((ar) => ({
          user_id: ar.user_id,
          title: '🚨 New User Report',
          message: `A user has been reported for: ${category}`,
          type: 'moderation',
          metadata: { reported_user_id: reportedUserId, reporter_id: user.id },
        }));
        await supabase.from('notifications').insert(notifications);
      }

      toast({ title: 'Report submitted successfully', description: 'Our team will review this report.' });
      setCategory('');
      setMessage('');
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Report User
          </DialogTitle>
          <DialogDescription>
            {reportedUserName ? `Report ${reportedUserName}` : 'Report this user for violating community guidelines.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {REPORT_CATEGORIES.map((cat) => (
                <Badge
                  key={cat}
                  variant={category === cat ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Details (max 300 words, required)
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the issue in detail..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground mt-1">{wordCount} / 300 words</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={submitting || !category || wordCount < 1 || wordCount > 300}
            onClick={handleSubmit}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
