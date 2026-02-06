import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Users, ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';

const RoleSelect = () => {
  const navigate = useNavigate();
  const { switchRole } = useApp();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  const handleSelectRole = async (role: 'requester' | 'provider') => {
    await switchRole(role);
    if (role === 'provider') {
      navigate('/onboarding');
    } else {
      navigate('/onboarding');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-4 safe-top">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">Q</span>
          </div>
          <span className="font-bold text-xl text-foreground">QUT</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col justify-center px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">How would you like to use QUT?</h1>
          <p className="text-muted-foreground mt-2">You can switch roles anytime from settings</p>
        </motion.div>

        <div className="space-y-4">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            <Card
              className="p-6 border-2 border-transparent hover:border-primary cursor-pointer transition-all"
              onClick={() => handleSelectRole('requester')}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Briefcase className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl text-foreground">I Need Help</h3>
                  <p className="text-muted-foreground mt-1">Post jobs and hire verified service providers</p>
                </div>
                <ArrowRight className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">Post unlimited jobs</span>
                <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">Browse providers</span>
                <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">Secure payments</span>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <Card
              className="p-6 border-2 border-transparent hover:border-secondary cursor-pointer transition-all"
              onClick={() => handleSelectRole('provider')}
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center">
                  <Users className="w-8 h-8 text-secondary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl text-foreground">I Offer Services</h3>
                  <p className="text-muted-foreground mt-1">Find clients and grow your business</p>
                </div>
                <ArrowRight className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">3 free job slots</span>
                <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">Build reputation</span>
                <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">Get paid securely</span>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      <div className="p-6 text-center safe-bottom">
        <p className="text-sm text-muted-foreground">
          Need help? <Button variant="link" className="px-1">Contact Support</Button>
        </p>
      </div>
    </div>
  );
};

export default RoleSelect;
