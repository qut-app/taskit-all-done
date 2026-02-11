import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, AlertTriangle, CheckCircle, Clock, TrendingUp, BarChart3 } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const HIGH_RISK_KEYWORDS = ['scam', 'fraud', 'stolen', 'hack', 'lost money', 'not received', 'charged', 'unauthorized', 'refund', 'failed payment', 'missing funds'];
const PIE_COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--success))', 'hsl(var(--muted-foreground))'];

interface Props {
  feedbacks: any[];
  users: any[];
  onAutoFlag: (id: string) => void;
}

export function FeedbackAnalytics({ feedbacks, users, onAutoFlag }: Props) {
  const analytics = useMemo(() => {
    const now = new Date();
    const thisMonth = feedbacks.filter(f => new Date(f.created_at).getMonth() === now.getMonth() && new Date(f.created_at).getFullYear() === now.getFullYear());
    const statusCounts = { New: 0, Reviewing: 0, Resolved: 0, Closed: 0 };
    feedbacks.forEach(f => { if (f.status in statusCounts) statusCounts[f.status as keyof typeof statusCounts]++; });
    const highPriority = feedbacks.filter(f => f.priority === 'high').length;

    // Daily submissions (last 14 days)
    const dailyMap: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dailyMap[d.toISOString().slice(0, 10)] = 0;
    }
    feedbacks.forEach(f => {
      const day = f.created_at.slice(0, 10);
      if (day in dailyMap) dailyMap[day]++;
    });
    const dailyData = Object.entries(dailyMap).map(([date, count]) => ({ date: date.slice(5), count }));

    // Category distribution
    const catMap: Record<string, number> = {};
    feedbacks.forEach(f => { catMap[f.category] = (catMap[f.category] || 0) + 1; });
    const categoryData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

    // Keyword grouping
    const keywordGroups: Record<string, number> = {};
    feedbacks.forEach(f => {
      const msg = (f.message || '').toLowerCase();
      HIGH_RISK_KEYWORDS.forEach(kw => {
        if (msg.includes(kw)) keywordGroups[kw] = (keywordGroups[kw] || 0) + 1;
      });
    });
    const topKeywords = Object.entries(keywordGroups).sort((a, b) => b[1] - a[1]).slice(0, 10);

    // User insights
    const companyCount = users.filter(u => u.account_type === 'company').length;
    const individualCount = users.length - companyCount;
    // subscriptions would indicate paid - approximate with verified
    const paidCount = users.filter(u => u.verification_status === 'verified').length;
    const freeCount = users.length - paidCount;

    // Top senders
    const senderMap: Record<string, number> = {};
    feedbacks.forEach(f => { senderMap[f.user_id] = (senderMap[f.user_id] || 0) + 1; });
    const topSenders = Object.entries(senderMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([uid, count]) => {
        const u = users.find(u => u.user_id === uid);
        return { name: u?.full_name || uid.slice(0, 8), count };
      });

    // Urgency auto-detection
    const urgentIds: string[] = [];
    feedbacks.forEach(f => {
      if (f.priority === 'high') return;
      const msg = (f.message || '').toLowerCase();
      const isPayment = f.category === 'Payment Issue';
      const hasKeyword = HIGH_RISK_KEYWORDS.some(kw => msg.includes(kw));
      if (isPayment || hasKeyword) urgentIds.push(f.id);
    });
    // 5+ similar in 24h check
    const last24h = feedbacks.filter(f => (Date.now() - new Date(f.created_at).getTime()) < 86400000);
    const cat24h: Record<string, string[]> = {};
    last24h.forEach(f => {
      if (!cat24h[f.category]) cat24h[f.category] = [];
      cat24h[f.category].push(f.id);
    });
    Object.values(cat24h).forEach(ids => {
      if (ids.length >= 5) ids.forEach(id => { if (!urgentIds.includes(id)) urgentIds.push(id); });
    });

    return { statusCounts, highPriority, thisMonth: thisMonth.length, dailyData, categoryData, topKeywords, companyCount, individualCount, paidCount, freeCount, topSenders, urgentIds };
  }, [feedbacks, users]);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xl font-bold text-foreground">{feedbacks.length}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <div>
              <p className="text-xl font-bold text-foreground">{analytics.statusCounts.New}</p>
              <p className="text-[10px] text-muted-foreground">New</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-warning" />
            <div>
              <p className="text-xl font-bold text-foreground">{analytics.statusCounts.Reviewing}</p>
              <p className="text-[10px] text-muted-foreground">Reviewing</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-success" />
            <div>
              <p className="text-xl font-bold text-foreground">{analytics.statusCounts.Resolved}</p>
              <p className="text-[10px] text-muted-foreground">Resolved</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <div>
              <p className="text-xl font-bold text-foreground">{analytics.highPriority}</p>
              <p className="text-[10px] text-muted-foreground">High Priority</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-secondary" />
            <div>
              <p className="text-xl font-bold text-foreground">{analytics.thisMonth}</p>
              <p className="text-[10px] text-muted-foreground">This Month</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Urgency Auto-flag */}
      {analytics.urgentIds.length > 0 && (
        <Card className="p-4 border-warning/50 bg-warning/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">⚠️ {analytics.urgentIds.length} feedback(s) need urgent attention</p>
              <p className="text-xs text-muted-foreground">Payment issues, high-risk keywords, or 5+ similar reports in 24h</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => analytics.urgentIds.forEach(id => onAutoFlag(id))}>
              Flag All High
            </Button>
          </div>
        </Card>
      )}

      {/* Daily Submissions Chart */}
      <Card className="p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Daily Submissions (14 days)</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={analytics.dailyData}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Category Distribution */}
      <Card className="p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Category Distribution</h4>
        {analytics.categoryData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={analytics.categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {analytics.categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-muted-foreground text-center py-4">No data</p>}
      </Card>

      {/* Most Reported Issues */}
      {analytics.topKeywords.length > 0 && (
        <Card className="p-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">🔥 Most Reported Issues (Keywords)</h4>
          <div className="space-y-2">
            {analytics.topKeywords.map(([kw, count]) => (
              <div key={kw} className="flex items-center justify-between">
                <span className="text-sm text-foreground capitalize">{kw}</span>
                <Badge variant="outline">{count}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* User Insights */}
      <Card className="p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">User Insights</h4>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <p className="text-lg font-bold text-foreground">{analytics.individualCount > 0 ? ((analytics.individualCount / (analytics.individualCount + analytics.companyCount)) * 100).toFixed(0) : 0}%</p>
            <p className="text-xs text-muted-foreground">Individual</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <p className="text-lg font-bold text-foreground">{analytics.companyCount > 0 ? ((analytics.companyCount / (analytics.individualCount + analytics.companyCount)) * 100).toFixed(0) : 0}%</p>
            <p className="text-xs text-muted-foreground">Company</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <p className="text-lg font-bold text-foreground">{analytics.paidCount > 0 ? ((analytics.paidCount / (analytics.paidCount + analytics.freeCount)) * 100).toFixed(0) : 0}%</p>
            <p className="text-xs text-muted-foreground">Paid (Verified)</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <p className="text-lg font-bold text-foreground">{analytics.freeCount > 0 ? ((analytics.freeCount / (analytics.paidCount + analytics.freeCount)) * 100).toFixed(0) : 0}%</p>
            <p className="text-xs text-muted-foreground">Free</p>
          </div>
        </div>

        <h4 className="text-sm font-semibold text-foreground mb-2">Top 10 Feedback Senders</h4>
        <div className="space-y-1">
          {analytics.topSenders.map((s, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{i + 1}. {s.name}</span>
              <Badge variant="outline" className="text-xs">{s.count}</Badge>
            </div>
          ))}
          {analytics.topSenders.length === 0 && <p className="text-xs text-muted-foreground">No data yet</p>}
        </div>
      </Card>
    </div>
  );
}
