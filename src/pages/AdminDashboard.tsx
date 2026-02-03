import { useState } from 'react';
import { motion } from 'framer-motion';
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
  Edit,
  Shield,
  AlertCircle
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

  // Loading state
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Shield className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Authentication Required</h1>
        <p className="text-muted-foreground mt-2">Please sign in to access the admin dashboard.</p>
        <Button className="mt-4" onClick={() => navigate('/auth')}>
          Sign In
        </Button>
      </div>
    );
  }

  // Not an admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You don't have permission to access this page.</p>
        <Button className="mt-4" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
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

      {/* Stats */}
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{users.length}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingVerifications.length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{subscriptions.filter(s => s.status === 'active').length}</p>
                <p className="text-xs text-muted-foreground">Active Subs</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">₦{totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-4">
            <TabsTrigger value="verifications" className="text-xs">
              <CheckCircle className="w-4 h-4 mr-1 hidden sm:inline" />
              Verify
            </TabsTrigger>
            <TabsTrigger value="showcases" className="text-xs">
              <Image className="w-4 h-4 mr-1 hidden sm:inline" />
              Media
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs">
              <Tag className="w-4 h-4 mr-1 hidden sm:inline" />
              Tags
            </TabsTrigger>
            <TabsTrigger value="ads" className="text-xs">
              <Megaphone className="w-4 h-4 mr-1 hidden sm:inline" />
              Ads
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs">
              <Users className="w-4 h-4 mr-1 hidden sm:inline" />
              Users
            </TabsTrigger>
          </TabsList>

          {/* Verifications Tab */}
          <TabsContent value="verifications">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending Verifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : pendingVerifications.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending verifications</p>
                ) : (
                  pendingVerifications.map((user) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{user.full_name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-success border-success hover:bg-success/10"
                          onClick={() => handleApproveVerification(user.user_id)}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive hover:bg-destructive/10"
                          onClick={() => handleRejectVerification(user.user_id)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Showcases Tab */}
          <TabsContent value="showcases">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pending Work Showcases</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : showcases.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending showcases</p>
                ) : (
                  showcases.map((showcase) => (
                    <motion.div
                      key={showcase.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden">
                          {showcase.media_url && (
                            <img
                              src={showcase.media_url}
                              alt="Showcase"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-foreground">{showcase.caption || 'No caption'}</p>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {showcase.media_type}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-success border-success hover:bg-success/10"
                            onClick={() => handleApproveShowcase(showcase.id)}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive hover:bg-destructive/10"
                            onClick={() => handleRejectShowcase(showcase.id)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
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
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        category.is_active ? 'bg-background' : 'bg-muted/50 opacity-60'
                      }`}
                    >
                      <span className="text-sm font-medium text-foreground">{category.name}</span>
                      <Button
                        size="sm"
                        variant={category.is_active ? 'ghost' : 'outline'}
                        onClick={() => handleToggleCategoryActive(category.id, category.is_active)}
                      >
                        {category.is_active ? 'Active' : 'Inactive'}
                      </Button>
                    </div>
                  ))}
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
                      Add
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
                  <p className="text-center text-muted-foreground py-8">No ads created yet</p>
                ) : (
                  ads.map((ad) => (
                    <div
                      key={ad.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-foreground">{ad.title}</p>
                        <Badge variant={ad.is_active ? 'success' : 'outline'} className="mt-1">
                          {ad.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleAdActive(ad.id, ad.is_active)}
                        >
                          {ad.is_active ? 'Pause' : 'Resume'}
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
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Users ({users.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {users.slice(0, 20).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {user.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        user.verification_status === 'verified'
                          ? 'verified'
                          : user.verification_status === 'pending'
                          ? 'warning'
                          : 'outline'
                      }
                    >
                      {user.verification_status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
