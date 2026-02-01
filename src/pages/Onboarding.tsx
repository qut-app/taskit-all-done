import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MapPin, Camera, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useApp, SERVICE_CATEGORIES, DELIVERY_TIMES } from '@/context/AppContext';

type OnboardingStep = 'personal' | 'location' | 'verification' | 'provider-setup' | 'complete';

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, setUser, currentRole } = useApp();
  const [step, setStep] = useState<OnboardingStep>('personal');
  const [isLoading, setIsLoading] = useState(false);
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

  const steps: OnboardingStep[] = currentRole === 'provider' 
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

  const handleComplete = () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setUser({
        id: '1',
        fullName: formData.fullName || 'Demo User',
        email: 'demo@example.com',
        phone: '+234 800 000 0000',
        location: formData.location || 'Lagos, Nigeria',
        dateOfBirth: formData.dateOfBirth || '1990-01-01',
        role: currentRole,
        verificationStatus: 'pending',
      });
      setIsLoading(false);
      navigate('/dashboard');
    }, 1500);
  };

  const toggleCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      serviceCategories: prev.serviceCategories.includes(category)
        ? prev.serviceCategories.filter(c => c !== category)
        : [...prev.serviceCategories, category],
    }));
  };

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
                  {SERVICE_CATEGORIES.map((category) => (
                    <Button
                      key={category}
                      type="button"
                      variant={formData.serviceCategories.includes(category) ? 'soft' : 'outline'}
                      size="sm"
                      onClick={() => toggleCategory(category)}
                    >
                      {category}
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
