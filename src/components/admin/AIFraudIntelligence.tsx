import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Brain, ShieldAlert, ShieldCheck, Lock, Unlock, UserCheck, RefreshCw, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface AiRiskLog {
  id: string;
  user_id: string;
  transaction_id: string | null;
  ai_fraud_score: number;
  risk_level: string;
  reason_flags: Array<{ flag: string; detail: string }>;
  created_at: string;
}

interface BehaviorWeight {
  id: string;
  behavior_key: string;
  weight: number;
  description: string;
  historical_triggers: number;
}

const CHART_COLORS = ['hsl(var(--primary))', '#ef4444', '#f59e0b', '#10b981'];

export function AIFraudIntelligence() {
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [riskLogs, setRiskLogs] = useState<AiRiskLog[]>([]);
  const [weights, setWeights] = useState<BehaviorWeight[]>([]);
  const [reviewAccounts, setReviewAccounts] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, weightsRes, reviewRes] = await Promise.all([
        supabase.from('ai_risk_logs').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('fraud_behavior_weights').select('*').order('historical_triggers', { ascending: false }),
        supabase.from('profiles').select('user_id, full_name, avatar_url, account_under_review, wallet_frozen, is_suspended, created_at')
          .or('account_under_review.eq.true,wallet_frozen.eq.true'),
      ]);
      setRiskLogs((logsRes.data || []) as AiRiskLog[]);
      setWeights((weightsRes.data || []) as BehaviorWeight[]);
      setReviewAccounts(reviewRes.data || []);
    } catch (err) {
      console.error('AI Fraud fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const runFullScan = async () => {
    setScanning(true);
    try {
      const { data: profiles } = await supabase.from('profiles').select('user_id').limit(100);
      if (profiles) {
        for (const p of profiles) {
          await supabase.rpc('calculate_ai_fraud_score', { _user_id: p.user_id });
        }
      }
      toast({ title: 'AI scan complete', description: `Scanned ${profiles?.length || 0} users` });
      await fetchData();
    } catch (err) {
      toast({ title: 'Scan failed', variant: 'destructive' });
    } finally {
      setScanning(false);
    }
  };

  const freezeAccount = async (userId: string) => {
    await supabase.from('profiles').update({ account_under_review: true, wallet_frozen: true }).eq('user_id', userId);
    await supabase.from('notifications').insert({
      user_id: userId, title: '⚠️ Account Under Review',
      message: 'Your account has been placed under review for security purposes.', type: 'security',
    });
    toast({ title: 'Account frozen' });
    await fetchData();
  };

  const unfreezeAccount = async (userId: string) => {
    await supabase.from('profiles').update({ account_under_review: false, wallet_frozen: false }).eq('user_id', userId);
    await supabase.from('notifications').insert({
      user_id: userId, title: '✅ Account Cleared',
      message: 'Your account review has been completed. All restrictions have been lifted.', type: 'security',
    });
    toast({ title: 'Account unfrozen' });
    await fetchData();
  };

  const freezeWallet = async (userId: string) => {
    await supabase.from('profiles').update({ wallet_frozen: true }).eq('user_id', userId);
    toast({ title: 'Wallet frozen' });
    await fetchData();
  };

  const requestKYC = async (userId: string) => {
    await supabase.from('notifications').insert({
      user_id: userId, title: '📋 KYC Verification Required',
      message: 'To continue using the platform, please complete your identity verification in the Profile → Verify tab.', type: 'verification',
    });
    toast({ title: 'KYC request sent' });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Stats
  const criticalLogs = riskLogs.filter(l => l.risk_level === 'critical');
  const highLogs = riskLogs.filter(l => l.risk_level === 'high');
  const mediumLogs = riskLogs.filter(l => l.risk_level === 'medium');
  const lowLogs = riskLogs.filter(l => l.risk_level === 'low');

  // Distribution pie
  const distributionData = [
    { name: 'Low', value: lowLogs.length || 1 },
    { name: 'Medium', value: mediumLogs.length || 0 },
    { name: 'High', value: highLogs.length || 0 },
    { name: 'Critical', value: criticalLogs.length || 0 },
  ].filter(d => d.value > 0);

  // Daily trend (last 14 days)
  const dailyTrend: Record<string, { high: number; critical: number; total: number }> = {};
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().slice(5, 10);
    dailyTrend[key] = { high: 0, critical: 0, total: 0 };
  }
  riskLogs.forEach(l => {
    const key = new Date(l.created_at).toISOString().slice(5, 10);
    if (dailyTrend[key]) {
      dailyTrend[key].total++;
      if (l.risk_level === 'high') dailyTrend[key].high++;
      if (l.risk_level === 'critical') dailyTrend[key].critical++;
    }
  });
  const trendData = Object.entries(dailyTrend).map(([day, v]) => ({ day, ...v }));

  // Most common triggers
  const triggerCounts: Record<string, number> = {};
  riskLogs.forEach(l => {
    if (Array.isArray(l.reason_flags)) {
      l.reason_flags.forEach(f => {
        triggerCounts[f.flag] = (triggerCounts[f.flag] || 0) + 1;
      });
    }
  });
  const topTriggers = Object.entries(triggerCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, count]) => ({ name: name.replace(/_/g, ' '), count }));

  // IP clusters
  const ipUsers: Record<string, Set<string>> = {};
  riskLogs.forEach(l => {
    if (Array.isArray(l.reason_flags)) {
      l.reason_flags.forEach(f => {
        if (f.flag === 'ip_cluster') {
          if (!ipUsers[l.user_id]) ipUsers[l.user_id] = new Set();
          ipUsers[l.user_id].add(f.detail);
        }
      });
    }
  });

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge className="bg-orange-500 text-white">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-500 text-white">Medium</Badge>;
      default: return <Badge variant="secondary">Low</Badge>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 81) return 'text-destructive';
    if (score >= 61) return 'text-orange-500';
    if (score >= 31) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <div>
              <p className="text-lg font-bold text-foreground">{riskLogs.length}</p>
              <p className="text-[10px] text-muted-foreground">Total Scans</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 border-destructive/30">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-destructive" />
            <div>
              <p className="text-lg font-bold text-destructive">{criticalLogs.length}</p>
              <p className="text-[10px] text-muted-foreground">Critical</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-orange-500" />
            <div>
              <p className="text-lg font-bold text-foreground">{highLogs.length}</p>
              <p className="text-[10px] text-muted-foreground">High Risk</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-lg font-bold text-foreground">{reviewAccounts.length}</p>
              <p className="text-[10px] text-muted-foreground">Under Review</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={runFullScan} disabled={scanning}>
          <RefreshCw className={`w-4 h-4 mr-1 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Scanning...' : 'Run AI Scan'}
        </Button>
      </div>

      <Tabs defaultValue="accounts">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="accounts" className="text-xs py-2">Accounts</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs py-2">Transactions</TabsTrigger>
          <TabsTrigger value="trends" className="text-xs py-2">Trends</TabsTrigger>
          <TabsTrigger value="weights" className="text-xs py-2">Weights</TabsTrigger>
        </TabsList>

        {/* High-Risk Accounts */}
        <TabsContent value="accounts" className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Accounts Under Review</h4>
          {reviewAccounts.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">No accounts under review</p>
          ) : (
            reviewAccounts.map(acc => (
              <Card key={acc.user_id} className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{acc.full_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{acc.user_id.slice(0, 12)}...</p>
                    <div className="flex gap-1 mt-1">
                      {acc.account_under_review && <Badge variant="destructive" className="text-[10px]">Under Review</Badge>}
                      {acc.wallet_frozen && <Badge variant="outline" className="text-[10px]">Wallet Frozen</Badge>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => unfreezeAccount(acc.user_id)}>
                      <Unlock className="w-3 h-3 mr-1" /> Release
                    </Button>
                    <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => requestKYC(acc.user_id)}>
                      <UserCheck className="w-3 h-3 mr-1" /> KYC
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}

          <h4 className="text-xs font-semibold text-muted-foreground uppercase mt-4">Recent High/Critical Risk Users</h4>
          {[...criticalLogs, ...highLogs].slice(0, 15).map(log => (
            <Card key={log.id} className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getRiskBadge(log.risk_level)}
                    <span className={`text-lg font-bold ${getScoreColor(log.ai_fraud_score)}`}>{log.ai_fraud_score}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{log.user_id.slice(0, 12)}...</p>
                  {Array.isArray(log.reason_flags) && log.reason_flags.slice(0, 3).map((f, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground">• {f.detail}</p>
                  ))}
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(log.created_at).toLocaleString()}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="sm" variant="ghost" className="text-[10px] h-7" onClick={() => freezeAccount(log.user_id)}>
                    <Lock className="w-3 h-3 mr-1" /> Freeze
                  </Button>
                  <Button size="sm" variant="ghost" className="text-[10px] h-7" onClick={() => freezeWallet(log.user_id)}>
                    <Lock className="w-3 h-3 mr-1" /> Wallet
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        {/* Critical Transactions */}
        <TabsContent value="transactions" className="space-y-2">
          {riskLogs.filter(l => l.transaction_id).length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">No transaction scans yet</p>
          ) : (
            riskLogs.filter(l => l.transaction_id).slice(0, 20).map(log => (
              <Card key={log.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getRiskBadge(log.risk_level)}
                      <span className={`font-bold ${getScoreColor(log.ai_fraud_score)}`}>{log.ai_fraud_score}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">Txn: {log.transaction_id?.slice(0, 12)}...</p>
                    <p className="text-[10px] text-muted-foreground font-mono">User: {log.user_id.slice(0, 12)}...</p>
                    {Array.isArray(log.reason_flags) && log.reason_flags.map((f, i) => (
                      <p key={i} className="text-[10px] text-muted-foreground">• {f.detail}</p>
                    ))}
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Trends */}
        <TabsContent value="trends" className="space-y-4">
          {/* Risk Distribution */}
          <Card className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Risk Distribution</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distributionData} cx="50%" cy="50%" outerRadius={55} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {distributionData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Daily Trend */}
          <Card className="p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Daily AI Scans (14 days)</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis dataKey="day" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} name="Total" />
                  <Line type="monotone" dataKey="high" stroke="#f59e0b" strokeWidth={1.5} name="High" />
                  <Line type="monotone" dataKey="critical" stroke="#ef4444" strokeWidth={1.5} name="Critical" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Top Triggers */}
          {topTriggers.length > 0 && (
            <Card className="p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Most Common Fraud Triggers</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topTriggers} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={110} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Behavior Weights */}
        <TabsContent value="weights" className="space-y-2">
          <p className="text-xs text-muted-foreground mb-2">Adaptive behavior weights. Weights increase automatically as more fraud cases trigger them.</p>
          {weights.map(w => (
            <Card key={w.id} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-foreground">{w.behavior_key.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-muted-foreground">{w.description}</p>
                  <p className="text-[10px] text-muted-foreground">Triggered {w.historical_triggers} times</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">{w.weight}</p>
                  <p className="text-[10px] text-muted-foreground">weight</p>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
