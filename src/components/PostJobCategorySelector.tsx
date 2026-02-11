import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables } from '@/integrations/supabase/types';

type ServiceCategory = Tables<'service_categories'>;

interface PostJobCategorySelectorProps {
  categories: ServiceCategory[];
  selected: string;
  onSelect: (category: string) => void;
}

const PostJobCategorySelector = ({ categories, selected, onSelect }: PostJobCategorySelectorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveCustom = async () => {
    if (!customName.trim() || !user) return;
    setSaving(true);
    try {
      // Check if user already has a custom category
      const { data: existing } = await supabase
        .from('custom_categories')
        .select('id')
        .eq('user_id', user.id);

      if (existing && existing.length > 0) {
        toast({
          title: 'Limit Reached',
          description: 'You can only submit one custom category. Contact support for more.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('custom_categories')
        .insert({ name: customName.trim(), user_id: user.id });

      if (error) throw error;

      onSelect(customName.trim());
      setShowModal(false);
      setCustomName('');
      toast({
        title: 'Category Submitted',
        description: 'Your custom category is pending admin approval. You can use it for this job.',
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Category</label>
      <div className="flex flex-wrap gap-2">
        {categories.slice(0, 12).map((category) => (
          <Button
            key={category.id}
            type="button"
            variant={selected === category.name ? 'soft' : 'outline'}
            size="sm"
            onClick={() => onSelect(category.name)}
          >
            {category.name}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1 border-dashed"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          Add New
        </Button>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Can't find your service category? Add a new one. It will be available for this job immediately and submitted for admin review.
          </p>
          <Input
            placeholder="e.g., Solar Installation"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSaveCustom} disabled={!customName.trim() || saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PostJobCategorySelector;
