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
  BadgeCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAdmin, useAdminData } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
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
          <TabsList className="grid w-full grid-cols-5 mb-4 h-auto">
            <TabsTrigger value="verifications" className="text-xs py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CheckCircle className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Verify</span>
            </TabsTrigger>
            <TabsTrigger value="showcases" className="text-xs py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Image className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Media</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Tag className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Tags</span>
            </TabsTrigger>
            <TabsTrigger value="ads" className="text-xs py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Megaphone className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Ads</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Users</span>
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

          {/* Ads Tab */}
          <TabsContent value="ads">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Advertisements</CardTitle>
                <Dialog open={showAdDialog} onOpenChange={setShowAdDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Ad
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Ad</DialogTitle>
                      <DialogDescription>Add a new advertisement</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Title</label>
                        <Input
                          value={newAdTitle}
                          onChange={(e) => setNewAdTitle(e.target.value)}
                          placeholder="Ad title"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateAd}>Create</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-3">
                {ads.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No ads created yet.</p>
                  </motion.div>
                ) : (
                  <AnimatePresence>
                    {ads.map((ad, index) => (
                      <motion.div
                        key={ad.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 bg-muted/30 rounded-xl border border-border"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">{ad.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{ad.ad_type}</Badge>
                              <Badge variant={ad.is_active ? 'default' : 'secondary'} className="text-xs">
                                {ad.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleAdActive(ad.id, ad.is_active ?? true)}
                            >
                              {ad.is_active ? 'Pause' : 'Enable'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive"
                              onClick={() => handleDeleteAd(ad.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
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
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;