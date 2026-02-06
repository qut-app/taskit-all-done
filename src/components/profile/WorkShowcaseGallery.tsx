import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Plus, Trash2, Loader2, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useShowcases } from '@/hooks/useShowcases';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface WorkShowcaseGalleryProps {
  providerProfileId: string;
  isOwner: boolean;
}

export function WorkShowcaseGallery({ providerProfileId, isOwner }: WorkShowcaseGalleryProps) {
  const { showcases, loading, uploadShowcase, deleteShowcase, toggleLike } = useShowcases(providerProfileId);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check limits: 6 images + 2 videos
    const imageCount = showcases.filter(s => s.media_type === 'image').length;
    const videoCount = showcases.filter(s => s.media_type === 'video').length;
    const isVideo = file.type.startsWith('video/');

    if (isVideo && videoCount >= 2) {
      toast({ title: 'Limit reached', description: 'Maximum 2 videos allowed', variant: 'destructive' });
      return;
    }
    if (!isVideo && imageCount >= 6) {
      toast({ title: 'Limit reached', description: 'Maximum 6 images allowed', variant: 'destructive' });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowUploadDialog(true);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);

    const mediaType = selectedFile.type.startsWith('video/') ? 'video' : 'image';
    const { error } = await uploadShowcase(selectedFile, caption, mediaType);

    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Uploaded!', description: 'Your work has been submitted for review.' });
      setShowUploadDialog(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption('');
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteShowcase(id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const imageCount = showcases.filter(s => s.media_type === 'image').length;
  const videoCount = showcases.filter(s => s.media_type === 'video').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Work Portfolio</h3>
        {isOwner && (imageCount < 6 || videoCount < 2) && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              size="sm"
              variant="soft"
              className="gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="w-4 h-4" />
              Add Work
            </Button>
          </>
        )}
      </div>

      {showcases.length === 0 ? (
        <Card className="p-8 text-center">
          <ImagePlus className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {isOwner ? 'Showcase your best work here' : 'No work showcased yet'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <AnimatePresence>
            {showcases.map((showcase) => (
              <motion.div
                key={showcase.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative group"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-muted">
                  {showcase.media_type === 'video' ? (
                    <video
                      src={showcase.media_url}
                      className="w-full h-full object-cover"
                      controls={false}
                      muted
                      playsInline
                      onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                      onMouseLeave={(e) => { (e.target as HTMLVideoElement).pause(); (e.target as HTMLVideoElement).currentTime = 0; }}
                    />
                  ) : (
                    <img
                      src={showcase.media_url}
                      alt={showcase.caption || 'Work'}
                      className="w-full h-full object-cover"
                    />
                  )}

                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    {showcase.caption && (
                      <p className="absolute bottom-8 left-2 right-2 text-xs text-white line-clamp-1">
                        {showcase.caption}
                      </p>
                    )}
                  </div>

                  {/* Like button */}
                  <button
                    className="absolute bottom-2 left-2 flex items-center gap-1 text-xs"
                    onClick={() => toggleLike(showcase.id)}
                  >
                    <Heart
                      className={`w-4 h-4 transition-colors ${
                        showcase.is_liked ? 'fill-destructive text-destructive' : 'text-white'
                      }`}
                    />
                    {(showcase.like_count || 0) > 0 && (
                      <span className="text-white font-medium">{showcase.like_count}</span>
                    )}
                  </button>

                  {/* Delete button (owner only) */}
                  {isOwner && (
                    <button
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(showcase.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-white" />
                    </button>
                  )}

                  {!showcase.is_approved && (
                    <div className="absolute top-2 left-2 bg-warning/90 text-warning-foreground text-xs px-2 py-0.5 rounded-full">
                      Pending
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-2">
        {imageCount}/6 images · {videoCount}/2 videos
      </p>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Work</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              {selectedFile?.type.startsWith('video/') ? (
                <video src={previewUrl} className="w-full h-full object-cover" controls />
              ) : (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              )}
            </div>
          )}
          <Input
            placeholder="Add a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
