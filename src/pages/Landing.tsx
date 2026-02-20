import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Users, Briefcase, Shield, Zap, Building2, User, Star, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Landing = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // If user is already authenticated (e.g. Google OAuth redirect), route them properly
  useEffect(() => {
    if (authLoading || !user) return;
    const checkAndRedirect = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, account_type, active_role, location, gender')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile || !profile.onboarding_completed || !profile.account_type || !profile.active_role || !profile.location ||
          (profile.account_type === 'individual' && !profile.gender)) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    };
    checkAndRedirect();
  }, [user, authLoading, navigate]);

  const features = [
    {
      icon: Shield,
      title: 'Verified Users',
      description: 'All individuals and companies are manually verified for trust',
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      icon: Users,
      title: 'Connect Instantly',
      description: 'Find skilled providers or eager clients in seconds',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: Zap,
      title: 'Quick Delivery',
      description: 'Get jobs done fast with our efficient matching system',
      color: 'text-warning',
      bg: 'bg-warning/10',
    },
  ];

  const stats = [
    { value: '5K+', label: 'Verified Users' },
    { value: '10K+', label: 'Jobs Completed' },
    { value: '4.9', label: 'Avg Rating', icon: Star },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Hero Section */}
      <div className="relative min-h-[85vh] flex flex-col">
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        
        {/* Animated Circles */}
        <motion.div 
          className="absolute top-20 right-10 w-64 h-64 rounded-full bg-primary/5 blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 20, 0],
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-40 left-10 w-48 h-48 rounded-full bg-secondary/5 blur-3xl"
          animate={{ 
            scale: [1, 1.3, 1],
            y: [0, -20, 0],
          }}
          transition={{ duration: 6, repeat: Infinity, delay: 1 }}
        />

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between p-4 safe-top">
          <motion.div 
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
              <span className="text-primary-foreground font-bold text-lg">Q</span>
            </div>
            <span className="font-bold text-xl text-foreground">QUT</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </motion.div>
        </header>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div variants={itemVariants}>
              <Badge className="mb-4 px-4 py-1.5 text-sm bg-primary/10 text-primary border-0">
                🚀 Nigeria's #1 Service Marketplace
              </Badge>
            </motion.div>
            
            <motion.h1 
              variants={itemVariants}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight"
            >
              Quick Utility Tasks
              <motion.span 
                className="block bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mt-2"
                animate={{ backgroundPosition: ['0%', '100%', '0%'] }}
                transition={{ duration: 5, repeat: Infinity }}
              >
                Done Right
              </motion.span>
            </motion.h1>
            
            <motion.p 
              variants={itemVariants}
              className="text-muted-foreground text-lg mt-4 max-w-md mx-auto"
            >
              Connect with verified service providers for any task, online or offline.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-3 mt-8 w-full max-w-sm mx-auto"
            >
              <Button
                size="lg"
                className="flex-1 h-14 text-base font-semibold shadow-lg shadow-primary/25"
                onClick={() => navigate('/auth')}
              >
                Get Started
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div 
            className="flex items-center gap-6 mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {stats.map((stat, i) => (
              <motion.div 
                key={stat.label}
                className="text-center"
                whileHover={{ scale: 1.05 }}
              >
                <div className="flex items-center justify-center gap-1">
                  <span className="text-2xl font-bold text-foreground">{stat.value}</span>
                  {stat.icon && <stat.icon className="w-4 h-4 text-warning fill-warning" />}
                </div>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <section className="px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl font-bold text-foreground">
            Why Choose QUT?
          </h2>
          <p className="text-muted-foreground mt-2">Everything you need to get work done</p>
        </motion.div>
        
        <div className="grid gap-4 max-w-lg mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ x: 5 }}
            >
              <Card className="p-5 flex items-start gap-4 border-border hover:border-primary/30 transition-colors">
                <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center flex-shrink-0`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Account Types Section */}
      <section className="px-6 py-16 bg-muted/30">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl font-bold text-foreground">
            Join as Individual or Business
          </h2>
          <p className="text-muted-foreground mt-2">We verify both for maximum trust</p>
        </motion.div>
        
        <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
          >
            <Card className="p-6 h-full border-2 border-transparent hover:border-primary transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <User className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-xl text-foreground">Individual</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                For freelancers and independent service providers
              </p>
              <div className="flex items-center gap-2 mt-4 text-sm text-success">
                <CheckCircle className="w-4 h-4" />
                <span>NIN Verification</span>
              </div>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -5 }}
          >
            <Card className="p-6 h-full border-2 border-transparent hover:border-secondary transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-4">
                <Building2 className="w-7 h-7 text-secondary" />
              </div>
              <h3 className="font-semibold text-xl text-foreground">Company</h3>
              <p className="text-muted-foreground mt-2 text-sm">
                For registered businesses with CAC documentation
              </p>
              <div className="flex items-center gap-2 mt-4 text-sm text-success">
                <CheckCircle className="w-4 h-4" />
                <span>CAC Verification</span>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Role Selection Preview */}
      <section className="px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl font-bold text-foreground mb-2">
            How Would You Like to Use QUT?
          </h2>
        </motion.div>
        
        <div className="grid gap-4 max-w-lg mx-auto">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className="p-6 border-2 border-transparent hover:border-primary cursor-pointer transition-all"
              onClick={() => navigate('/auth')}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Briefcase className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-foreground">I Need Help</h3>
                  <p className="text-sm text-muted-foreground">Post jobs and hire verified providers</p>
                </div>
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <ArrowRight className="w-5 h-5 text-primary" />
                </motion.div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              className="p-6 border-2 border-transparent hover:border-secondary cursor-pointer transition-all"
              onClick={() => navigate('/auth')}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center">
                  <Users className="w-7 h-7 text-secondary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-foreground">I Offer Services</h3>
                  <p className="text-sm text-muted-foreground">Find clients and grow your business</p>
                </div>
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                >
                  <ArrowRight className="w-5 h-5 text-secondary" />
                </motion.div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-16 bg-gradient-to-b from-primary/5 to-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="text-center max-w-md mx-auto"
        >
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of Nigerians already using QUT to get work done.
          </p>
          <Button
            size="lg"
            className="w-full h-14 text-base font-semibold shadow-lg shadow-primary/25"
            onClick={() => navigate('/auth')}
          >
            Create Your Account
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center border-t border-border">
        <p className="text-sm text-muted-foreground">
          © 2024 QUT - Quick Utility Tasks. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Landing;