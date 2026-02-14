import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, AlertTriangle, RefreshCw, Eye, Loader2,
  CheckCircle, XCircle, Ban, Flag, MessageSquare, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useModeration } from '@/hooks/useModeration';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface ModerationTabProps {
  users: any[];
}

export function ModerationTab({ users }: ModerationTabProps) {
  const {
    reports, roleSwitchLogs, suspiciousFlags, loading,
    updateReportStatus, addAdminNotes, setAdminAction,
    sendWarning, suspendUser, flagAccount, resolveFlag,
    getSuspiciousSwitchers,
  } = useModeration();
  const { toast } = useToast();

  const [modSubTab, setModSubTab] = useState('reports');
  const [warningDialog, setWarningDialog] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: '', userName: '' });
  const [warningMessage, setWarningMessage] = useState('');
  const [suspendDialog, setSuspendDialog] = useState<{ open: boolean; userId: string; userName: string }>({ open: false, userId: '', userName: '' });
  const [suspendDuration, setSuspendDuration] = useState('7 days');
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const getUserName = (userId: string) => {
    const u = users.find((u: any) => u.user_id === userId);
    return u?.company_name || u?.full_name || 'Unknown User';
  };

  const getUserType = (userId: string) => {
    const u = users.find((u: any) => u.user_id === userId);
    return u?.account_type === 'company' ? 'Company' : 'Individual';
  };

  const suspiciousSwitchers = getSuspiciousSwitchers();
  const pendingReports = reports.filter((r: any) => r.status === 'pending');
  const unresolvedFlags = suspiciousFlags.filter((f: any) => !f.is_resolved);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <div>
              <p className="text-lg font-bold text-foreground">{pendingReports.length}</p>
              <p className="text-xs text-muted-foreground">Pending Reports</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-warning" />
            <div>
              <p className="text-lg font-bold text-foreground">{reports.length}</p>
              <p className="text-xs text-muted-foreground">Total Reports</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-destructive" />
            <div>
              <p className="text-lg font-bold text-foreground">{unresolvedFlags.length}</p>
              <p className="text-xs text-muted-foreground">Active Flags</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            <div>
              <p className="text-lg font-bold text-foreground">{suspiciousSwitchers.length}</p>
              <p className="text-xs text-muted-foreground">Suspicious Switchers</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Sub-tabs */}
      <Tabs value={modSubTab} onValueChange={setModSubTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="reports" className="text-xs py-2">
            Reports {pendingReports.length > 0 && <Badge variant="destructive" className="ml-1 text-[10px] px-1">{pendingReports.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="roleLogs" className="text-xs py-2">Role Logs</TabsTrigger>
          <TabsTrigger value="flags" className="text-xs py-2">
            Flags {unresolvedFlags.length > 0 && <Badge variant="destructive" className="ml-1 text-[10px] px-1">{unresolvedFlags.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* Reports */}
        <TabsContent value="reports" className="space-y-3">
          {reports.length === 0 ? (
            <Card className="p-8 text-center">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No reports yet.</p>
            </Card>
          ) : (
            <AnimatePresence>
              {reports.map((report: any, idx: number) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={
                            report.status === 'pending' ? 'destructive' :
                            report.status === 'reviewing' ? 'secondary' : 'default'
                          } className="text-xs capitalize">{report.status}</Badge>
                          <Badge variant="outline" className="text-xs">{getUserType(report.reported_user_id)}</Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground mt-2">
                          <span className="text-muted-foreground">Reported:</span> {getUserName(report.reported_user_id)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          By: {getUserName(report.reporter_id)} · {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                        </p>
                        <p className="text-sm text-foreground mt-2">{report.reason}</p>
                        {report.admin_action && (
                          <Badge className="mt-2 text-xs">{report.admin_action}</Badge>
                        )}
                      </div>
                    </div>

                    {/* Status + Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select
                        defaultValue={report.status}
                        onValueChange={async (val) => {
                          const { error } = await updateReportStatus(report.id, val);
                          if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
                        }}
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">New</SelectItem>
                          <SelectItem value="reviewing">Reviewing</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => {
                        setWarningDialog({ open: true, userId: report.reported_user_id, userName: getUserName(report.reported_user_id) });
                      }}>
                        <MessageSquare className="w-3 h-3 mr-1" /> Warn
                      </Button>

                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={async () => {
                        await flagAccount(report.reported_user_id);
                        await setAdminAction(report.id, 'flagged');
                      }}>
                        <Flag className="w-3 h-3 mr-1" /> Flag
                      </Button>

                      <Button size="sm" variant="outline" className="h-8 text-xs text-destructive" onClick={() => {
                        setSuspendDialog({ open: true, userId: report.reported_user_id, userName: getUserName(report.reported_user_id) });
                      }}>
                        <Ban className="w-3 h-3 mr-1" /> Suspend
                      </Button>
                    </div>

                    {/* Admin Notes */}
                    <div>
                      <Textarea
                        placeholder="Admin notes..."
                        rows={2}
                        className="text-xs"
                        value={adminNotes[report.id] ?? report.admin_notes ?? ''}
                        onChange={(e) => setAdminNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                      />
                      {(adminNotes[report.id] !== undefined && adminNotes[report.id] !== (report.admin_notes ?? '')) && (
                        <Button size="sm" className="mt-1 text-xs h-7" onClick={async () => {
                          const { error } = await addAdminNotes(report.id, adminNotes[report.id]);
                          if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
                          else {
                            toast({ title: 'Notes saved' });
                            setAdminNotes(prev => { const n = { ...prev }; delete n[report.id]; return n; });
                          }
                        }}>
                          Save Notes
                        </Button>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </TabsContent>

        {/* Role Switch Logs */}
        <TabsContent value="roleLogs" className="space-y-3">
          {/* Suspicious Switchers Alert */}
          {suspiciousSwitchers.length > 0 && (
            <Card className="p-4 border-destructive/30 bg-destructive/5">
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-destructive" />
                Suspicious Activity Detected
              </h4>
              <div className="space-y-2">
                {suspiciousSwitchers.map((s) => (
                  <div key={s.userId} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{getUserName(s.userId)}</span>
                    <Badge variant="destructive" className="text-xs">{s.count} switches in 48h</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {roleSwitchLogs.length === 0 ? (
            <Card className="p-8 text-center">
              <RefreshCw className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No role switch logs yet.</p>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="p-3 text-left text-muted-foreground font-medium">User</th>
                        <th className="p-3 text-left text-muted-foreground font-medium">From</th>
                        <th className="p-3 text-left text-muted-foreground font-medium">To</th>
                        <th className="p-3 text-left text-muted-foreground font-medium">Date</th>
                        <th className="p-3 text-left text-muted-foreground font-medium">Device</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roleSwitchLogs.map((log: any) => {
                        const isSuspicious = suspiciousSwitchers.some((s) => s.userId === log.user_id);
                        return (
                          <tr key={log.id} className={`border-b border-border ${isSuspicious ? 'bg-destructive/5' : ''}`}>
                            <td className="p-3 text-foreground">{getUserName(log.user_id)}</td>
                            <td className="p-3"><Badge variant="outline" className="text-[10px]">{log.previous_role}</Badge></td>
                            <td className="p-3"><Badge variant="secondary" className="text-[10px]">{log.new_role}</Badge></td>
                            <td className="p-3 text-muted-foreground">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="p-3 text-muted-foreground">{log.device_type || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Flags */}
        <TabsContent value="flags" className="space-y-3">
          {suspiciousFlags.length === 0 ? (
            <Card className="p-8 text-center">
              <Flag className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No flagged accounts.</p>
            </Card>
          ) : (
            <AnimatePresence>
              {suspiciousFlags.map((flag: any, idx: number) => (
                <motion.div
                  key={flag.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{getUserName(flag.user_id)}</p>
                        <p className="text-xs text-muted-foreground">{flag.flag_type} · {flag.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(flag.created_at), { addSuffix: true })}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={flag.is_resolved ? 'default' : 'destructive'} className="text-xs">
                          {flag.is_resolved ? 'Resolved' : 'Active'}
                        </Badge>
                        {!flag.is_resolved && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => resolveFlag(flag.id)}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </TabsContent>
      </Tabs>

      {/* Warning Dialog */}
      <Dialog open={warningDialog.open} onOpenChange={(o) => setWarningDialog(prev => ({ ...prev, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Warning to {warningDialog.userName}</DialogTitle>
            <DialogDescription>This message will be sent as a notification and recorded on their profile.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={warningMessage}
            onChange={(e) => setWarningMessage(e.target.value)}
            placeholder="Warning message..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarningDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
            <Button disabled={!warningMessage.trim()} onClick={async () => {
              await sendWarning(warningDialog.userId, warningMessage);
              setWarningMessage('');
              setWarningDialog(prev => ({ ...prev, open: false }));
            }}>Send Warning</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={suspendDialog.open} onOpenChange={(o) => setSuspendDialog(prev => ({ ...prev, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend {suspendDialog.userName}</DialogTitle>
            <DialogDescription>Choose suspension duration.</DialogDescription>
          </DialogHeader>
          <Select value={suspendDuration} onValueChange={setSuspendDuration}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24 hours">24 Hours</SelectItem>
              <SelectItem value="3 days">3 Days</SelectItem>
              <SelectItem value="7 days">7 Days</SelectItem>
              <SelectItem value="30 days">30 Days</SelectItem>
              <SelectItem value="permanent">Permanent</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialog(prev => ({ ...prev, open: false }))}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              await suspendUser(suspendDialog.userId, suspendDuration === 'permanent' ? undefined : suspendDuration);
              setSuspendDialog(prev => ({ ...prev, open: false }));
            }}>Suspend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
