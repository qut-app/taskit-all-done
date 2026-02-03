import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin, Camera, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCategories } from '@/hooks/useCategories';
import { useToast } from '@/hooks/use-toast';

type OnboardingStep = 'personal' | 'location' | 'verification' | 'provider-setup' | 'complete';

const DELIVERY_TIMES = ['1 day', '2 days', '3 days', '1 week', '2 weeks', '1 month'];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, updateProfile, createProviderProfile, loading: profileLoading } = useProfile();
  const { categories } = useCategories();
  const { toast } = useToast();

  const [step, setStep] = useState<OnboardingStep>('personal');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'requester' | 'provider'>('requester');
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    location: '',
    nationalIdNumber: '',
    facePhoto: null as File | null,
    serviceCategories: [] as string[],
    serviceDescription: '',
    serviceMode: 'both' as 'online' | 'offline' | 'both',
    deliveryTime: '3 days',
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Pre-fill form with profile data
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        fullName: profile.full_name || prev.fullName,
        location: profile.location || prev.location,
        dateOfBirth: profile.date_of_birth || prev.dateOfBirth,
      }));
    }
  }, [profile]);

  const steps: OnboardingStep[] = selectedRole === 'provider' 
    ? ['personal', 'location', 'verification', 'provider-setup', 'complete']
    : ['personal', 'location', 'verification', 'complete'];

  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    } else {
      navigate(-1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);

    try {
      // Update profile
      const { error: profileError } = await updateProfile({
        full_name: formData.fullName,
        location: formData.location,
        date_of_birth: formData.dateOfBirth || null,
        national_id_number: formData.nationalIdNumber || null,
        verification_status: 'pending',
        active_role: selectedRole,
      });

      if (profileError) throw profileError;

      // Create provider profile if selected
      if (selectedRole === 'provider') {
        const { error: providerError } = await createProviderProfile({
          service_categories: formData.serviceCategories,
          service_description: formData.serviceDescription,
          service_mode: formData.serviceMode,
          delivery_time: formData.deliveryTime,
        });

        if (providerError) throw providerError;
      }

      toast({
        title: 'Profile updated!',
        description: 'Your verification is under review.',
      });

      navigate('/dashboard');
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to complete onboarding',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      serviceCategories: prev.serviceCategories.includes(category)
        ? prev.serviceCategories.filter(c => c !== category)
        : [...prev.serviceCategories, category],
    }));
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 'personal':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-foreground">Personal Information</h2>
              <p className="text-muted-foreground mt-1">Tell us about yourself</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <Input
                  variant="filled"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Date of Birth</label>
                <Input
                  variant="filled"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">What would you like to do?</label>
                <div className="grid grid-cols-2 gap-3">
                  <Card
                    variant={selectedRole === 'requester' ? 'outlined' : 'default'}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedRole === 'requester' ? 'border-2 border-primary' : ''
                    }`}
                    onClick={() => setSelectedRole('requester')}
                  >
                    <h3 className="font-semibold text-foreground">I Need Help</h3>
                    <p className="text-xs text-muted-foreground mt-1">Post jobs and hire providers</p>
                  </Card>
                  <Card
                    variant={selectedRole === 'provider' ? 'outlined' : 'default'}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedRole === 'provider' ? 'border-2 border-primary' : ''
                    }`}
                    onClick={() => setSelectedRole('provider')}
                  >
                    <h3 className="font-semibold text-foreground">I Offer Services</h3>
                    <p className="text-xs text-muted-foreground mt-1">Find clients and earn</p>
                  </Card>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 'location':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-foreground">Your Location</h2>
              <p className="text-muted-foreground mt-1">This helps us match you with nearby services</p>
            </div>

            <div className="space-y-4">
              <Button variant="outline" className="w-full justify-start gap-3 h-14">
                <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <span>Detect My Location</span>
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Address</label>
                <Input
                  variant="filled"
                  placeholder="Enter your address"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>
            </div>
          </motion.div>
        );

      case 'verification':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-foreground">Verification</h2>
              <p className="text-muted-foreground mt-1">Help us verify your identity for safety</p>
            </div>

            <Card variant="outlined" className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center border-2 border-dashed border-border">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">Face Photo</h3>
                  <p className="text-sm text-muted-foreground">Take a clear selfie</p>
                  <Button variant="soft" size="sm" className="mt-2">
                    Upload Photo
                  </Button>
                </div>
              </div>
            </Card>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">National ID Number</label>
              <Input
                variant="filled"
                placeholder="Enter your NIN"
                value={formData.nationalIdNumber}
                onChange={(e) => setFormData({ ...formData, nationalIdNumber: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Your ID will be securely stored and only used for verification
              </p>
            </div>
          </motion.div>
        );

      case 'provider-setup':
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-foreground">Service Setup</h2>
              <p className="text-muted-foreground mt-1">Tell us about your services</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Service Categories</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      type="button"
                      variant={formData.serviceCategories.includes(category.name) ? 'soft' : 'outline'}
                      size="sm"
                      onClick={() => toggleCategory(category.name)}
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Service Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {['online', 'offline', 'both'].map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      variant={formData.serviceMode === mode ? 'soft' : 'outline'}
                      size="sm"
                      onClick={() => setFormData({ ...formData, serviceMode: mode as any })}
                      className="capitalize"
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Typical Delivery Time</label>
                <div className="flex flex-wrap gap-2">
                  {DELIVERY_TIMES.map((time) => (
                    <Button
                      key={time}
                      type="button"
                      variant={formData.deliveryTime === time ? 'soft' : 'outline'}
                      size="sm"
                      onClick={() => setFormData({ ...formData, deliveryTime: time })}
                    >
                      {time}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Service Description</label>
                <textarea
                  className="w-full h-24 px-4 py-3 rounded-lg bg-muted border-0 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 resize-none"
                  placeholder="Describe your services..."
                  value={formData.serviceDescription}
                  onChange={(e) => setFormData({ ...formData, serviceDescription: e.target.value })}
                />
              </div>
            </div>
          </motion.div>
        );

      case 'complete':
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-24 h-24 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-6"
            >
              <CheckCircle className="w-12 h-12 text-success" />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-foreground">You're All Set!</h2>
            <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
              Your profile is under review. You'll be verified within 24-48 hours.
            </p>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 safe-top">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full gradient-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
        <span className="text-sm text-muted-foreground">
          {currentStepIndex + 1}/{steps.length}
        </span>
      </header>

      {/* Content */}
      <div className="flex-1 px-6 py-4">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-6 safe-bottom">
        {step === 'complete' ? (
          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={handleComplete}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Setting Up...
              </>
            ) : (
              <>
                Go to Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        ) : (
          <Button variant="hero" size="lg" className="w-full" onClick={handleNext}>
            Continue
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
