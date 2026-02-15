import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2, CheckCircle, CreditCard, ArrowRight, LogOut, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SUBSCRIPTION_PLANS, formatNaira } from '@/config/subscriptionConfig';
import { usePaystackPayment } from '@/hooks/usePaystackPayment';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const CompanyUpgrade = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const { initializePayment, loading: paymentLoading } = usePaystackPayment();
  const { toast } = useToast();

  const plans = [
    {
      key: 'company_business' as const,
      ...SUBSCRIPTION_PLANS.company_business,
      features: ['Up to 10 active jobs', 'View applicants', 'Basic analytics', 'Messaging'],
      popular: false,
    },
    {
      key: 'company_professional' as const,
      ...SUBSCRIPTION_PLANS.company_professional,
      features: ['Unlimited active jobs', 'Priority applicants', 'Full analytics', 'Messaging', 'Ad creation', 'Premium support'],
      popular: true,
    },
  ];

  const handleSubscribe = (plan: typeof plans[0]) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    initializePayment({
      amount: plan.price,
      subscriptionType: plan.type,
      onSuccess: async (reference) => {
        await updateProfile({
          company_plan: plan.key,
          company_plan_started_at: new Date().toISOString(),
          company_trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
        toast({ title: 'Subscription activated!', description: `Your ${plan.name} is now active.` });
        navigate('/company-dashboard');
      },
      onCancel: () => {
        toast({ title: 'Payment cancelled', description: 'You can subscribe anytime.' });
      },
    });
  };

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <header className="p-4 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">Upgrade Your Plan</h1>
              <p className="text-xs text-muted-foreground">Subscribe to unlock company features</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <Home className="w-4 h-4 mr-1" /> Home
            </Button>
            <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate('/'); }}>
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="px-4 pb-8 space-y-4">
        {plans.map((plan) => (
          <motion.div
            key={plan.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
          >
            <Card className={`p-6 relative ${plan.popular ? 'border-2 border-primary' : ''}`}>
              {plan.popular && (
                <Badge className="absolute -top-3 right-4 bg-primary text-primary-foreground">
                  Most Popular
                </Badge>
              )}
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-6 h-6 text-primary" />
                <div>
                  <h3 className="font-semibold text-foreground text-lg">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-foreground">{formatNaira(plan.price)}</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.popular ? 'default' : 'outline'}
                disabled={paymentLoading}
                onClick={() => handleSubscribe(plan)}
              >
                Subscribe Now <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          </motion.div>
        ))}

        <p className="text-xs text-muted-foreground text-center mt-4">
          All plans include a 7-day trial. Cancel anytime.
        </p>
      </div>
    </div>
  );
};

export default CompanyUpgrade;
