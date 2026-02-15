import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TrustScore {
  id: string;
  user_id: string;
  score: number;
  completed_jobs_factor: number;
  review_factor: number;
  on_time_factor: number;
  account_age_factor: number;
  dispute_penalty: number;
  cancellation_penalty: number;
  report_penalty: number;
  role_switch_penalty: number;
  last_calculated_at: string;
}

interface RiskAssessment {
  id: string;
  user_id: string;
  escrow_transaction_id: string | null;
  risk_level: string;
  risk_factors: string[];
  auto_hold: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export function FraudDashboard() {
  const [trustScores, setTrustScores] = useState<TrustScore[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [flaggedAccounts, setFlaggedAccounts] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [scoresRes, risksRes, flagsRes, disputesRes] = await Promise.all([
        supabase.from('trust_scores').select('*').order('score', { ascending: true }).limit(50),
        supabase.from('transaction_risk_assessments').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('suspicious_flags').select('*').eq('is_resolved', false).order('created_at', { ascending: false }),
        supabase.from('escrow_transactions').select('*').eq('status', 'disputed').order('created_at', { ascending: false }),
      ]);

      setTrustScores((scoresRes.data || []) as TrustScore[]);
      setRiskAssessments((risksRes.data || []) as RiskAssessment[]);
      setFlaggedAccounts(flagsRes.data || []);
      setDisputes(disputesRes.data || []);
    } catch (err) {
      console.error('Error fetching fraud data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const recalculateScores = async () => {
    setRecalculating(true);
    try {
      // Get all user_ids from profiles
      const { data: profiles } = await supabase.from('profiles').select('user_id').limit(100);
      if (profiles) {
        for (const p of profiles) {
          await supabase.rpc('calculate_trust_score', { _user_id: p.user_id });
        }
      }
      toast({ title: 'Trust scores recalculated' });
      await fetchData();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to recalculate', variant: 'destructive' });
    } finally {
      setRecalculating(false);
    }
  };

  const resolveFlag = async (flagId: string) => {
    await supabase.from('suspicious_flags').update({ is_resolved: true }).eq('id', flagId);
    await fetchData();
    toast({ title: 'Flag resolved' });
  };

  const markReviewed = async (assessmentId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('transaction_risk_assessments').update({
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', assessmentId);
    await fetchData();
    toast({ title: 'Marked as reviewed' });
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRiskBadge = (level: string) => {
    if (level === 'high') return <Badge variant="destructive">High Risk</Badge>;
    if (level === 'medium') return <Badge className="bg-yellow-500 text-white">Medium</Badge>;
    return <Badge variant="secondary">Low</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const highRiskCount = riskAssessments.filter(r => r.risk_level === 'high').length;
  const unreviewedRisks = riskAssessments.filter(r => !r.reviewed_at).length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <p className="text-lg font-bold">{trustScores.length}</p>
              <p className="text-xs text-muted-foreground">Scored Users</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-lg font-bold">{flaggedAccounts.length}</p>
              <p className="text-xs text-muted-foreground">Flagged</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="text-lg font-bold">{highRiskCount}</p>
              <p className="text-xs text-muted-foreground">High Risk Txns</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <div>
              <p className="text-lg font-bold">{disputes.length}</p>
              <p className="text-xs text-muted-foreground">Disputes</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={recalculateScores} disabled={recalculating}>
          <RefreshCw className={`w-4 h-4 mr-1 ${recalculating ? 'animate-spin' : ''}`} />
          Recalculate Scores
        </Button>
      </div>

      <Tabs defaultValue="scores">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="scores" className="text-xs py-2">Trust Scores</TabsTrigger>
          <TabsTrigger value="risks" className="text-xs py-2">
            Risk Txns {unreviewedRisks > 0 && <Badge variant="destructive" className="ml-1 text-[10px] px-1">{unreviewedRisks}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="flags" className="text-xs py-2">Flagged</TabsTrigger>
          <TabsTrigger value="disputes" className="text-xs py-2">Disputes</TabsTrigger>
        </TabsList>

        {/* Trust Scores */}
        <TabsContent value="scores" className="space-y-2">
          {trustScores.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No trust scores yet. Click "Recalculate Scores" to generate.</p>
          ) : (
            trustScores.map((ts) => (
              <Card key={ts.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-mono">{ts.user_id.slice(0, 8)}...</p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] text-green-600">+{ts.completed_jobs_factor} jobs</span>
                      <span className="text-[10px] text-green-600">+{ts.review_factor} reviews</span>
                      <span className="text-[10px] text-green-600">+{ts.on_time_factor} ontime</span>
                      <span className="text-[10px] text-green-600">+{ts.account_age_factor} age</span>
                      {ts.dispute_penalty > 0 && <span className="text-[10px] text-red-600">-{ts.dispute_penalty} disputes</span>}
                      {ts.cancellation_penalty > 0 && <span className="text-[10px] text-red-600">-{ts.cancellation_penalty} cancels</span>}
                      {ts.report_penalty > 0 && <span className="text-[10px] text-red-600">-{ts.report_penalty} reports</span>}
                      {ts.role_switch_penalty > 0 && <span className="text-[10px] text-red-600">-{ts.role_switch_penalty} switches</span>}
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${getScoreColor(ts.score)}`}>
                    {ts.score}
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Risk Assessments */}
        <TabsContent value="risks" className="space-y-2">
          {riskAssessments.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No risk assessments yet.</p>
          ) : (
            riskAssessments.map((ra) => (
              <Card key={ra.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getRiskBadge(ra.risk_level)}
                      {ra.auto_hold && <Badge variant="outline" className="text-[10px]">Auto-held</Badge>}
                      {ra.reviewed_at && <CheckCircle className="w-3 h-3 text-green-600" />}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">User: {ra.user_id.slice(0, 8)}...</p>
                    {Array.isArray(ra.risk_factors) && ra.risk_factors.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {ra.risk_factors.map((f: string, i: number) => (
                          <p key={i} className="text-[10px] text-muted-foreground">• {f}</p>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(ra.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {!ra.reviewed_at && (
                    <Button size="sm" variant="ghost" onClick={() => markReviewed(ra.id)}>
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Flagged Accounts */}
        <TabsContent value="flags" className="space-y-2">
          {flaggedAccounts.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No flagged accounts.</p>
          ) : (
            flaggedAccounts.map((flag) => (
              <Card key={flag.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="destructive" className="text-[10px]">{flag.flag_type}</Badge>
                    <p className="text-xs text-muted-foreground font-mono mt-1">{flag.user_id.slice(0, 8)}...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(flag.created_at).toLocaleDateString()}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => resolveFlag(flag.id)}>
                    Resolve
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Disputes */}
        <TabsContent value="disputes" className="space-y-2">
          {disputes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No active disputes.</p>
          ) : (
            disputes.map((d) => (
              <Card key={d.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="destructive">Disputed</Badge>
                    <p className="text-sm font-medium mt-1">₦{Number(d.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground font-mono">Payer: {d.payer_id.slice(0, 8)}...</p>
                    <p className="text-xs text-muted-foreground font-mono">Payee: {d.payee_id.slice(0, 8)}...</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
