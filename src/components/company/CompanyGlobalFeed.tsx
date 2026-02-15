import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Users, TrendingUp, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface TrendingCategory {
  name: string;
  count: number;
}

interface RecentJob {
  id: string;
  title: string;
  category: string;
  budget: number | null;
  created_at: string;
}

const CompanyGlobalFeed = () => {
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [trendingCategories, setTrendingCategories] = useState<TrendingCategory[]>([]);
  const [providerCount, setProviderCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      try {
        // Fetch recent open jobs (public data only)
        const { data: jobs } = await supabase
          .from('jobs')
          .select('id, title, category, budget, created_at')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentJobs(jobs || []);

        // Trending categories from recent jobs
        const { data: catJobs } = await supabase
          .from('jobs')
          .select('category')
          .eq('status', 'open')
          .limit(100);

        if (catJobs) {
          const counts: Record<string, number> = {};
          catJobs.forEach(j => {
            counts[j.category] = (counts[j.category] || 0) + 1;
          });
          const sorted = Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));
          setTrendingCategories(sorted);
        }

        // Active provider count
        const { count } = await supabase
          .from('provider_profiles')
          .select('*', { count: 'exact', head: true });
        setProviderCount(count || 0);
      } catch (err) {
        console.error('Error fetching company feed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Marketplace Overview</h2>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 text-center bg-gradient-to-br from-primary/5 to-transparent">
          <Users className="w-5 h-5 text-primary mx-auto mb-1" />
          <div className="text-xl font-bold text-foreground">{providerCount}</div>
          <div className="text-xs text-muted-foreground">Active Providers</div>
        </Card>
        <Card className="p-4 text-center bg-gradient-to-br from-secondary/5 to-transparent">
          <Briefcase className="w-5 h-5 text-secondary mx-auto mb-1" />
          <div className="text-xl font-bold text-foreground">{recentJobs.length}</div>
          <div className="text-xs text-muted-foreground">Open Jobs</div>
        </Card>
      </div>

      {/* Trending Categories */}
      {trendingCategories.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="font-medium text-foreground text-sm">Trending Categories</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingCategories.map((cat) => (
              <Badge key={cat.name} variant="outline" className="text-xs">
                {cat.name} ({cat.count})
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Open Jobs */}
      {recentJobs.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Latest Open Jobs</h3>
          <div className="space-y-2">
            {recentJobs.map((job) => (
              <motion.div key={job.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground text-sm">{job.title}</p>
                      <p className="text-xs text-muted-foreground">{job.category}</p>
                    </div>
                    {job.budget && (
                      <Badge variant="secondary" className="text-xs">
                        ₦{job.budget.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyGlobalFeed;
