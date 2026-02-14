import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Star, CheckCircle, AlertCircle, ChevronRight, RefreshCw, MapPin, Building2,
  Edit3, Camera, Loader2, LogOut, Heart, Users, Megaphone, CreditCard,
  HelpCircle, Bell, Shield, Copy, Share2, Trash2, Wallet, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import MobileLayout from '@/components/navigation/MobileLayout';
import CompanyLayout from '@/components/navigation/CompanyLayout';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useApp } from '@/context/AppContext';
import { VerificationBadge, VerificationStatus } from '@/components/ui/VerificationBadge';
import { useToast } from '@/hooks/use-toast';
import { WorkShowcaseGallery } from '@/components/profile/WorkShowcaseGallery';
import { useNotifications } from '@/hooks/useNotifications';
import { useFavourites } from '@/hooks/useFavourites';
import { useReferrals } from '@/hooks/useReferrals';
import { usePaystackPayment } from '@/hooks/usePaystackPayment';
import { useFeedback } from '@/hooks/useFeedback';
import { AdManagerTab } from '@/components/profile/AdManagerTab';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

const Profile = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  const { user, signOut } = useAuth();
  const { profile, providerProfile, loading, updateProfile, updateProviderProfile, refetch } = useProfile();
  const { currentRole, switchRole } = useApp();
  const { toast } = useToast();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const { favourites, loading: favLoading, removeFavourite } = useFavourites();
  const { referralLink, referredProviders, referredRequesters, totalRewardsEarned } = useReferrals();
  const { initializePayment, loading: paymentLoading } = usePaystackPayment();
  const { submitFeedback, submitting: feedbackSubmitting, canSubmit: canSubmitFeedback, FEEDBACK_CATEGORIES } = useFeedback();

  const [isEditing, setIsEditing] = useState(false);
  const [feedbackCategory, setFeedbackCategory] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackFile, setFeedbackFile] = useState<File | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    location: '',
    company_name: '',
    company_address: '',
    service_description: '',
    gender: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const { roleSwitchCooldown, isActionRestricted } = useApp();

  const handleSwitchRole = async () => {
    const newRole = currentRole === 'requester' ? 'provider' : 'requester';
    const result = await switchRole(newRole);
    if (result.error) {
      toast({ title: 'Cannot switch role', description: result.error, variant: 'destructive' });
    } else {
      toast({ 
        title: 'Role switched successfully', 
        description: isActionRestricted 
          ? 'Some actions are temporarily limited for security.' 
          : `You are now a ${newRole === 'requester' ? 'Job Giver' : 'Service Provider'}` 
      });
    }
  };

  const startEditing = () => {
    setEditForm({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      location: profile?.location || '',
      company_name: profile?.company_name || '',
      company_address: profile?.company_address || '',
      service_description: providerProfile?.service_description || '',
      gender: profile?.gender || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const profileUpdates: any = {
      full_name: editForm.full_name,
      phone: editForm.phone,
      location: editForm.location,
    };
    if (!isCompany && editForm.gender) {
      profileUpdates.gender = editForm.gender;
    }
    if (profile?.account_type === 'company') {
      profileUpdates.company_name = editForm.company_name;
      profileUpdates.company_address = editForm.company_address;
    }

    const { error } = await updateProfile(profileUpdates);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      if (isProvider && providerProfile && editForm.service_description !== providerProfile.service_description) {
        await updateProviderProfile({ service_description: editForm.service_description });
      }
      toast({ title: 'Profile updated!' });
      setIsEditing(false);
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max file size is 5MB', variant: 'destructive' });
      setUploadingAvatar(false);
      return;
    }
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Please use JPG, PNG, WEBP, or GIF', variant: 'destructive' });
      setUploadingAvatar(false);
      return;
    }
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/avatars/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('user-media')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('user-media')
        .getPublicUrl(filePath);

      await updateProfile({ avatar_url: publicUrl });
      await refetch();
      toast({ title: 'Avatar updated!' });
    }
    setUploadingAvatar(false);
  };

  const handleSubscribe = (subscriptionType: string, amount: number) => {
    initializePayment({
      amount,
      subscriptionType,
      onSuccess: (ref) => {
        refetch();
        toast({ title: 'Subscription activated!', description: `Reference: ${ref}` });
      },
    });
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: 'Copied!', description: 'Referral link copied to clipboard' });
  };

  if (loading || !profile) {
    return (
      <MobileLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileLayout>
    );
  }

  const isCompany = profile.account_type === 'company';
  const isProvider = currentRole === 'provider';
  const displayName = isCompany ? profile.company_name : profile.full_name;

  const Layout = isCompany ? CompanyLayout : MobileLayout;

  const faqItems = [
    { q: 'How do I get verified?', a: 'Go to the Verify tab and submit your identity documents. Our team reviews submissions within 24-48 hours.' },
    { q: 'How does payment work?', a: 'Payments are processed through Paystack. Funds are held in escrow until the job is completed and approved.' },
    { q: 'How do I switch roles?', a: 'Individual accounts can switch between Job Giver and Service Provider roles with a 24-hour cooldown period.' },
    { q: 'What are job slots?', a: 'Job slots limit how many active jobs you can have simultaneously. Upgrade your plan to get more slots.' },
    { q: 'How do referrals work?', a: 'Share your unique referral link. When someone signs up, verifies their account, and selects a role, the referral counts. Refer 4 Service Providers for +1 Job Slot, or 3 Job Givers for +1 Hiring Slot.' },
  ];

  return (
    <Layout>
      {/* Profile Header */}
      <header className="p-4 safe-top flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        {!isEditing ? (
          <Button variant="ghost" size="sm" onClick={startEditing} className="gap-1">
            <Edit3 className="w-4 h-4" />
            Edit
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        )}
      </header>

      <div className="px-4 pb-4 space-y-4">
        {/* Profile Card */}
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              {profile.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt="Avatar" 
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl ${
                  isCompany ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'
                }`}>
                  {isCompany ? <Building2 className="w-8 h-8" /> : displayName?.charAt(0) || 'U'}
                </div>
              )}
              {/* Verified badge removed from avatar to prevent overlap */}
              {/* Camera icon - bottom right */}
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg z-10">
                {uploadingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 text-primary-foreground animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-primary-foreground" />
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            </div>
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={editForm.full_name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Full Name"
                  />
                  {isCompany && (
                    <Input
                      value={editForm.company_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="Company Name"
                    />
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-xl text-foreground">{displayName || 'User'}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={currentRole === 'requester' ? 'default' : 'secondary'}>
                  {currentRole === 'requester' ? 'Job Giver' : 'Service Provider'}
                </Badge>
                <VerificationBadge
                  status={profile.verification_status as any}
                  accountType={isCompany ? 'company' : 'individual'}
                  size="sm"
                />
                {profile.verification_status === 'pending' && (
                  <Badge variant="outline" className="gap-1 text-warning border-warning">
                    <AlertCircle className="w-3 h-3" />
                    Pending
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Editable fields */}
          {isEditing && (
            <div className="mt-4 space-y-3 pt-4 border-t border-border">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input value={editForm.phone} onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="Phone number" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Location</label>
                <Input value={editForm.location} onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))} placeholder="Your location" />
              </div>
              {!isCompany && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Gender</label>
                  <div className="flex gap-2 mt-1">
                    {(['Male', 'Female'] as const).map(g => (
                      <Button
                        key={g}
                        type="button"
                        variant={editForm.gender === g ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setEditForm(prev => ({ ...prev, gender: g }))}
                      >
                        {g}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {isCompany && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Company Address</label>
                  <Input value={editForm.company_address} onChange={(e) => setEditForm(prev => ({ ...prev, company_address: e.target.value }))} placeholder="Company address" />
                </div>
              )}
              {isProvider && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Service Description</label>
                  <Textarea value={editForm.service_description} onChange={(e) => setEditForm(prev => ({ ...prev, service_description: e.target.value }))} placeholder="Describe your services..." rows={3} />
                </div>
              )}
            </div>
          )}

          {/* Display info when not editing */}
          {!isEditing && (
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              {profile.phone && <p className="text-sm text-muted-foreground">📞 {profile.phone}</p>}
              {profile.location && <p className="text-sm text-muted-foreground">📍 {profile.location}</p>}
              {isProvider && providerProfile?.service_description && (
                <p className="text-sm text-muted-foreground">{providerProfile.service_description}</p>
              )}
            </div>
          )}
        </Card>

        {/* Tabs */}
        <Tabs defaultValue={initialTab} className="w-full">
          <ScrollArea className="w-full">
            <TabsList className="w-max gap-1 bg-muted/50 px-1">
              <TabsTrigger value="profile" className="text-xs">Profile</TabsTrigger>
              <TabsTrigger value="foryou" className="text-xs">For You</TabsTrigger>
              <TabsTrigger value="favourites" className="text-xs">Favorites</TabsTrigger>
              <TabsTrigger value="referrals" className="text-xs">Referrals</TabsTrigger>
              <TabsTrigger value="wallet" className="text-xs">Wallet</TabsTrigger>
              <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>
              <TabsTrigger value="alerts" className="text-xs">
                Alerts
                {unreadCount > 0 && (
                  <span className="ml-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full inline-flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="help" className="text-xs">Help</TabsTrigger>
              <TabsTrigger value="feedback" className="text-xs">Feedback</TabsTrigger>
              <TabsTrigger value="ads" className="text-xs">Ad Manager</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* ===== PROFILE TAB ===== */}
          <TabsContent value="profile" className="space-y-4">
            {/* Role Switch (individuals only) */}
            {!isCompany && (
              <Card 
                className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${roleSwitchCooldown > 0 ? 'opacity-60' : ''}`} 
                onClick={handleSwitchRole}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">Switch Role</h3>
                    <p className="text-sm text-muted-foreground">Currently: {currentRole === 'requester' ? 'Job Giver' : 'Service Provider'}</p>
                    {roleSwitchCooldown > 0 && (
                      <p className="text-xs text-warning mt-1">
                        ⏱ Cooldown: {Math.floor(roleSwitchCooldown / 3600)}h {Math.floor((roleSwitchCooldown % 3600) / 60)}m remaining
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
            )}

            {/* Provider Stats */}
            {isProvider && providerProfile && (
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-4 text-center bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="text-2xl font-bold text-primary">{providerProfile.active_job_slots || 0}/{providerProfile.max_job_slots || 3}</div>
                  <div className="text-xs text-muted-foreground mt-1">Active Slots</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-2xl font-bold text-foreground">{providerProfile.rating || 0}</span>
                    <Star className="w-4 h-4 text-warning fill-warning" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Rating</div>
                </Card>
                <Card className="p-4 text-center bg-gradient-to-br from-success/5 to-transparent">
                  <div className="text-2xl font-bold text-success">{providerProfile.on_time_delivery_score || 100}%</div>
                  <div className="text-xs text-muted-foreground mt-1">On-Time</div>
                </Card>
              </div>
            )}

            {/* Requester Stats */}
            {!isProvider && (
              <div className="grid grid-cols-3 gap-3">
                <Card className="p-4 text-center bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="text-2xl font-bold text-primary">{profile.requester_active_slots || 0}/{profile.requester_max_slots || 3}</div>
                  <div className="text-xs text-muted-foreground mt-1">Active Jobs</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-2xl font-bold text-foreground">{profile.requester_completed_jobs || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">Completed</div>
                </Card>
                <Card className="p-4 text-center bg-gradient-to-br from-success/5 to-transparent">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-2xl font-bold text-success">{profile.requester_rating || 0}</span>
                    <Star className="w-4 h-4 text-warning fill-warning" />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Rating</div>
                </Card>
              </div>
            )}

            {/* Verification Status */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Verification</h3>
                    <p className="text-xs text-muted-foreground">Identity verification status</p>
                  </div>
                </div>
                <VerificationStatus status={profile.verification_status as any} />
              </div>
            </Card>

            {/* Work Showcase (Provider only) */}
            {isProvider && providerProfile && (
              <WorkShowcaseGallery providerProfileId={providerProfile.id} isOwner={true} />
            )}

            {/* Logout */}
            <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>
              <LogOut className="w-5 h-5 mr-2" />
              Log Out
            </Button>
          </TabsContent>

          {/* ===== FOR YOU TAB ===== */}
          <TabsContent value="foryou" className="space-y-4">
            <Card className="p-5">
              <h3 className="font-semibold text-foreground mb-3">Personalized Insights</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
                  <Star className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Your Rating</p>
                    <p className="text-xs text-muted-foreground">
                      {isProvider ? `${providerProfile?.rating || 0} stars from ${providerProfile?.review_count || 0} reviews` :
                        `${profile.requester_rating || 0} stars from ${profile.requester_review_count || 0} reviews`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-success/5">
                  <CheckCircle className="w-5 h-5 text-success" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Jobs Completed</p>
                    <p className="text-xs text-muted-foreground">{profile.requester_completed_jobs || 0} total completed jobs</p>
                  </div>
                </div>
                {isProvider && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/5">
                    <MapPin className="w-5 h-5 text-warning" />
                    <div>
                      <p className="text-sm font-medium text-foreground">On-Time Delivery</p>
                      <p className="text-xs text-muted-foreground">{providerProfile?.on_time_delivery_score || 100}% on-time rate</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* ===== FAVOURITES TAB ===== */}
          <TabsContent value="favourites" className="space-y-3">
            {favLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : favourites.length === 0 ? (
              <Card className="p-8 text-center">
                <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No favourites yet</p>
                <p className="text-xs text-muted-foreground mt-1">Save providers or requesters to find them quickly</p>
              </Card>
            ) : (
              favourites.map((fav) => (
                <Card key={fav.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={fav.profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {fav.profile?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground text-sm">
                        {fav.profile?.account_type === 'company' ? fav.profile?.company_name : fav.profile?.full_name || 'User'}
                      </h4>
                      {fav.profile?.location && (
                        <p className="text-xs text-muted-foreground">📍 {fav.profile.location}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeFavourite(fav.favourite_user_id)} className="text-destructive">
                      <Heart className="w-4 h-4 fill-current" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ===== REFERRALS TAB ===== */}
          <TabsContent value="referrals" className="space-y-4">
            {/* Referral Link */}
            <Card className="p-5">
              <h3 className="font-semibold text-foreground mb-2">🔗 Your Referral Link</h3>
              <p className="text-xs text-muted-foreground mb-3">Share this link to invite people and earn slot rewards.</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted/50 rounded-lg p-3 text-xs font-mono text-foreground truncate">
                  {referralLink}
                </div>
                <Button variant="outline" size="icon" onClick={copyReferralLink}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: 'Join TaskIt', text: `Sign up using my link: ${referralLink}`, url: referralLink });
                  } else {
                    copyReferralLink();
                  }
                }}>
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Progress */}
            <h3 className="font-semibold text-foreground">📊 Referral Progress</h3>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Service Providers Referred</p>
                <div className="text-2xl font-bold text-primary">{referredProviders % 4} / 4</div>
                <p className="text-[10px] text-muted-foreground mt-1">+1 Job Slot at 4</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Job Givers Referred</p>
                <div className="text-2xl font-bold text-secondary">{referredRequesters % 3} / 3</div>
                <p className="text-[10px] text-muted-foreground mt-1">+1 Hiring Slot at 3</p>
              </Card>
            </div>

            {/* Rewards */}
            <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground text-sm">🎁 Rewards Earned</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{totalRewardsEarned} extra slot{totalRewardsEarned !== 1 ? 's' : ''} unlocked</p>
                </div>
                <div className="text-3xl font-bold text-primary">{totalRewardsEarned}</div>
              </div>
            </Card>

            {/* Totals */}
            <Card className="p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Providers Referred</span>
                <span className="font-semibold text-foreground">{referredProviders}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Total Job Givers Referred</span>
                <span className="font-semibold text-foreground">{referredRequesters}</span>
              </div>
            </Card>
          </TabsContent>

          {/* ===== WALLET TAB ===== */}
          <TabsContent value="wallet" className="space-y-4">
            <WalletSection userId={user?.id} walletBalance={profile?.wallet_balance} />
          </TabsContent>

          {/* ===== PAYMENTS TAB ===== */}
          <TabsContent value="payments" className="space-y-4">
            <h3 className="font-semibold text-foreground">Subscription Plans</h3>

            {/* Individual Plans */}
            {!isCompany && (
              <div className="space-y-3">
                {/* Provider Slot Boost */}
                {isProvider && (
                  <Card className="p-4 border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-foreground">Slot Boost</h4>
                      <Badge>₦4,500/month</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Get extra job slots and priority in discovery.</p>
                    <Button className="w-full" size="sm" disabled={paymentLoading} onClick={() => handleSubscribe('provider_slot_boost', 4500)}>
                      {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      Subscribe Now
                    </Button>
                  </Card>
                )}

                {/* Requester Unlimited */}
                {!isProvider && (
                  <Card className="p-4 border-secondary/20">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-foreground">Unlimited Hiring</h4>
                      <Badge variant="secondary">₦7,500/month</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Unlimited job postings, priority support, and ad-free experience.</p>
                    <Button className="w-full" size="sm" variant="secondary" disabled={paymentLoading} onClick={() => handleSubscribe('requester_unlimited', 7500)}>
                      {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      Subscribe Now
                    </Button>
                  </Card>
                )}
              </div>
            )}

            {/* Company Plans */}
            {isCompany && (
              <div className="space-y-3">
                <Card className="p-4 border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-foreground">Business Plan</h4>
                    <Badge>₦25,000/month</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Essential hiring tools, up to 10 active jobs.</p>
                  <Button className="w-full" size="sm" disabled={paymentLoading} onClick={() => handleSubscribe('requester_unlimited', 25000)}>
                    {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Subscribe Now
                  </Button>
                </Card>
                <Card className="p-4 border-secondary/20 bg-gradient-to-br from-secondary/5 to-transparent">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-foreground">Professional Plan</h4>
                    <Badge variant="secondary">₦50,000/month</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Full access including service rendering, unlimited jobs, and premium support.</p>
                  <Button className="w-full" size="sm" variant="secondary" disabled={paymentLoading} onClick={() => handleSubscribe('requester_unlimited', 50000)}>
                    {paymentLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Subscribe Now
                  </Button>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ===== ALERTS TAB ===== */}
          <TabsContent value="alerts" className="space-y-3">
            {unreadCount > 0 && (
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs">Mark all read</Button>
              </div>
            )}
            {notifications.length === 0 ? (
              <Card className="p-8 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No notifications yet</p>
              </Card>
            ) : (
              notifications.map((n) => (
                <Card key={n.id} className={`p-4 cursor-pointer transition-colors ${!n.is_read ? 'bg-primary/5 border-primary/20' : ''}`}
                  onClick={() => !n.is_read && markAsRead(n.id)}>
                  <div className="flex items-start gap-3">
                    {!n.is_read && <div className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0" />}
                    <div className="flex-1">
                      <p className="font-medium text-foreground text-sm">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ===== HELP TAB ===== */}
          <TabsContent value="help" className="space-y-3">
            <h3 className="font-semibold text-foreground">Frequently Asked Questions</h3>
            {faqItems.map((item, i) => (
              <Card key={i} className="p-4">
                <h4 className="font-medium text-foreground text-sm mb-2">{item.q}</h4>
                <p className="text-xs text-muted-foreground">{item.a}</p>
              </Card>
            ))}
          </TabsContent>

          {/* ===== AD MANAGER TAB ===== */}
          {/* ===== FEEDBACK TAB ===== */}
          <TabsContent value="feedback" className="space-y-4">
            <Card className="p-5">
              <h3 className="font-semibold text-lg text-foreground mb-1">Help us improve QUT</h3>
              <p className="text-sm text-muted-foreground mb-4">Your feedback helps us build a better experience.</p>

              {feedbackSuccess ? (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                  <p className="font-semibold text-foreground">Thank you. Your feedback has been sent.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => { setFeedbackSuccess(false); setFeedbackCategory(''); setFeedbackMessage(''); setFeedbackFile(null); }}>
                    Send Another
                  </Button>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                    <select
                      value={feedbackCategory}
                      onChange={(e) => setFeedbackCategory(e.target.value)}
                      className="flex h-12 w-full rounded-lg border border-input bg-background px-4 py-3 text-base transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:outline-none"
                    >
                      <option value="">Select a category...</option>
                      {FEEDBACK_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Message (20–300 words)</label>
                    <Textarea
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Tell us what's on your mind..."
                      rows={5}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {feedbackMessage.trim().split(/\s+/).filter(Boolean).length} / 300 words
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Attachment (optional)</label>
                    <Input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => setFeedbackFile(e.target.files?.[0] || null)}
                    />
                  </div>

                  <Button
                    className="w-full"
                    disabled={
                      feedbackSubmitting ||
                      !feedbackCategory ||
                      feedbackMessage.trim().split(/\s+/).filter(Boolean).length < 20 ||
                      feedbackMessage.trim().split(/\s+/).filter(Boolean).length > 300 ||
                      !canSubmitFeedback
                    }
                    onClick={async () => {
                      const { error } = await submitFeedback({
                        category: feedbackCategory,
                        message: feedbackMessage,
                        role: currentRole,
                        attachmentFile: feedbackFile,
                      });
                      if (!error) {
                        setFeedbackSuccess(true);
                      } else if (error.message !== 'Rate limited') {
                        toast({ title: 'Error', description: 'Failed to submit feedback. Please try again.', variant: 'destructive' });
                      }
                    }}
                  >
                    {feedbackSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Submit Feedback
                  </Button>
                  {!canSubmitFeedback && (
                    <p className="text-xs text-muted-foreground text-center">Please wait 2 minutes between submissions.</p>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="ads" className="space-y-4">
            <AdManagerTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

// Wallet Section Component
const WalletSection = ({ userId, walletBalance }: { userId?: string; walletBalance?: number | null }) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchData = () => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]).then(([txRes, wdRes]) => {
      setTransactions(txRes.data || []);
      setWithdrawals(wdRes.data || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const handleWithdraw = async () => {
    if (!userId) return;
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      toast({ title: 'Invalid amount', description: 'Enter a valid withdrawal amount.', variant: 'destructive' });
      return;
    }
    if (amount > (walletBalance || 0)) {
      toast({ title: 'Insufficient balance', description: 'You cannot withdraw more than your wallet balance.', variant: 'destructive' });
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      toast({ title: 'Missing details', description: 'Please fill in all bank details.', variant: 'destructive' });
      return;
    }
    if (accountNumber.trim().length < 10) {
      toast({ title: 'Invalid account number', description: 'Account number must be at least 10 digits.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('withdrawal_requests').insert({
      user_id: userId,
      amount,
      bank_name: bankName.trim(),
      account_number: accountNumber.trim(),
      account_name: accountName.trim(),
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to submit withdrawal request. Please try again.', variant: 'destructive' });
    } else {
      toast({ title: 'Request submitted!', description: 'Your withdrawal request is being reviewed.' });
      setShowWithdrawForm(false);
      setWithdrawAmount('');
      setBankName('');
      setAccountNumber('');
      setAccountName('');
      fetchData();
    }
    setSubmitting(false);
  };

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);

  const sourceLabels: Record<string, string> = {
    escrow_release: 'Escrow Release',
    escrow_hold: 'Escrow Hold',
    refund: 'Refund',
    withdrawal: 'Withdrawal',
    commission: 'Platform Commission',
  };

  const statusStyles: Record<string, string> = {
    pending: 'bg-warning/10 text-warning',
    approved: 'bg-primary/10 text-primary',
    processed: 'bg-emerald-500/10 text-emerald-600',
    rejected: 'bg-destructive/10 text-destructive',
  };

  const hasPendingWithdrawal = withdrawals.some(w => w.status === 'pending');

  return (
    <>
      {/* Balance Card */}
      <Card className="p-5 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center gap-3 mb-1">
          <Wallet className="w-5 h-5 text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Wallet Balance</p>
        </div>
        <p className="text-3xl font-bold text-foreground">{formatAmount(walletBalance || 0)}</p>
        <Button
          className="mt-3 w-full gap-2"
          size="sm"
          disabled={(walletBalance || 0) <= 0 || hasPendingWithdrawal}
          onClick={() => setShowWithdrawForm(true)}
        >
          <ArrowUpRight className="w-4 h-4" />
          {hasPendingWithdrawal ? 'Withdrawal Pending...' : 'Request Withdrawal'}
        </Button>
      </Card>

      {/* Withdrawal Form */}
      {showWithdrawForm && (
        <Card className="p-4 space-y-3 border-primary/20">
          <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Withdrawal Details
          </h4>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Amount (₦)</label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">Available: {formatAmount(walletBalance || 0)}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Bank Name</label>
            <Input
              placeholder="e.g. Access Bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Account Number</label>
            <Input
              placeholder="10-digit account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Account Name</label>
            <Input
              placeholder="Account holder name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowWithdrawForm(false)}>Cancel</Button>
            <Button size="sm" className="flex-1" disabled={submitting} onClick={handleWithdraw}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Submit Request
            </Button>
          </div>
        </Card>
      )}

      {/* Withdrawal Requests */}
      {withdrawals.length > 0 && (
        <>
          <h4 className="font-semibold text-foreground text-sm">Withdrawal Requests</h4>
          <div className="space-y-2">
            {withdrawals.map((wd) => (
              <Card key={wd.id} className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{wd.bank_name} • {wd.account_number}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusStyles[wd.status] || ''}`}>
                      {wd.status.charAt(0).toUpperCase() + wd.status.slice(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(wd.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-foreground shrink-0">{formatAmount(wd.amount)}</p>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Transaction History */}
      <h4 className="font-semibold text-foreground text-sm">Transaction History</h4>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : transactions.length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No transactions yet</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx) => (
            <Card key={tx.id} className="p-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                tx.type === 'credit' ? 'bg-emerald-500/10' : 'bg-destructive/10'
              }`}>
                {tx.type === 'credit' ? (
                  <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-destructive" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {sourceLabels[tx.source] || tx.source}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                </p>
              </div>
              <p className={`text-sm font-semibold shrink-0 ${
                tx.type === 'credit' ? 'text-emerald-500' : 'text-destructive'
              }`}>
                {tx.type === 'credit' ? '+' : '-'}{formatAmount(tx.amount)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </>
  );
};

export default Profile;
