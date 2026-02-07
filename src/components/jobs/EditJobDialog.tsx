import { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tables } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Job = Tables<'jobs'>;

interface EditJobDialogProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const EditJobDialog = ({ job, open, onOpenChange, onSaved }: EditJobDialogProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [location, setLocation] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');

  const isAccepted = job?.status === 'assigned' || job?.status === 'in_progress';
  const isFullyEditable = job?.status === 'open';

  useEffect(() => {
    if (job) {
      setTitle(job.title);
      setDescription(job.description || '');
      setBudget(job.budget?.toString() || '');
      setLocation(job.location || '');
      setDeliveryTime(job.expected_delivery_time);
    }
  }, [job]);

  const handleSave = async () => {
    if (!job) return;
    setSaving(true);

    const updates: Partial<Job> = {};
    if (isFullyEditable) {
      updates.title = title;
      updates.description = description;
      updates.budget = budget ? Number(budget) : null;
      updates.location = location || null;
      updates.expected_delivery_time = deliveryTime;
    } else {
      // Accepted: only allow minor edits
      updates.description = description;
    }

    const { error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('id', job.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      // Notify applicants about the edit
      const { data: applications } = await supabase
        .from('job_applications')
        .select('provider_id')
        .eq('job_id', job.id)
        .in('status', ['pending', 'accepted']);

      if (applications?.length) {
        const notifications = applications.map(a => ({
          user_id: a.provider_id,
          title: '📝 Job Updated',
          message: `The job "${title || job.title}" has been updated by the Job Giver.`,
          type: 'job_updated',
          metadata: { job_id: job.id },
        }));
        await supabase.from('notifications').insert(notifications);
      }

      toast({ title: 'Job updated successfully!' });
      onSaved();
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Job</DialogTitle>
        </DialogHeader>

        {isAccepted && (
          <Alert variant="destructive" className="bg-warning/10 border-warning text-warning-foreground">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-sm">
              This job has already been accepted. Editing may affect the service provider.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-2">
          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              disabled={!isFullyEditable}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div>
            <Label>Budget (₦)</Label>
            <Input
              type="number"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              disabled={!isFullyEditable}
            />
          </div>
          <div>
            <Label>Location</Label>
            <Input
              value={location}
              onChange={e => setLocation(e.target.value)}
              disabled={!isFullyEditable}
            />
          </div>
          <div>
            <Label>Expected Delivery Time</Label>
            <Input
              value={deliveryTime}
              onChange={e => setDeliveryTime(e.target.value)}
              disabled={!isFullyEditable}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditJobDialog;
