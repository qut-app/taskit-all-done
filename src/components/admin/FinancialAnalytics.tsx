import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, DollarSign, TrendingUp, Clock, AlertTriangle, Users, Briefcase } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899'];

export function FinancialAnalytics() {
  const [loading, setLoading] = useState(true);
  const [escrowData, setEscrowData] = useState<any[]>([]);
  const [walletTxns, setWalletTxns] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [providerProfiles, setProviderProfiles] = useState<any[]>([]);
  const [revenueRecords, setRevenueRecords] = useState<any[]>([]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [escrowRes, walletRes, withdrawRes, subRes, jobRes, profileRes, providerRes, revenueRes] = await Promise.all([
        supabase.from('escrow_transactions').select('*').order('created_at', { ascending: false }),
        supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('withdrawal_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('*'),
        supabase.from('jobs').select('*'),
        supabase.from('profiles').select('user_id, created_at, account_type, active_role, is_online, last_seen_at'),
        supabase.from('provider_profiles').select('user_id, is_premium, created_at'),
        supabase.from('platform_revenue').select('*').order('created_at', { ascending: false }),
      ]);

      setEscrowData(escrowRes.data || []);
      setWalletTxns(walletRes.data || []);
      setWithdrawals(withdrawRes.data || []);
      setSubscriptions(subRes.data || []);
      setJobs(jobRes.data || []);
      setProfiles(profileRes.data || []);
      setProviderProfiles(providerRes.data || []);
      setRevenueRecords(revenueRes.data || []);
    } catch (err) {
      console.error('Financial analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // === ESCROW OVERVIEW ===
  const heldEscrows = escrowData.filter(e => e.status === 'held');
  const releasedEscrows = escrowData.filter(e => e.status === 'released');
  const pendingEscrows = escrowData.filter(e => e.status === 'pending');
  const totalHeld = heldEscrows.reduce((s, e) => s + Number(e.amount), 0);
  const totalReleased = releasedEscrows.reduce((s, e) => s + Number(e.amount), 0);
  const totalPending = pendingEscrows.reduce((s, e) => s + Number(e.amount), 0);
  const avgTxnSize = escrowData.length > 0 ? escrowData.reduce((s, e) => s + Number(e.amount), 0) / escrowData.length : 0;

  // === COMMISSION ANALYTICS ===
  const totalCommission = revenueRecords.reduce((s, r) => s + Number(r.commission_amount), 0);
  const paidUserRevenue = revenueRecords.filter(r => Number(r.commission_rate) <= 0.1).reduce((s, r) => s + Number(r.commission_amount), 0);
  const freeUserRevenue = revenueRecords.filter(r => Number(r.commission_rate) > 0.1).reduce((s, r) => s + Number(r.commission_amount), 0);

  // Monthly earnings
  const monthlyEarnings: Record<string, number> = {};
  revenueRecords.forEach(r => {
    const month = r.month_year || new Date(r.created_at).toISOString().slice(0, 7);
    monthlyEarnings[month] = (monthlyEarnings[month] || 0) + Number(r.commission_amount);
  });
  const monthlyData = Object.entries(monthlyEarnings)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, amount]) => ({ month: month.slice(5), amount: Math.round(amount) }));

  // Top revenue categories
  const categoryRevenue: Record<string, number> = {};
  escrowData.forEach(e => {
    const job = jobs.find(j => j.id === e.job_id);
    if (job) {
      categoryRevenue[job.category] = (categoryRevenue[job.category] || 0) + Number(e.platform_commission || 0);
    }
  });
  const topCategories = Object.entries(categoryRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, value]) => ({ name: name.length > 12 ? name.slice(0, 12) + '…' : name, value: Math.round(value) }));

  // === CATEGORY HEATMAP ===
  const categoryTxnCount: Record<string, number> = {};
  const locationRevenue: Record<string, number> = {};
  const hourlyTxns: Record<number, number> = {};

  escrowData.forEach(e => {
    const job = jobs.find(j => j.id === e.job_id);
    if (job) {
      categoryTxnCount[job.category] = (categoryTxnCount[job.category] || 0) + 1;
      if (job.location) {
        const loc = job.location.split(',')[0].trim();
        locationRevenue[loc] = (locationRevenue[loc] || 0) + Number(e.amount);
      }
    }
    const hour = new Date(e.created_at).getHours();
    hourlyTxns[hour] = (hourlyTxns[hour] || 0) + 1;
  });

  const categoryHeatData = Object.entries(categoryTxnCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => ({ name: name.length > 14 ? name.slice(0, 14) + '…' : name, count }));

  const locationData = Object.entries(locationRevenue)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, value]) => ({ name: name.length > 12 ? name.slice(0, 12) + '…' : name, value: Math.round(value) }));

  const peakHoursData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    count: hourlyTxns[i] || 0,
  }));

  // === WALLET MONITORING ===
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const totalPendingWithdrawal = pendingWithdrawals.reduce((s, w) => s + Number(w.amount), 0);
  const flaggedWithdrawals = withdrawals.filter(w => w.status === 'rejected');

  // Suspicious: multiple withdrawals from same user in 24h
  const withdrawalsByUser: Record<string, any[]> = {};
  withdrawals.forEach(w => {
    if (!withdrawalsByUser[w.user_id]) withdrawalsByUser[w.user_id] = [];
    withdrawalsByUser[w.user_id].push(w);
  });
  const suspiciousWithdrawers = Object.entries(withdrawalsByUser)
    .filter(([, ws]) => {
      const recent = ws.filter(w => new Date(w.created_at) > new Date(Date.now() - 7 * 86400000));
      return recent.length >= 3;
    })
    .map(([userId, ws]) => ({ userId, count: ws.length }));

  // === GROWTH METRICS ===
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 86400000);
  const activeUsers = profiles.filter(p => p.last_seen_at && new Date(p.last_seen_at) > oneDayAgo).length;
  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const paidProviders = providerProfiles.filter(p => p.is_premium).length;
  const freeProviders = providerProfiles.length - paidProviders;
  const conversionRate = providerProfiles.length > 0 ? ((paidProviders / providerProfiles.length) * 100).toFixed(1) : '0';
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const avgJobValue = completedJobs.length > 0
    ? completedJobs.reduce((s, j) => s + Number(j.budget || 0), 0) / completedJobs.length
    : 0;

  // Commission split pie data
  const commissionPieData = [
    { name: '9% Users', value: Math.round(paidUserRevenue) || 1 },
    { name: '20% Users', value: Math.round(freeUserRevenue) || 1 },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Escrow Overview */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Escrow Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <div>
                <p className="text-lg font-bold text-foreground">₦{totalHeld.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Held in Escrow</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-lg font-bold text-foreground">₦{totalReleased.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Total Released</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              <div>
                <p className="text-lg font-bold text-foreground">₦{totalPending.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Pending</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-lg font-bold text-foreground">₦{Math.round(avgTxnSize).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Avg Txn Size</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 2. Commission Analytics */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Commission Analytics</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card className="p-3">
            <p className="text-lg font-bold text-foreground">₦{totalCommission.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Total Commission</p>
          </Card>
          <Card className="p-3">
            <p className="text-lg font-bold text-foreground">₦{Math.round(paidUserRevenue).toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">From 9% Users</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Commission Split Pie */}
          <Card className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Commission Split</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={commissionPieData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {commissionPieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `₦${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Monthly Earnings */}
          <Card className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Monthly Earnings</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => `₦${v.toLocaleString()}`} />
                  <Line type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Top Revenue Categories */}
        {topCategories.length > 0 && (
          <Card className="p-3 mt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Top Revenue Categories</p>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCategories}>
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => `₦${v.toLocaleString()}`} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </section>

      {/* 3. Category Heatmap */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Category & Location Heatmap</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categoryHeatData.length > 0 && (
            <Card className="p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Transactions by Category</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryHeatData} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {locationData.length > 0 && (
            <Card className="p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Revenue by Location</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={locationData}>
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => `₦${v.toLocaleString()}`} />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </div>

        {/* Peak Hours */}
        <Card className="p-3 mt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Peak Transaction Hours</p>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData}>
                <XAxis dataKey="hour" tick={{ fontSize: 8 }} interval={2} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* 4. Wallet Monitoring */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Wallet Monitoring</h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <Card className="p-3">
            <p className="text-lg font-bold text-foreground">{pendingWithdrawals.length}</p>
            <p className="text-[10px] text-muted-foreground">Pending Withdrawals</p>
            <p className="text-xs font-medium text-foreground">₦{totalPendingWithdrawal.toLocaleString()}</p>
          </Card>
          <Card className="p-3">
            <p className="text-lg font-bold text-foreground">{flaggedWithdrawals.length}</p>
            <p className="text-[10px] text-muted-foreground">Rejected</p>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <p className="text-lg font-bold text-foreground">{suspiciousWithdrawers.length}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Suspicious Patterns</p>
          </Card>
        </div>
        {suspiciousWithdrawers.length > 0 && (
          <Card className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Users with 3+ Withdrawals (7 days)</p>
            <div className="space-y-1">
              {suspiciousWithdrawers.map((sw) => (
                <div key={sw.userId} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground">{sw.userId.slice(0, 12)}...</span>
                  <Badge variant="destructive" className="text-[10px]">{sw.count} requests</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}
      </section>

      {/* 5. Growth Metrics */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Growth Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <div>
                <p className="text-lg font-bold text-foreground">{activeUsers}</p>
                <p className="text-[10px] text-muted-foreground">Daily Active Users</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div>
              <p className="text-lg font-bold text-foreground">{conversionRate}%</p>
              <p className="text-[10px] text-muted-foreground">Paid Conversion</p>
            </div>
          </Card>
          <Card className="p-3">
            <div>
              <p className="text-lg font-bold text-foreground">{paidProviders} / {freeProviders}</p>
              <p className="text-[10px] text-muted-foreground">Paid / Free Providers</p>
            </div>
          </Card>
          <Card className="p-3">
            <div>
              <p className="text-lg font-bold text-foreground">₦{Math.round(avgJobValue).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Avg Job Value</p>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
