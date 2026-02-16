import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Heart, MessageCircle, Share2, Bookmark, Send, Image as ImageIcon,
  Video, Loader2, Trash2, Building2, X, Lock, MoreHorizontal, Edit3, Repeat2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import MobileLayout from '@/components/navigation/MobileLayout';
import CompanyLayout from '@/components/navigation/CompanyLayout';
import { useSocialFeed, usePostComments, FeedPost } from '@/hooks/useSocialFeed';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCompanySubscription } from '@/hooks/useCompanySubscription';
import UpgradeRequiredDialog from '@/components/company/UpgradeRequiredDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { trackEvent } from '@/hooks/useAnalytics';
import { formatDistanceToNow } from 'date-fns';

const Feed = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { posts, loading, createPost, editPost, repost, toggleLike, toggleSave, deletePost } = useSocialFeed();
  const { isGated: companyIsGated } = useCompanySubscription();
  const { toast } = useToast();
  const [newContent, setNewContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [editContent, setEditContent] = useState('');
  const [repostingPost, setRepostingPost] = useState<FeedPost | null>(null);
  const [repostCaption, setRepostCaption] = useState('');
  const isCompanyAccount = (profile as any)?.account_type === 'company';
  const canPost = !isCompanyAccount || !companyIsGated;
  const canRepost = !isCompanyAccount || !companyIsGated;
  const Layout = isCompanyAccount ? CompanyLayout : MobileLayout;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePost = async () => {
    if (!newContent.trim() && !imageFile) return;
    setPosting(true);
    try {
      let image_url: string | undefined;
      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const path = `${user!.id}/posts/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('user-media').upload(path, imageFile);
        if (uploadError) {
          toast({ title: 'Upload failed', description: 'Could not upload image.', variant: 'destructive' });
          setPosting(false);
          return;
        }
        const { data: { publicUrl } } = supabase.storage.from('user-media').getPublicUrl(path);
        image_url = publicUrl;
      }
      await createPost({ content: newContent.trim() || undefined, image_url });
      setNewContent('');
      setImageFile(null);
      setImagePreview(null);
    } finally {
      setPosting(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 5MB.', variant: 'destructive' });
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Unsupported file', description: 'Supported: JPG, PNG, WEBP, GIF, MP4', variant: 'destructive' });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleShare = (post: FeedPost) => {
    trackEvent('feed_share', { target_id: post.user_id, category: 'feed', metadata: { post_id: post.id } });
    if (navigator.share) {
      navigator.share({ title: 'Check this out', text: post.content || '', url: window.location.origin });
    } else {
      navigator.clipboard.writeText(window.location.origin);
      toast({ title: 'Link copied!' });
    }
  };

  const handleEditSave = async () => {
    if (!editingPost) return;
    await editPost(editingPost.id, { content: editContent, image_url: editingPost.image_url, video_url: editingPost.video_url });
    setEditingPost(null);
    setEditContent('');
  };

  const handleRepost = async () => {
    if (!repostingPost) return;
    await repost(repostingPost.id, repostCaption.trim() || undefined);
    setRepostingPost(null);
    setRepostCaption('');
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Button onClick={() => navigate('/auth')}>Sign in to view feed</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <h1 className="text-xl font-bold text-foreground">🔥 Feed</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Compose */}
        {canPost ? (
          <Card className="p-4">
            <div className="flex gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={(profile as any)?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {profile?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  placeholder="What's happening?"
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  className="min-h-[60px] resize-none border-0 p-0 focus-visible:ring-0 text-sm"
                />
                {imagePreview && (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Preview" className="w-20 h-20 rounded-lg object-cover" />
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex gap-2">
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4" className="hidden" onChange={handleImageSelect} />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fileInputRef.current?.click()}>
                      <ImageIcon className="w-4 h-4 text-primary" />
                    </Button>
                  </div>
                  <Button size="sm" onClick={handlePost} disabled={posting || (!newContent.trim() && !imageFile)}>
                    {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span className="ml-1">Post</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ) : isCompanyAccount ? (
          <Card className="p-4 space-y-3">
            <div className="text-center space-y-2">
              <Lock className="w-8 h-8 text-warning mx-auto" />
              <p className="text-sm font-medium text-foreground">Upgrade Required</p>
              <p className="text-xs text-muted-foreground">Subscribe to create posts, post jobs, and boost content</p>
            </div>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full opacity-60 cursor-not-allowed" disabled>
                <Lock className="w-3.5 h-3.5 mr-1.5" /> Create Post
              </Button>
              <Button variant="outline" size="sm" className="w-full opacity-60 cursor-not-allowed" disabled>
                <Lock className="w-3.5 h-3.5 mr-1.5" /> Post Job
              </Button>
              <Button variant="outline" size="sm" className="w-full opacity-60 cursor-not-allowed" disabled>
                <Lock className="w-3.5 h-3.5 mr-1.5" /> Boost Post
              </Button>
            </div>
            <Button size="sm" className="w-full" onClick={() => setShowUpgradeDialog(true)}>View Plans</Button>
          </Card>
        ) : null}

        {/* Feed */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts yet. Be the first!</p>
          </div>
        ) : (
          <AnimatePresence>
            {posts.map((post, i) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <PostCard
                  post={post}
                  currentUserId={user.id}
                  onLike={() => toggleLike(post.id)}
                  onSave={() => toggleSave(post.id)}
                  onDelete={() => deletePost(post.id)}
                  onShare={() => handleShare(post)}
                  onEdit={() => { setEditingPost(post); setEditContent(post.content || ''); }}
                  onRepost={() => {
                    if (!canRepost) { setShowUpgradeDialog(true); return; }
                    setRepostingPost(post.repost_of && post.original_post ? post.original_post : post);
                    setRepostCaption('');
                  }}
                  onToggleComments={() => setExpandedComments(expandedComments === post.id ? null : post.id)}
                  showComments={expandedComments === post.id}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <UpgradeRequiredDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />

      {/* Edit Post Dialog */}
      <Dialog open={!!editingPost} onOpenChange={(open) => { if (!open) setEditingPost(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Post</DialogTitle></DialogHeader>
          <Textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            placeholder="Update your post..."
            className="min-h-[100px]"
          />
          {editingPost?.image_url && (
            <div className="relative inline-block">
              <img src={editingPost.image_url} alt="Media" className="w-24 h-24 rounded-lg object-cover" />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingPost(null)}>Cancel</Button>
            <Button onClick={handleEditSave}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Repost Dialog */}
      <Dialog open={!!repostingPost} onOpenChange={(open) => { if (!open) setRepostingPost(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Repost</DialogTitle></DialogHeader>
          <Textarea
            value={repostCaption}
            onChange={e => setRepostCaption(e.target.value)}
            placeholder="Add your thoughts (optional)..."
            className="min-h-[60px]"
          />
          {repostingPost && (
            <Card className="p-3 bg-muted/30 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={repostingPost.author_avatar || undefined} />
                  <AvatarFallback className="text-[9px]">{repostingPost.author_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="text-xs font-semibold text-foreground">{repostingPost.author_name}</span>
              </div>
              {repostingPost.content && <p className="text-xs text-muted-foreground line-clamp-3">{repostingPost.content}</p>}
              {repostingPost.image_url && <img src={repostingPost.image_url} alt="" className="w-full h-32 object-cover rounded-md mt-2" />}
            </Card>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRepostingPost(null)}>Cancel</Button>
            <Button onClick={handleRepost}>
              <Repeat2 className="w-4 h-4 mr-1" /> Repost
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

const PostCard = ({
  post, currentUserId, onLike, onSave, onDelete, onShare, onEdit, onRepost, onToggleComments, showComments
}: {
  post: FeedPost;
  currentUserId: string;
  onLike: () => void;
  onSave: () => void;
  onDelete: () => void;
  onShare: () => void;
  onEdit: () => void;
  onRepost: () => void;
  onToggleComments: () => void;
  showComments: boolean;
}) => {
  const isCompany = post.author_account_type === 'company';
  const isOwn = post.user_id === currentUserId;
  const isRepost = !!post.repost_of;

  return (
    <Card className="overflow-hidden">
      {/* Repost banner */}
      {isRepost && (
        <div className="flex items-center gap-1.5 px-3 pt-2 text-xs text-muted-foreground">
          <Repeat2 className="w-3 h-3" />
          <span>{isOwn ? 'You' : post.author_name} reposted</span>
        </div>
      )}

      {/* Repost caption */}
      {isRepost && post.repost_caption && (
        <p className="px-3 pt-1.5 text-sm text-foreground">{post.repost_caption}</p>
      )}

      {/* If repost, show original post content inside a border */}
      {isRepost && post.original_post ? (
        <div className="mx-3 mt-2 mb-1 border border-border rounded-lg overflow-hidden">
          <PostContent post={post.original_post} isOwn={false} onEdit={() => {}} onDelete={() => {}} showMenu={false} />
        </div>
      ) : (
        <PostContent post={post} isOwn={isOwn} onEdit={onEdit} onDelete={onDelete} showMenu={true} />
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-1">
          <button onClick={onLike} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors">
            <Heart className={`w-[18px] h-[18px] ${post.is_liked ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
            {post.like_count > 0 && <span className="text-xs text-muted-foreground">{post.like_count}</span>}
          </button>
          <button onClick={onToggleComments} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors">
            <MessageCircle className="w-[18px] h-[18px] text-muted-foreground" />
            {post.comment_count > 0 && <span className="text-xs text-muted-foreground">{post.comment_count}</span>}
          </button>
          <button onClick={onRepost} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors">
            <Repeat2 className="w-[18px] h-[18px] text-muted-foreground" />
            {post.repost_count > 0 && <span className="text-xs text-muted-foreground">{post.repost_count}</span>}
          </button>
          <button onClick={onShare} className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors">
            <Share2 className="w-[18px] h-[18px] text-muted-foreground" />
          </button>
        </div>
        <button onClick={onSave} className="px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors">
          <Bookmark className={`w-[18px] h-[18px] ${post.is_saved ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
        </button>
      </div>

      {/* Comments */}
      {showComments && <CommentsSection postId={post.id} />}
    </Card>
  );
};

const PostContent = ({ post, isOwn, onEdit, onDelete, showMenu }: {
  post: FeedPost;
  isOwn: boolean;
  onEdit: () => void;
  onDelete: () => void;
  showMenu: boolean;
}) => {
  const isCompany = post.author_account_type === 'company';

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-3 pb-0">
        <div className="flex items-center gap-2">
          <Avatar className="w-9 h-9">
            <AvatarImage src={post.author_avatar || undefined} />
            <AvatarFallback className={isCompany ? 'bg-secondary/10 text-secondary text-xs' : 'bg-primary/10 text-primary text-xs'}>
              {isCompany ? <Building2 className="w-4 h-4" /> : post.author_name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-sm text-foreground">{post.author_name}</span>
              <VerificationBadge status={post.author_verification as any} accountType={isCompany ? 'company' : 'individual'} size="sm" />
              {post.is_subscriber && (
                <Badge variant="default" className="text-[9px] px-1 py-0 h-4">PRO</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <p className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
              {post.is_edited && (
                <span className="text-[9px] text-muted-foreground/70 italic">• Edited</span>
              )}
            </div>
          </div>
        </div>
        {showMenu && isOwn && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit3 className="w-3.5 h-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Content */}
      {post.content && (
        <p className="px-3 pt-2 text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
      )}

      {/* Image */}
      {post.image_url && (
        <div className="mt-2">
          <img src={post.image_url} alt="" className="w-full aspect-[4/3] object-cover bg-muted" loading="lazy" />
        </div>
      )}

      {/* Video */}
      {post.video_url && (
        <div className="mt-2">
          <video src={post.video_url} className="w-full aspect-video bg-muted" controls preload="metadata" />
        </div>
      )}
    </>
  );
};

const CommentsSection = ({ postId }: { postId: string }) => {
  const { comments, loading, addComment } = usePostComments(postId);
  const [text, setText] = useState('');

  const handleSubmit = async () => {
    if (!text.trim()) return;
    await addComment(text);
    setText('');
  };

  return (
    <div className="border-t border-border px-3 py-2 space-y-2">
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
      ) : (
        comments.map(c => (
          <div key={c.id} className="flex gap-2">
            <Avatar className="w-6 h-6">
              <AvatarImage src={c.author_avatar || undefined} />
              <AvatarFallback className="text-[9px] bg-muted">{c.author_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <span className="text-xs font-semibold text-foreground">{c.author_name}</span>
              <p className="text-xs text-foreground">{c.content}</p>
            </div>
          </div>
        ))
      )}
      <div className="flex gap-2 items-center">
        <Input
          placeholder="Add a comment..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          className="h-8 text-xs"
        />
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleSubmit}>
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default Feed;
