import { motion } from 'framer-motion';
import { Star, Building2, ArrowRight, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { RecommendedProvider } from '@/hooks/useRecommendedProviders';

interface RecommendedExpertsProps {
  providers: RecommendedProvider[];
  loading: boolean;
  onSeeAll: () => void;
}

const RecommendedExperts = ({ providers, loading, onSeeAll }: RecommendedExpertsProps) => {
  if (loading) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3">Recommended Experts for You</h2>
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  if (providers.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground">Recommended Experts for You</h2>
        <Button variant="ghost" size="sm" onClick={onSeeAll}>
          See All
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {providers.map((provider, i) => {
          const prof = provider.profile;
          const isCompany = prof?.account_type === 'company';
          return (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              className="flex-shrink-0"
            >
              <Card className="w-40 p-3 hover:border-primary/30 transition-colors">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="w-14 h-14 mb-2">
                    <AvatarImage src={prof?.avatar_url || undefined} />
                    <AvatarFallback className={isCompany ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}>
                      {isCompany ? <Building2 className="w-5 h-5" /> : (prof?.full_name?.charAt(0) || 'P')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1 mb-1">
                    <h3 className="font-semibold text-foreground text-sm truncate max-w-[100px]">
                      {isCompany ? prof?.company_name : prof?.full_name || 'Provider'}
                    </h3>
                    <VerificationBadge
                      status={prof?.verification_status as any || 'unverified'}
                      accountType={isCompany ? 'company' : 'individual'}
                      size="sm"
                    />
                  </div>
                  <Badge variant="secondary" className="text-xs mb-2">
                    {provider.service_categories?.[0] || 'Services'}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 text-warning fill-warning" />
                    <span className="font-medium text-foreground">{provider.rating || 0}</span>
                    <span>·</span>
                    <span>{provider.on_time_delivery_score || 100}% on-time</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default RecommendedExperts;
