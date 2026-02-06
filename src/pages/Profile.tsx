import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Settings, Bell, Shield, CreditCard, HelpCircle, LogOut,
  Star, CheckCircle, AlertCircle, ChevronRight, RefreshCw, MapPin, Building2,
  Edit3, Camera, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import MobileLayout from '@/components/navigation/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useApp } from '@/context/AppContext';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { useToast } from '@/hooks/use-toast';
import { WorkShowcaseGallery } from '@/components/profile/WorkShowcaseGallery';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, providerProfile, loading, updateProfile, updateProviderProfile, refetch } = useProfile();
  const { currentRole, switchRole } = useApp();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    location: '',
    company_name: '',
    company_address: '',
    service_description: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleSwitchRole = async () => {
    const newRole = currentRole === 'requester' ? 'provider' : 'requester';
    await switchRole(newRole);
    toast({ title: 'Role switched', description: `You are now a ${newRole === 'requester' ? 'Job Giver' : 'Service Provider'}` });
  };

  const startEditing = () => {
    setEditForm({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      location: profile?.location || '',
      company_name: profile?.company_name || '',
      company_address: profile?.company_address || '',
      service_description: providerProfile?.service_description || '',
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
    const fileExt = file.name.split('.').pop();
    const filePath = `avatars/${user.id}/avatar.${fileExt}`;

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

  const menuItems = [
    { icon: Bell, label: 'Notifications', path: '/notifications', comingSoon: true },
    { icon: Shield, label: 'Verification', path: '/verification', comingSoon: true },
    { icon: CreditCard, label: 'Payments & Subscriptions', path: '/payments', comingSoon: true },
    { icon: MapPin, label: 'Location Settings', path: '/location', comingSoon: true },
    { icon: HelpCircle, label: 'Help & Support', path: '/support', comingSoon: true },
  ];

  return (
    <MobileLayout>
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

      <div className="px-4 pb-4 space-y-6">
        {/* Profile Card */}
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
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
              {profile.verification_status === 'verified' && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-success-foreground" />
                </div>
              )}
              {/* Avatar upload button */}
              <label className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg">
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
                    <VerificationBadge 
                      status={profile.verification_status as any} 
                      accountType={isCompany ? 'company' : 'individual'}
                      size="sm"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={currentRole === 'requester' ? 'default' : 'secondary'}>
                  {currentRole === 'requester' ? 'Job Giver' : 'Service Provider'}
                </Badge>
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
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Location</label>
                <Input
                  value={editForm.location}
                  onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Your location"
                />
              </div>
              {isCompany && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Company Address</label>
                  <Input
                    value={editForm.company_address}
                    onChange={(e) => setEditForm(prev => ({ ...prev, company_address: e.target.value }))}
                    placeholder="Company address"
                  />
                </div>
              )}
              {isProvider && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Service Description</label>
                  <Textarea
                    value={editForm.service_description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, service_description: e.target.value }))}
                    placeholder="Describe your services..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          {/* Display info when not editing */}
          {!isEditing && (
            <div className="mt-4 pt-4 border-t border-border space-y-2">
              {profile.phone && (
                <p className="text-sm text-muted-foreground">📞 {profile.phone}</p>
              )}
              {profile.location && (
                <p className="text-sm text-muted-foreground">📍 {profile.location}</p>
              )}
              {isProvider && providerProfile?.service_description && (
                <p className="text-sm text-muted-foreground">{providerProfile.service_description}</p>
              )}
            </div>
          )}
        </Card>

        {/* Role Switch */}
        <Card className="p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleSwitchRole}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-secondary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Switch Role</h3>
              <p className="text-sm text-muted-foreground">
                Currently: {currentRole === 'requester' ? 'Job Giver' : 'Service Provider'}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </Card>

        {/* Provider Stats */}
        {isProvider && providerProfile && (
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center bg-gradient-to-br from-primary/5 to-transparent">
              <div className="text-2xl font-bold text-primary">
                {providerProfile.active_job_slots || 0}/{providerProfile.max_job_slots || 3}
              </div>
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
              <div className="text-2xl font-bold text-primary">
                {(profile as any).requester_active_slots || 0}/{(profile as any).requester_max_slots || 3}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Active Jobs</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="text-2xl font-bold text-foreground">
                {(profile as any).requester_completed_jobs || 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Completed</div>
            </Card>
            <Card className="p-4 text-center bg-gradient-to-br from-success/5 to-transparent">
              <div className="flex items-center justify-center gap-1">
                <span className="text-2xl font-bold text-success">{(profile as any).requester_rating || 0}</span>
                <Star className="w-4 h-4 text-warning fill-warning" />
              </div>
              <div className="text-xs text-muted-foreground mt-1">Rating</div>
            </Card>
          </div>
        )}

        {/* Work Showcase (Provider only) */}
        {isProvider && providerProfile && (
          <WorkShowcaseGallery
            providerProfileId={providerProfile.id}
            isOwner={true}
          />
        )}

        {/* Menu */}
        <div className="space-y-2">
          {menuItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  if (item.comingSoon) {
                    toast({ title: 'Coming Soon', description: `${item.label} will be available soon!` });
                  } else {
                    navigate(item.path);
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className="flex-1 font-medium text-foreground">{item.label}</span>
                  {item.comingSoon ? (
                    <Badge variant="outline" className="text-xs">Soon</Badge>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Logout */}
        <Button
          variant="ghost"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Log Out
        </Button>
      </div>
    </MobileLayout>
  );
};

export default Profile;
