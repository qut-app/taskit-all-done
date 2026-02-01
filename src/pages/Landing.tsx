import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Users, Briefcase, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const Landing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: 'Connect Instantly',
      description: 'Find skilled providers or eager clients in seconds',
    },
    {
      icon: Shield,
      title: 'Verified Users',
      description: 'All users are verified for your peace of mind',
    },
    {
      icon: Zap,
      title: 'Quick Delivery',
      description: 'Get jobs done fast with our efficient matching',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Midnight Utility */}
      <div className="gradient-midnight min-h-[70vh] flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between p-4 safe-top">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <span className="text-primary font-bold text-lg">Q</span>
            </div>
            <span className="font-bold text-xl text-white">QUT</span>
          </div>
          <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10" onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </header>

        {/* Hero Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
              Quick Utility Tasks
              <span className="block text-accent mt-2">Done Right</span>
            </h1>
            <p className="text-white/70 text-lg mt-4 max-w-md mx-auto">
              Connect with verified service providers for any task, online or offline.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-3 mt-8 w-full max-w-sm"
          >
            <Button
              variant="hero"
              size="xl"
              className="flex-1"
              onClick={() => navigate('/onboarding')}
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Features Section */}
      <section className="px-6 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="space-y-4"
        >
          <h2 className="text-2xl font-bold text-foreground text-center">
            Why Choose QUT?
          </h2>
          <div className="grid gap-4 mt-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card variant="elevated" className="p-4 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Role Selection Preview */}
      <section className="px-6 py-12 bg-muted/50">
        <h2 className="text-2xl font-bold text-foreground text-center mb-6">
          How Would You Like to Use QUT?
        </h2>
        <div className="grid gap-4">
          <Card
            variant="interactive"
            className="p-6 border-2 border-transparent hover:border-accent transition-colors"
            onClick={() => navigate('/onboarding')}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Briefcase className="w-7 h-7 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-foreground">I Need Help</h3>
                <p className="text-sm text-muted-foreground">Post jobs and hire verified providers</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>

          <Card
            variant="interactive"
            className="p-6 border-2 border-transparent hover:border-secondary transition-colors"
            onClick={() => navigate('/onboarding')}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-secondary-light flex items-center justify-center">
                <Users className="w-7 h-7 text-secondary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-foreground">I Offer Services</h3>
                <p className="text-sm text-muted-foreground">Find clients and grow your business</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          © 2024 QUT. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
