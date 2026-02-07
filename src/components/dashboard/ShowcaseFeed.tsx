import { motion } from 'framer-motion';
import { Heart, Eye, Building2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { FeedItem } from '@/hooks/useShowcaseFeed';

interface ShowcaseFeedProps {
  items: FeedItem[];
  loading: boolean;
  onToggleLike: (id: string) => void;
  onViewProvider?: (userId: string) => void;
}

const ShowcaseFeed = ({ items, loading, onToggleLike, onViewProvider }: ShowcaseFeedProps) => {
  if (loading) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">What Experts Are Working On</h2>
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-3">What Experts Are Working On</h2>
      <div className="space-y-4">
        {items.map((item, i) => {
          const isCompany = item.account_type === 'company';
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="overflow-hidden">
                {/* Provider info header */}
                <div className="flex items-center gap-3 p-3 pb-0">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={item.provider_avatar || undefined} />
                    <AvatarFallback className={isCompany ? 'bg-secondary/10 text-secondary text-xs' : 'bg-primary/10 text-primary text-xs'}>
                      {isCompany ? <Building2 className="w-4 h-4" /> : item.provider_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-sm text-foreground truncate">{item.provider_name}</span>
                      <VerificationBadge
                        status={item.is_verified ? 'verified' : 'unverified'}
                        accountType={isCompany ? 'company' : 'individual'}
                        size="sm"
                      />
                    </div>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {item.provider_category}
                    </Badge>
                  </div>
                </div>

                {/* Media */}
                <div className="mt-2 relative">
                  {item.media_type === 'video' ? (
                    <video
                      src={item.media_url}
                      className="w-full aspect-[4/3] object-cover bg-muted"
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <img
                      src={item.media_url}
                      alt={item.caption || 'Work showcase'}
                      className="w-full aspect-[4/3] object-cover bg-muted"
                      loading="lazy"
                    />
                  )}
                </div>

                {/* Actions & caption */}
                <div className="p-3 pt-2">
                  <div className="flex items-center gap-4 mb-1">
                    <button
                      onClick={() => onToggleLike(item.id)}
                      className="flex items-center gap-1 text-sm transition-colors"
                    >
                      <Heart
                        className={`w-5 h-5 transition-colors ${item.is_liked ? 'fill-destructive text-destructive' : 'text-muted-foreground hover:text-destructive'}`}
                      />
                      <span className="text-muted-foreground">{item.like_count}</span>
                    </button>
                    <button
                      onClick={() => onViewProvider?.(item.provider_user_id)}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Eye className="w-5 h-5" />
                      <span>View</span>
                    </button>
                  </div>
                  {item.caption && (
                    <p className="text-sm text-foreground line-clamp-2">{item.caption}</p>
                  )}
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default ShowcaseFeed;
