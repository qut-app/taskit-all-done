import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Image, 
  Tag, 
  Megaphone, 
  CreditCard,
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Shield,
  AlertCircle,
  Building2,
  User,
  TrendingUp,
  Eye,
  FileText,
  BadgeCheck,
  BarChart3,
  Flag,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdmin, useAdminData } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAdminFeedback } from '@/hooks/useFeedback';
import { FeedbackAnalytics } from '@/components/admin/FeedbackAnalytics';
import { ModerationTab } from '@/components/admin/ModerationTab';
import { MarketplaceIntelligence } from '@/components/admin/MarketplaceIntelligence';
import { FraudDashboard } from '@/components/admin/FraudDashboard';
import { FinancialAnalytics } from '@/components/admin/FinancialAnalytics';
import { AIFraudIntelligence } from '@/components/admin/AIFraudIntelligence';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();
  const {
    users,
    pendingVerifications,
    showcases,
    categories,
    ads,
    subscriptions,
    loading,
    approveVerification,
    rejectVerification,
    approveShowcase,
    rejectShowcase,
    createCategory,
    updateCategory,
    createAd,
    updateAd,
    deleteAd,
    refetch,
  } = useAdminData();

  const [activeTab, setActiveTab] = useState('verifications');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [newAdTitle, setNewAdTitle] = useState('');
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showAdDialog, setShowAdDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const { feedbacks, loading: feedbackLoading, updateFeedback } = useAdminFeedback();
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});
  const [feedbackView, setFeedbackView] = useState<'analytics' | 'list'>('analytics');
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  // Loading state
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
          <Loader2 className="w-8 h-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <Shield className="w-16 h-16 text-muted-foreground mb-4" />
        </motion.div>
        <h1 className="text-2xl font-bold text-foreground">Authentication Required</h1>
        <p className="text-muted-foreground mt-2">Please sign in to access the admin dashboard.</p>
        <Button className="mt-4" onClick={() => navigate('/auth')}>Sign In</Button>
      </div>
    );
  }

  // Not an admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        </motion.div>
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You don't have permission to access this page.</p>
        <Button className="mt-4" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }

  const handleApproveVerification = async (userId: string) => {
    const { error } = await approveVerification(userId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'User verified successfully' });
    }
  };

  const handleRejectVerification = async (userId: string) => {
    const { error } = await rejectVerification(userId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Verification rejected' });
    }
  };

  const handleApproveShowcase = async (showcaseId: string) => {
    const { error } = await approveShowcase(showcaseId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Showcase approved' });
    }
  };

  const handleRejectShowcase = async (showcaseId: string) => {
    const { error } = await rejectShowcase(showcaseId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Showcase rejected' });
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    const { error } = await createCategory(newCategoryName, newCategoryIcon);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Category created' });
      setNewCategoryName('');
      setNewCategoryIcon('');
      setShowCategoryDialog(false);
    }
  };

  const handleToggleCategoryActive = async (id: string, currentActive: boolean) => {
    const { error } = await updateCategory(id, { is_active: !currentActive });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleCreateAd = async () => {
    if (!newAdTitle.trim()) return;
    const { error } = await createAd({ title: newAdTitle, ad_type: 'banner' });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Ad created' });
      setNewAdTitle('');
      setShowAdDialog(false);
    }
  };

  const handleToggleAdActive = async (id: string, currentActive: boolean) => {
    const { error } = await updateAd(id, { is_active: !currentActive });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteAd = async (id: string) => {
    const { error } = await deleteAd(id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Ad deleted' });
    }
  };

  const totalRevenue = subscriptions
    .filter(s => s.status === 'active')
    .reduce((acc, s) => acc + Number(s.amount), 0);

  const verifiedUsers = users.filter(u => u.verification_status === 'verified').length;
  const companyUsers = users.filter(u => u.account_type === 'company').length;
  const individualUsers = users.filter(u => u.account_type !== 'company').length;

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.3 }
    })
  };

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-bold text-xl text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage QUT platform</p>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{users.length}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{pendingVerifications.length}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <BadgeCheck className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{verifiedUsers}</p>
                  <p className="text-xs text-muted-foreground">Verified</p>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">₦{totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* User Type Breakdown */}
        <motion.div 
          className="mt-4 grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{individualUsers}</p>
                <p className="text-xs text-muted-foreground">Individuals</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Building2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{companyUsers}</p>
                <p className="text-xs text-muted-foreground">Companies</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-2 h-auto">
            <TabsTrigger value="verifications" className="text-xs py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CheckCircle className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Verify</span>
            </TabsTrigger>
            <TabsTrigger value="moderation" className="text-xs py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Flag className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="showcases" className="text-xs py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Image className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Media</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Tag className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Tags</span>
            </TabsTrigger>
          </TabsList>
          <TabsList className="grid w-full grid-cols-5 mb-2 h-auto">
            <TabsTrigger value="ads" className="text-xs py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Megaphone className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Ads</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="text-xs py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Feedback</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="text-xs py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Intel</span>
            </TabsTrigger>
            <TabsTrigger value="fraud" className="text-xs py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Fraud</span>
            </TabsTrigger>
          </TabsList>
          <TabsList className="grid w-full grid-cols-2 mb-4 h-auto">
            <TabsTrigger value="finance" className="text-xs py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CreditCard className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Finance</span>
            </TabsTrigger>
            <TabsTrigger value="ai-fraud" className="text-xs py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Brain className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">AI Fraud</span>
            </TabsTrigger>
          </TabsList>

          {/* Verifications Tab */}
          <TabsContent value="verifications">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Pending Verifications
                  {pendingVerifications.length > 0 && (
                    <Badge variant="destructive" className="animate-pulse">
                      {pendingVerifications.length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingVerifications.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                    <p className="text-muted-foreground">All caught up! No pending verifications.</p>
                  </motion.div>
                ) : (
                  <AnimatePresence>
                    {pendingVerifications.map((userItem, index) => (
                      <motion.div
                        key={userItem.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 bg-muted/30 rounded-xl border border-border"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-primary-foreground font-bold ${
                              userItem.account_type === 'company' ? 'bg-secondary' : 'bg-primary'
                            }`}>
                              {userItem.account_type === 'company' ? (
                                <Building2 className="w-6 h-6" />
                              ) : (
                                userItem.full_name?.charAt(0) || 'U'
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-foreground truncate">
                                  {userItem.company_name || userItem.full_name}
                                </p>
                                <Badge variant="outline" className="text-xs">
                                  {userItem.account_type === 'company' ? 'Company' : 'Individual'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{userItem.email}</p>
                              {userItem.account_type === 'company' && userItem.cac_number && (
                                <p className="text-xs text-muted-foreground mt-1">CAC: {userItem.cac_number}</p>
                              )}
                              {userItem.location && (
                                <p className="text-xs text-muted-foreground mt-1">📍 {userItem.location}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            {userItem.cac_document_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => window.open(userItem.cac_document_url, '_blank')}
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                CAC Doc
                              </Button>
                            )}
                            {userItem.face_verification_url && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => window.open(userItem.face_verification_url, '_blank')}
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Photo
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            className="flex-1 bg-success hover:bg-success/90"
                            onClick={() => handleApproveVerification(userItem.user_id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-destructive border-destructive hover:bg-destructive/10"
                            onClick={() => handleRejectVerification(userItem.user_id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Moderation Tab */}
          <TabsContent value="moderation">
            <ModerationTab users={users} />
          </TabsContent>

          {/* Showcases Tab */}
          <TabsContent value="showcases">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Pending Work Showcases
                  {showcases.length > 0 && (
                    <Badge variant="secondary">{showcases.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : showcases.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <Image className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No pending showcases to review.</p>
                  </motion.div>
                ) : (
                  <AnimatePresence>
                    {showcases.map((showcase, index) => (
                      <motion.div
                        key={showcase.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 bg-muted/30 rounded-xl border border-border"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                            {showcase.media_url && (
                              <img
                                src={showcase.media_url}
                                alt="Showcase"
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground line-clamp-2">{showcase.caption || 'No caption'}</p>
                            <Badge variant="outline" className="mt-2 text-xs">
                              {showcase.media_type}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            className="flex-1 bg-success hover:bg-success/90"
                            onClick={() => handleApproveShowcase(showcase.id)}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-destructive border-destructive hover:bg-destructive/10"
                            onClick={() => handleRejectShowcase(showcase.id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Service Categories</CardTitle>
                <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Category</DialogTitle>
                      <DialogDescription>Create a new service category</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Name</label>
                        <Input
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Category name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Icon (optional)</label>
                        <Input
                          value={newCategoryIcon}
                          onChange={(e) => setNewCategoryIcon(e.target.value)}
                          placeholder="lucide icon name"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateCategory}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <AnimatePresence>
                    {categories.map((category, index) => (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.02 }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          category.is_active 
                            ? 'border-primary/30 bg-primary/5' 
                            : 'border-border bg-muted/30 opacity-60'
                        }`}
                        onClick={() => handleToggleCategoryActive(category.id, category.is_active ?? true)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground truncate">{category.name}</span>
                          <Badge variant={category.is_active ? 'default' : 'secondary'} className="text-xs ml-2 shrink-0">
                            {category.is_active ? 'Active' : 'Hidden'}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ads Approval Tab */}
          <TabsContent value="ads">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  Ads Approval
                  {ads.filter((a: any) => a.approval_status === 'pending_approval').length > 0 && (
                    <Badge variant="destructive" className="animate-pulse">
                      {ads.filter((a: any) => a.approval_status === 'pending_approval').length}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ads.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                    <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No ads submitted yet.</p>
                  </motion.div>
                ) : (
                  <AnimatePresence>
                    {ads.map((ad: any, index: number) => (
                      <motion.div
                        key={ad.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 bg-muted/30 rounded-xl border border-border space-y-3"
                      >
                        <div className="flex items-start gap-3">
                          {ad.image_url && (
                            <div className="w-20 h-20 rounded-xl bg-muted overflow-hidden flex-shrink-0">
                              <img src={ad.image_url} alt="Ad" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground">{ad.title}</p>
                            {ad.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ad.description}</p>}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant={
                                ad.approval_status === 'approved' ? 'default' :
                                ad.approval_status === 'rejected' ? 'destructive' :
                                ad.approval_status === 'pending_approval' ? 'secondary' : 'outline'
                              } className="text-xs capitalize">
                                {(ad.approval_status || 'pending').replace('_', ' ')}
                              </Badge>
                              {ad.budget && <Badge variant="outline" className="text-xs">₦{Number(ad.budget).toLocaleString()}</Badge>}
                              {ad.paystack_reference && <Badge variant="outline" className="text-xs text-success">Paid ✓</Badge>}
                              {ad.target_audience && <Badge variant="outline" className="text-xs">{ad.target_audience}</Badge>}
                            </div>
                            {ad.location_targeting && <p className="text-xs text-muted-foreground mt-1">📍 {ad.location_targeting}</p>}
                            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                              <span>{ad.impressions || 0} impressions</span>
                              <span>{ad.clicks || 0} clicks</span>
                              {ad.impressions > 0 && <span>{((ad.clicks / ad.impressions) * 100).toFixed(1)}% CTR</span>}
                            </div>
                          </div>
                        </div>

                        {ad.approval_status === 'pending_approval' && (
                          <div className="space-y-2">
                            <Input
                              placeholder="Rejection reason (required to reject)"
                              value={rejectReasons[ad.id] || ''}
                              onChange={e => setRejectReasons(prev => ({ ...prev, [ad.id]: e.target.value }))}
                              className="text-xs"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 bg-success hover:bg-success/90"
                                onClick={async () => {
                                  const { error } = await updateAd(ad.id, { is_active: true, approval_status: 'approved' } as any);
                                  if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
                                  else toast({ title: 'Ad approved and live!' });
                                }}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" /> Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-destructive border-destructive hover:bg-destructive/10"
                                disabled={!rejectReasons[ad.id]?.trim()}
                                onClick={async () => {
                                  const { error } = await updateAd(ad.id, { approval_status: 'rejected', reject_reason: rejectReasons[ad.id], is_active: false } as any);
                                  if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
                                  else { toast({ title: 'Ad rejected' }); setRejectReasons(prev => { const n = { ...prev }; delete n[ad.id]; return n; }); }
                                }}
                              >
                                <XCircle className="w-4 h-4 mr-1" /> Reject
                              </Button>
                            </div>
                          </div>
                        )}

                        {ad.approval_status === 'approved' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleToggleAdActive(ad.id, ad.is_active ?? true)}>
                              {ad.is_active ? 'Pause' : 'Enable'}
                            </Button>
                            <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleDeleteAd(ad.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}

                        {ad.approval_status === 'rejected' && ad.reject_reason && (
                          <p className="text-xs text-destructive">Reason: {ad.reject_reason}</p>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Users</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <AnimatePresence>
                    {users.map((userItem, index) => (
                      <motion.div
                        key={userItem.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-xl"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            userItem.verification_status === 'verified' 
                              ? 'bg-success/10 text-success' 
                              : userItem.verification_status === 'pending'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {userItem.account_type === 'company' ? (
                              <Building2 className="w-5 h-5" />
                            ) : (
                              userItem.full_name?.charAt(0) || 'U'
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm truncate">
                              {userItem.company_name || userItem.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{userItem.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {userItem.account_type === 'company' && (
                            <Badge variant="outline" className="text-xs">Company</Badge>
                          )}
                          <Badge 
                            variant={
                              userItem.verification_status === 'verified' ? 'default' :
                              userItem.verification_status === 'pending' ? 'secondary' : 'outline'
                            }
                            className="text-xs"
                          >
                            {userItem.verification_status === 'verified' && <BadgeCheck className="w-3 h-3 mr-1" />}
                            {userItem.verification_status}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          {/* Feedback Tab */}
          <TabsContent value="feedback">
            {/* Analytics / List Toggle */}
            <div className="flex gap-2 mb-4">
              <Button size="sm" variant={feedbackView === 'analytics' ? 'default' : 'outline'} onClick={() => setFeedbackView('analytics')}>
                <BarChart3 className="w-4 h-4 mr-1" /> Analytics
              </Button>
              <Button size="sm" variant={feedbackView === 'list' ? 'default' : 'outline'} onClick={() => setFeedbackView('list')}>
                <FileText className="w-4 h-4 mr-1" /> List
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => {
                  const csv = [
                    ['Date', 'Category', 'Role', 'Status', 'Priority', 'Message'].join(','),
                    ...feedbacks.map((f: any) =>
                      [
                        new Date(f.created_at).toLocaleDateString(),
                        f.category,
                        f.role,
                        f.status,
                        f.priority || 'normal',
                        `"${(f.message || '').replace(/"/g, '""')}"`,
                      ].join(',')
                    ),
                  ].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'feedback-export.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Export CSV
              </Button>
            </div>

            {feedbackView === 'analytics' ? (
              <FeedbackAnalytics
                feedbacks={feedbacks}
                users={users}
                onAutoFlag={async (id) => {
                  const { error } = await updateFeedback(id, { priority: 'high' });
                  if (!error) toast({ title: 'Flagged as high priority' });
                }}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">User Feedback</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {feedbackLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : feedbacks.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No feedback yet.</p>
                  ) : (
                    <AnimatePresence>
                      {feedbacks.map((fb: any, idx: number) => (
                        <motion.div
                          key={fb.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="p-4 bg-muted/30 rounded-xl border border-border space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="outline" className="text-xs">{fb.category}</Badge>
                                <Badge variant="secondary" className="text-xs capitalize">{fb.role}</Badge>
                                <Badge
                                  variant={fb.status === 'New' ? 'destructive' : fb.status === 'Resolved' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {fb.status}
                                </Badge>
                                {fb.priority === 'high' && <Badge className="text-xs bg-warning text-warning-foreground">High Priority</Badge>}
                              </div>
                              <p className="text-sm text-foreground mt-2">{fb.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(fb.created_at).toLocaleString()}
                              </p>
                              {fb.attachment_url && (
                                <Button size="sm" variant="link" className="px-0 h-auto text-xs mt-1" onClick={() => window.open(fb.attachment_url, '_blank')}>
                                  View Attachment
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Select
                              defaultValue={fb.status}
                              onValueChange={async (val) => {
                                const { error } = await updateFeedback(fb.id, { status: val });
                                if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
                                else toast({ title: 'Status updated' });
                              }}
                            >
                              <SelectTrigger className="w-[130px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="New">New</SelectItem>
                                <SelectItem value="Reviewing">Reviewing</SelectItem>
                                <SelectItem value="Resolved">Resolved</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>

                            <Select
                              defaultValue={fb.priority || 'normal'}
                              onValueChange={async (val) => {
                                const { error } = await updateFeedback(fb.id, { priority: val });
                                if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
                                else toast({ title: 'Priority updated' });
                              }}
                            >
                              <SelectTrigger className="w-[110px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Textarea
                              placeholder="Admin notes..."
                              rows={2}
                              className="text-xs"
                              value={editingNotes[fb.id] ?? fb.admin_notes ?? ''}
                              onChange={(e) => setEditingNotes(prev => ({ ...prev, [fb.id]: e.target.value }))}
                            />
                            {(editingNotes[fb.id] !== undefined && editingNotes[fb.id] !== (fb.admin_notes ?? '')) && (
                              <Button
                                size="sm"
                                className="mt-1 text-xs h-7"
                                onClick={async () => {
                                  const { error } = await updateFeedback(fb.id, { admin_notes: editingNotes[fb.id] });
                                  if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
                                  else {
                                    toast({ title: 'Notes saved' });
                                    setEditingNotes(prev => { const n = { ...prev }; delete n[fb.id]; return n; });
                                  }
                                }}
                              >
                                Save Notes
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          {/* Marketplace Intelligence Tab */}
          <TabsContent value="intelligence">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Marketplace Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MarketplaceIntelligence />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fraud Dashboard Tab */}
          <TabsContent value="fraud">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Anti-Fraud & Trust Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FraudDashboard />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Analytics Tab */}
          <TabsContent value="finance">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Financial Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FinancialAnalytics />
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Fraud Intelligence Tab */}
          <TabsContent value="ai-fraud">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  AI Fraud Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AIFraudIntelligence />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;