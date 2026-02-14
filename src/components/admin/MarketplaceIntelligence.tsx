import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, MapPin, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = [
  'hsl(200, 98%, 39%)', 'hsl(152, 70%, 40%)', 'hsl(38, 95%, 55%)',
  'hsl(0, 72%, 50%)', 'hsl(260, 60%, 50%)', 'hsl(180, 60%, 40%)',
  'hsl(300, 50%, 50%)', 'hsl(20, 80%, 50%)', 'hsl(100, 60%, 40%)', 'hsl(220, 70%, 50%)',
];

interface CategoryMetric {
  category: string;
  views: number;
  posts: number;
  applications: number;
  hires: number;
  revenue: number;
  conversion: number;
}

interface LocationMetric {
  location: string;
  transactions: number;
  avg_value: number;
  job_demand: number;
  provider_supply: number;
}

export const MarketplaceIntelligence = () => {
  const [loading, setLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<CategoryMetric[]>([]);
  const [locationData, setLocationData] = useState<LocationMetric[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState('revenue');

  useEffect(() => {
    fetchIntelligence();
  }, []);

  const fetchIntelligence = async () => {
    setLoading(true);
    try {
      // Fetch jobs grouped by category
      const { data: jobs } = await supabase.from('jobs').select('id, category, location, status, created_at');
      // Fetch applications
      const { data: apps } = await supabase.from('job_applications').select('id, job_id, status');
      // Fetch hire requests
      const { data: hires } = await supabase.from('hire_requests').select('id, job_id, status');
      // Fetch escrow transactions
      const { data: transactions } = await supabase.from('escrow_transactions').select('id, job_id, amount, status');
      // Fetch analytics events
      const { data: events } = await supabase.from('analytics_events' as any).select('event_type, category, location, created_at');
      // Fetch provider profiles for supply data
      const { data: providers } = await supabase.from('provider_profiles').select('service_categories');
      // Fetch profiles for location data
      const { data: profiles } = await supabase.from('profiles').select('location');

      // Build category map
      const catMap: Record<string, CategoryMetric> = {};
      const allJobs = jobs || [];
      const allApps = apps || [];
      const allHires = hires || [];
      const allTx = transactions || [];
      const allEvents = (events || []) as any[];

      // Job posts per category
      allJobs.forEach(j => {
        if (!catMap[j.category]) {
          catMap[j.category] = { category: j.category, views: 0, posts: 0, applications: 0, hires: 0, revenue: 0, conversion: 0 };
        }
        catMap[j.category].posts++;
      });

      // Job ID → category lookup
      const jobCatMap: Record<string, string> = {};
      allJobs.forEach(j => { jobCatMap[j.id] = j.category; });

      // Applications per category
      allApps.forEach(a => {
        const cat = jobCatMap[a.job_id];
        if (cat && catMap[cat]) catMap[cat].applications++;
      });

      // Hires per category
      allHires.forEach(h => {
        const cat = jobCatMap[h.job_id];
        if (cat && catMap[cat]) catMap[cat].hires++;
      });

      // Revenue per category
      allTx.filter(t => t.status === 'completed' || t.status === 'released').forEach(t => {
        const cat = jobCatMap[t.job_id];
        if (cat && catMap[cat]) catMap[cat].revenue += Number(t.amount);
      });

      // Views from analytics events
      allEvents.filter(e => e.event_type === 'category_click' || e.event_type === 'job_view').forEach(e => {
        if (e.category && catMap[e.category]) catMap[e.category].views++;
      });

      // Conversion rate
      Object.values(catMap).forEach(c => {
        c.conversion = c.posts > 0 ? Math.round((c.hires / c.posts) * 100) : 0;
      });

      setCategoryData(Object.values(catMap));

      // Location data
      const locMap: Record<string, LocationMetric> = {};
      
      // Job demand by location
      allJobs.forEach(j => {
        const loc = j.location || 'Unknown';
        if (!locMap[loc]) locMap[loc] = { location: loc, transactions: 0, avg_value: 0, job_demand: 0, provider_supply: 0 };
        locMap[loc].job_demand++;
      });

      // Transactions by job location
      allTx.forEach(t => {
        const job = allJobs.find(j => j.id === t.job_id);
        const loc = job?.location || 'Unknown';
        if (!locMap[loc]) locMap[loc] = { location: loc, transactions: 0, avg_value: 0, job_demand: 0, provider_supply: 0 };
        locMap[loc].transactions++;
        locMap[loc].avg_value += Number(t.amount);
      });

      // Provider supply by location (from profiles)
      (profiles || []).forEach(p => {
        const loc = (p as any).location || 'Unknown';
        if (!locMap[loc]) locMap[loc] = { location: loc, transactions: 0, avg_value: 0, job_demand: 0, provider_supply: 0 };
        locMap[loc].provider_supply++;
      });

      // Average transaction value
      Object.values(locMap).forEach(l => {
        if (l.transactions > 0) l.avg_value = Math.round(l.avg_value / l.transactions);
      });

      setLocationData(Object.values(locMap).sort((a, b) => b.transactions - a.transactions));

      // 30-day trend data
      const now = new Date();
      const trend: any[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayJobs = allJobs.filter(j => j.created_at.startsWith(dateStr)).length;
        const dayApps = allApps.filter(a => {
          // We don't have created_at on apps in this query, approximate
          return false;
        }).length;
        trend.push({ date: dateStr.slice(5), jobs: dayJobs });
      }
      setTrendData(trend);

    } catch (err) {
      console.error('Intelligence fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortedCategories = [...categoryData].sort((a, b) => {
    switch (sortBy) {
      case 'views': return b.views - a.views;
      case 'hires': return b.hires - a.hires;
      case 'revenue': return b.revenue - a.revenue;
      case 'growth': return b.conversion - a.conversion;
      default: return b.revenue - a.revenue;
    }
  });

  const top10 = sortedCategories.slice(0, 10);
  const revenueDistribution = top10.filter(c => c.revenue > 0).map(c => ({
    name: c.category,
    value: c.revenue,
  }));

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="categories">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="categories" className="text-xs">
            <BarChart3 className="w-4 h-4 mr-1" /> Categories
          </TabsTrigger>
          <TabsTrigger value="locations" className="text-xs">
            <MapPin className="w-4 h-4 mr-1" /> Locations
          </TabsTrigger>
        </TabsList>

        {/* Category Performance */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Category Performance</h3>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="revenue">Highest Revenue</SelectItem>
                <SelectItem value="views">Most Viewed</SelectItem>
                <SelectItem value="hires">Most Hired</SelectItem>
                <SelectItem value="growth">Best Conversion</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bar Chart - Top 10 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top 10 Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={top10} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="category" type="category" width={80} tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: number) => sortBy === 'revenue' ? `₦${v.toLocaleString()}` : v} />
                  <Bar dataKey={sortBy === 'growth' ? 'conversion' : sortBy} fill="hsl(200, 98%, 39%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart - Revenue */}
          {revenueDistribution.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Revenue Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={revenueDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {revenueDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => `₦${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Trend Line */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <TrendingUp className="w-4 h-4" /> 30-Day Job Post Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={trendData}>
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="jobs" stroke="hsl(200, 98%, 39%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Category Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-2 font-medium">Category</th>
                      <th className="text-right p-2 font-medium">Views</th>
                      <th className="text-right p-2 font-medium">Posts</th>
                      <th className="text-right p-2 font-medium">Apps</th>
                      <th className="text-right p-2 font-medium">Hires</th>
                      <th className="text-right p-2 font-medium">Revenue</th>
                      <th className="text-right p-2 font-medium">Conv%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCategories.map(c => (
                      <tr key={c.category} className="border-b border-border/50">
                        <td className="p-2 font-medium truncate max-w-[100px]">{c.category}</td>
                        <td className="text-right p-2">{c.views}</td>
                        <td className="text-right p-2">{c.posts}</td>
                        <td className="text-right p-2">{c.applications}</td>
                        <td className="text-right p-2">{c.hires}</td>
                        <td className="text-right p-2">₦{c.revenue.toLocaleString()}</td>
                        <td className="text-right p-2">
                          <Badge variant={c.conversion > 30 ? 'default' : 'secondary'} className="text-[10px]">
                            {c.conversion}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Location Heatmap */}
        <TabsContent value="locations" className="space-y-4">
          <h3 className="font-semibold text-foreground">Location Intelligence</h3>

          {/* Top 5 by transactions */}
          <div className="grid grid-cols-1 gap-3">
            {locationData.slice(0, 5).map((loc, i) => (
              <Card key={loc.location} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-primary-foreground"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground truncate max-w-[150px]">{loc.location}</p>
                      <p className="text-[10px] text-muted-foreground">{loc.transactions} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">₦{loc.avg_value.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">avg value</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Location Bar Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Demand vs Supply by Location</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={locationData.slice(0, 8)}>
                  <XAxis dataKey="location" tick={{ fontSize: 8 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="job_demand" name="Job Demand" fill="hsl(200, 98%, 39%)" />
                  <Bar dataKey="provider_supply" name="Provider Supply" fill="hsl(152, 70%, 40%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Full Location Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-2 font-medium">Location</th>
                      <th className="text-right p-2 font-medium">Txns</th>
                      <th className="text-right p-2 font-medium">Avg ₦</th>
                      <th className="text-right p-2 font-medium">Demand</th>
                      <th className="text-right p-2 font-medium">Supply</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locationData.map(l => (
                      <tr key={l.location} className="border-b border-border/50">
                        <td className="p-2 font-medium truncate max-w-[120px]">{l.location}</td>
                        <td className="text-right p-2">{l.transactions}</td>
                        <td className="text-right p-2">₦{l.avg_value.toLocaleString()}</td>
                        <td className="text-right p-2">{l.job_demand}</td>
                        <td className="text-right p-2">{l.provider_supply}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
