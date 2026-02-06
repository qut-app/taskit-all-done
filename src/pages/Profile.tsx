import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Settings, Bell, Shield, CreditCard, HelpCircle, LogOut,
  Star, CheckCircle, AlertCircle, ChevronRight, RefreshCw, MapPin, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MobileLayout from '@/components/navigation/MobileLayout';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useApp } from '@/context/AppContext';
import { VerificationBadge } from '@/components/ui/VerificationBadge';
import { useToast } from '@/hooks/use-toast';

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, providerProfile, loading } = useProfile();
  const { currentRole, switchRole } = useApp();
  const { toast } = useToast();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const handleSwitchRole = async () => {
    const newRole = currentRole === 'requester' ? 'provider' : 'requester';
    await switchRole(newRole);
    toast({ title: 'Role switched', description: `You are now a ${newRole === 'requester' ? 'Job Giver' : 'Service Provider'}` });
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
      <header className="p-4 safe-top">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
      </header>

      <div className="px-4 pb-4 space-y-6">
        {/* Profile Card */}
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl ${
                isCompany ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'
              }`}>
                {isCompany ? <Building2 className="w-8 h-8" /> : displayName?.charAt(0) || 'U'}
              </div>
              {profile.verification_status === 'verified' && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-success-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xl text-foreground">{displayName || 'User'}</h2>
                <VerificationBadge 
                  status={profile.verification_status as any} 
                  accountType={isCompany ? 'company' : 'individual'}
                  size="sm"
                />
              </div>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
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
