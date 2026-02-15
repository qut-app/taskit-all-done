import { useState, useEffect } from 'react';
import { Trophy, Plus, Trash2, Camera, Loader2, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Achievement {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  photo_url: string | null;
  year_achieved: number | null;
  created_at: string;
}

interface AchievementsTabProps {
  userId?: string;
  isOwner?: boolean;
}

export const AchievementsTab = ({ userId, isOwner = false }: AchievementsTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', year_achieved: '', photo_url: '' });

  const targetUserId = userId || user?.id;

  const fetchAchievements = async () => {
    if (!targetUserId) return;
    setLoading(true);
    const { data } = await supabase
      .from('achievements')
      .select('*')
      .eq('user_id', targetUserId)
      .order('year_achieved', { ascending: false });
    setAchievements((data as Achievement[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchAchievements();
  }, [targetUserId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' });
      return;
    }
    setUploadingPhoto(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/achievements/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('user-media').upload(path, file, { upsert: true });
    if (error) {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } else {
      const { data: { publicUrl } } = supabase.storage.from('user-media').getPublicUrl(path);
      setForm(prev => ({ ...prev, photo_url: publicUrl }));
    }
    setUploadingPhoto(false);
  };

  const handleAdd = async () => {
    if (!user || !form.title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('achievements').insert({
      user_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      photo_url: form.photo_url || null,
      year_achieved: form.year_achieved ? parseInt(form.year_achieved) : null,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Achievement added!' });
      setShowAddDialog(false);
      setForm({ title: '', description: '', year_achieved: '', photo_url: '' });
      fetchAchievements();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('achievements').delete().eq('id', id);
    if (!error) {
      setAchievements(prev => prev.filter(a => a.id !== id));
      toast({ title: 'Achievement removed' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isOwner && (
        <Button variant="outline" className="w-full gap-2" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4" />
          Add Achievement
        </Button>
      )}

      {achievements.length === 0 ? (
        <div className="text-center py-8">
          <Trophy className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No achievements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {achievements.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex gap-3">
                {a.photo_url && (
                  <img src={a.photo_url} alt={a.title} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{a.title}</h4>
                      {a.year_achieved && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {a.year_achieved}
                        </p>
                      )}
                    </div>
                    {isOwner && (
                      <Button variant="ghost" size="iconSm" onClick={() => handleDelete(a.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  {a.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Achievement</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title *</label>
              <Input value={form.title} onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))} placeholder='e.g. "Completed 150 AC Repairs"' />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea value={form.description} onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Brief description..." rows={2} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Year Achieved</label>
              <Input type="number" value={form.year_achieved} onChange={(e) => setForm(prev => ({ ...prev, year_achieved: e.target.value }))} placeholder="2024" min={1990} max={2030} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Photo (optional)</label>
              {form.photo_url ? (
                <div className="relative w-20 h-20 mt-1">
                  <img src={form.photo_url} alt="" className="w-20 h-20 rounded-lg object-cover" />
                  <button className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center" onClick={() => setForm(prev => ({ ...prev, photo_url: '' }))}>×</button>
                </div>
              ) : (
                <label className="mt-1 flex items-center gap-2 p-3 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 text-muted-foreground" />}
                  <span className="text-sm text-muted-foreground">Upload photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.title.trim() || saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
