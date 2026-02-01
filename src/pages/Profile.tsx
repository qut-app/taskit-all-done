import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Settings, 
  Bell, 
  Shield, 
  CreditCard, 
  HelpCircle, 
  LogOut,
  Star,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import MobileLayout from '@/components/navigation/MobileLayout';
import { useApp } from '@/context/AppContext';

const Profile = () => {
  const navigate = useNavigate();
  const { user, currentRole, switchRole, setUser } = useApp();

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };

  const handleSwitchRole = () => {
    switchRole(currentRole === 'requester' ? 'provider' : 'requester');
  };

  const menuItems = [
    { icon: Settings, label: 'Account Settings', path: '/settings' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Shield, label: 'Verification', path: '/verification' },
    { icon: CreditCard, label: 'Payments & Subscriptions', path: '/payments' },
    { icon: HelpCircle, label: 'Help & Support', path: '/support' },
  ];

  return (
    <MobileLayout>
      {/* Header */}
      <header className="p-4 safe-top">
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
      </header>

      <div className="px-4 pb-4 space-y-6">
        {/* Profile Card */}
        <Card variant="elevated" className="p-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center text-primary font-bold text-2xl">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              {user?.verificationStatus === 'verified' && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-success-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-xl text-foreground">{user?.fullName || 'User'}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={currentRole === 'requester' ? 'soft' : 'softSecondary'}>
                  {currentRole === 'requester' ? 'Requester' : 'Provider'}
                </Badge>
                {user?.verificationStatus === 'pending' && (
                  <Badge variant="warning" className="gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Pending
                  </Badge>
                )}
                {user?.verificationStatus === 'verified' && (
                  <Badge variant="verified" className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Button variant="outline" className="w-full mt-4" onClick={() => navigate('/edit-profile')}>
            Edit Profile
          </Button>
        </Card>

        {/* Role Switch */}
        <Card variant="interactive" className="p-4" onClick={handleSwitchRole}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-secondary-light flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-secondary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Switch Role</h3>
              <p className="text-sm text-muted-foreground">
                Currently: {currentRole === 'requester' ? 'Requester' : 'Service Provider'}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </Card>

        {/* Stats (for providers) */}
        {currentRole === 'provider' && (
          <div className="grid grid-cols-3 gap-3">
            <Card variant="gradient" className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-xl font-bold text-foreground">
                <Star className="w-5 h-5 text-secondary fill-secondary" />
                4.8
              </div>
              <div className="text-xs text-muted-foreground mt-1">Rating</div>
            </Card>
            <Card variant="gradient" className="p-4 text-center">
              <div className="text-xl font-bold text-foreground">124</div>
              <div className="text-xs text-muted-foreground mt-1">Reviews</div>
            </Card>
            <Card variant="gradient" className="p-4 text-center">
              <div className="text-xl font-bold text-success">96%</div>
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
                variant="interactive" 
                className="p-4"
                onClick={() => navigate(item.path)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <span className="flex-1 font-medium text-foreground">{item.label}</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
