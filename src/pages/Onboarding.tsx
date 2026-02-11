import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ArrowRight, MapPin, Camera, CheckCircle, Loader2,
  User, Building2, Upload, FileText, Shield, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useCategories } from '@/hooks/useCategories';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type OnboardingStep = 'account-type' | 'personal' | 'company' | 'location' | 'verification' | 'provider-setup' | 'complete';
type AccountType = 'individual' | 'company';

const DELIVERY_TIMES = ['1 day', '2 days', '3 days', '1 week', '2 weeks', '1 month'];

const stepVariants = {
  enter: { opacity: 0, x: 50 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 }
};

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, updateProfile, createProviderProfile, loading: profileLoading } = useProfile();
  const { categories } = useCategories();
  const { currentRole } = useApp();
  const { toast } = useToast();
  const facePhotoRef = useRef<HTMLInputElement>(null);
  const cacDocRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<OnboardingStep>('account-type');
  const [isLoading, setIsLoading] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('individual');
  const [selectedRole, setSelectedRole] = useState<'requester' | 'provider'>(
    (currentRole as 'requester' | 'provider') || 'requester'
  );
  const [uploadingFace, setUploadingFace] = useState(false);
  const [uploadingCAC, setUploadingCAC] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    location: '',
    latitude: null as number | null,
    longitude: null as number | null,
    nationalIdNumber: '',
    facePhotoUrl: '',
    companyName: '',
    cacNumber: '',
    cacDocumentUrl: '',
    companyAddress: '',
    serviceCategories: [] as string[],
    serviceDescription: '',
    serviceMode: 'both' as 'online' | 'offline' | 'both',
    deliveryTime: '3 days',
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (currentRole) setSelectedRole(currentRole as 'requester' | 'provider');
  }, [currentRole]);

  // Company accounts are always requesters
  useEffect(() => {
    if (accountType === 'company') {
      setSelectedRole('requester');
    }
  }, [accountType]);

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        fullName: profile.full_name || prev.fullName,
        location: profile.location || prev.location,
        dateOfBirth: profile.date_of_birth || prev.dateOfBirth,
        latitude: profile.latitude ? Number(profile.latitude) : prev.latitude,
        longitude: profile.longitude ? Number(profile.longitude) : prev.longitude,
      }));
    }
  }, [profile]);

  const getSteps = (): OnboardingStep[] => {
    const base: OnboardingStep[] = accountType === 'company'
      ? ['account-type', 'company', 'location', 'verification']
      : ['account-type', 'personal', 'location', 'verification'];
    
    // Only add provider-setup for providers
    if (selectedRole === 'provider') {
      base.push('provider-setup');
    }
    base.push('complete');
    return base;
  };

  const steps = getSteps();
  const currentStepIndex = steps.indexOf(step);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) setStep(steps[nextIndex]);
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) setStep(steps[prevIndex]);
    else navigate(-1);
  };

  const handleDetectLocation = async () => {
    if (!navigator.geolocation) {
      toast({ title: 'Error', description: 'Geolocation is not supported by your browser', variant: 'destructive' });
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({ ...prev, latitude, longitude }));
        // Try reverse geocoding
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data.display_name) {
            // Extract city/state
            const parts = data.display_name.split(', ');
            const location = parts.slice(0, 3).join(', ');
            setFormData(prev => ({ ...prev, location }));
          }
        } catch {
          setFormData(prev => ({ ...prev, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
        }
        setDetectingLocation(false);
        toast({ title: 'Location detected', description: 'Your location has been set' });
      },
      (error) => {
        setDetectingLocation(false);
        toast({ title: 'Error', description: 'Unable to detect your location. Please enter it manually.', variant: 'destructive' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleUploadFacePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingFace(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/face-verification.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('user-media').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('user-media').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, facePhotoUrl: publicUrl }));
      toast({ title: 'Success', description: 'Face photo uploaded!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingFace(false);
    }
  };

  const handleUploadCACDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingCAC(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/cac-document.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('user-media').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('user-media').getPublicUrl(filePath);
      setFormData(prev => ({ ...prev, cacDocumentUrl: publicUrl }));
      toast({ title: 'Success', description: 'CAC document uploaded!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingCAC(false);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const updateData: any = {
        full_name: accountType === 'company' ? formData.companyName : formData.fullName,
        location: formData.location,
        latitude: formData.latitude,
        longitude: formData.longitude,
        verification_status: 'pending',
        active_role: selectedRole,
        account_type: accountType,
      };

      if (accountType === 'individual') {
        updateData.date_of_birth = formData.dateOfBirth || null;
        updateData.national_id_number = formData.nationalIdNumber || null;
        updateData.face_verification_url = formData.facePhotoUrl || null;
      } else {
        updateData.company_name = formData.companyName || null;
        updateData.cac_number = formData.cacNumber || null;
        updateData.cac_document_url = formData.cacDocumentUrl || null;
        updateData.company_address = formData.companyAddress || null;
      }

      const { error: profileError } = await updateProfile(updateData);
      if (profileError) throw profileError;

      if (selectedRole === 'provider') {
        const { error: providerError } = await createProviderProfile({
          service_categories: formData.serviceCategories,
          service_description: formData.serviceDescription,
          service_mode: formData.serviceMode,
          delivery_time: formData.deliveryTime,
        });
        if (providerError) throw providerError;
      }

      // Create referral record if user was referred
      const referrerId = localStorage.getItem('referrer_id');
      if (referrerId && user && referrerId !== user.id) {
        await supabase.from('referrals').insert({
          referrer_id: referrerId,
          referred_user_id: user.id,
          referral_code: referrerId, // Using user_id as the referral identifier
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
        localStorage.removeItem('referrer_id');
      }

      toast({ title: 'Profile submitted!', description: 'Your verification is under review.' });
      navigate('/dashboard');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to complete onboarding', variant: 'destructive' });
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
      case 'account-type':
        return (
          <motion.div variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Welcome! 👋</h2>
              <p className="text-muted-foreground mt-1">Let's set up your account</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Account Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['individual', 'company'] as const).map(type => (
                    <motion.div key={type} whileTap={{ scale: 0.98 }}>
                      <Card
                        className={`p-4 cursor-pointer transition-all duration-200 ${
                          accountType === type ? 'border-2 border-primary bg-primary/5' : 'hover:border-muted-foreground/30'
                        }`}
                        onClick={() => setAccountType(type)}
                      >
                        <motion.div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                          accountType === type ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`} animate={{ scale: accountType === type ? 1.05 : 1 }}>
                          {type === 'individual' ? <User className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                        </motion.div>
                        <h3 className="font-semibold text-foreground">{type === 'individual' ? 'Individual' : 'Company'}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{type === 'individual' ? 'Personal account for freelancers' : 'Business account with CAC'}</p>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
              {accountType === 'individual' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">What would you like to do?</label>
                  <div className="grid grid-cols-2 gap-3">
                    {([{ role: 'requester' as const, title: 'I Need Help', desc: 'Post jobs and hire providers' },
                       { role: 'provider' as const, title: 'I Offer Services', desc: 'Find clients and earn' }]).map(({ role, title, desc }) => (
                      <motion.div key={role} whileTap={{ scale: 0.98 }}>
                        <Card
                          className={`p-4 cursor-pointer transition-all duration-200 ${
                            selectedRole === role ? 'border-2 border-primary bg-primary/5' : 'hover:border-muted-foreground/30'
                          }`}
                          onClick={() => setSelectedRole(role)}
                        >
                          <h3 className="font-semibold text-foreground">{title}</h3>
                          <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        );

      case 'personal':
        return (
          <motion.div variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Personal Details</h2>
              <p className="text-muted-foreground mt-1">Tell us about yourself</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <Input placeholder="Enter your full name" value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Date of Birth</label>
                <Input type="date" value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} className="h-12" />
              </div>
            </div>
          </motion.div>
        );

      case 'company':
        return (
          <motion.div variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Company Details</h2>
              <p className="text-muted-foreground mt-1">Tell us about your business</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Company Name</label>
                <Input placeholder="Enter company name" value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className="h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">CAC Registration Number</label>
                <Input placeholder="e.g., RC1234567" value={formData.cacNumber}
                  onChange={(e) => setFormData({ ...formData, cacNumber: e.target.value })} className="h-12" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Company Address</label>
                <Input placeholder="Enter business address" value={formData.companyAddress}
                  onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })} className="h-12" />
              </div>
            </div>
          </motion.div>
        );

      case 'location':
        return (
          <motion.div variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Your Location</h2>
              <p className="text-muted-foreground mt-1">This helps match you with nearby services</p>
            </div>
            <div className="space-y-4">
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button variant="outline" className="w-full justify-start gap-3 h-14"
                  onClick={handleDetectLocation} disabled={detectingLocation}>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    {detectingLocation ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <MapPin className="w-5 h-5 text-primary" />}
                  </div>
                  <span>{detectingLocation ? 'Detecting...' : 'Detect My Location'}</span>
                </Button>
              </motion.div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Address</label>
                <Input placeholder="Enter your address" value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="h-12" />
              </div>
              {formData.location && (
                <div className="p-3 bg-success/10 rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-sm text-foreground">{formData.location}</span>
                </div>
              )}
            </div>
          </motion.div>
        );

      case 'verification':
        return (
          <motion.div variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Verification</h2>
              <p className="text-muted-foreground mt-1">
                {accountType === 'company' ? 'Upload your CAC documents' : 'Help us verify your identity'}
              </p>
            </div>
            {accountType === 'individual' ? (
              <>
                <Card className="p-4">
                  <div className="flex items-center gap-4">
                    <motion.div className={`w-20 h-20 rounded-2xl flex items-center justify-center border-2 border-dashed overflow-hidden ${
                      formData.facePhotoUrl ? 'border-success bg-success/10' : 'border-border bg-muted'
                    }`}>
                      {formData.facePhotoUrl ? (
                        <img src={formData.facePhotoUrl} alt="Face" className="w-full h-full object-cover" />
                      ) : uploadingFace ? (
                        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                      ) : (
                        <Camera className="w-8 h-8 text-muted-foreground" />
                      )}
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        Face Photo {formData.facePhotoUrl && <CheckCircle className="w-4 h-4 text-success" />}
                      </h3>
                      <p className="text-sm text-muted-foreground">Take a clear selfie</p>
                      <input ref={facePhotoRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleUploadFacePhoto} />
                      <Button variant="outline" size="sm" className="mt-2"
                        onClick={() => facePhotoRef.current?.click()} disabled={uploadingFace}>
                        {uploadingFace ? 'Uploading...' : formData.facePhotoUrl ? 'Change Photo' : 'Upload Photo'}
                      </Button>
                    </div>
                  </div>
                </Card>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">National ID Number</label>
                  <Input placeholder="Enter your NIN" value={formData.nationalIdNumber}
                    onChange={(e) => setFormData({ ...formData, nationalIdNumber: e.target.value })} className="h-12" />
                  <p className="text-xs text-muted-foreground">Your ID is securely stored and only used for verification</p>
                </div>
              </>
            ) : (
              <>
                <Card className="p-4">
                  <div className="flex items-center gap-4">
                    <motion.div className={`w-20 h-20 rounded-2xl flex items-center justify-center border-2 border-dashed ${
                      formData.cacDocumentUrl ? 'border-success bg-success/10' : 'border-border bg-muted'
                    }`}>
                      {uploadingCAC ? (
                        <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                      ) : formData.cacDocumentUrl ? (
                        <CheckCircle className="w-8 h-8 text-success" />
                      ) : (
                        <FileText className="w-8 h-8 text-muted-foreground" />
                      )}
                    </motion.div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        CAC Certificate {formData.cacDocumentUrl && <CheckCircle className="w-4 h-4 text-success" />}
                      </h3>
                      <p className="text-sm text-muted-foreground">Upload your CAC document</p>
                      <input ref={cacDocRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleUploadCACDoc} />
                      <Button variant="outline" size="sm" className="mt-2"
                        onClick={() => cacDocRef.current?.click()} disabled={uploadingCAC}>
                        {uploadingCAC ? 'Uploading...' : formData.cacDocumentUrl ? 'Change Document' : 'Upload Document'}
                      </Button>
                    </div>
                  </div>
                </Card>
                <Card className="p-4 bg-muted/50">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-medium text-foreground text-sm">Secure Document Storage</h4>
                      <p className="text-xs text-muted-foreground mt-1">Your documents are encrypted and only accessible to our verification team.</p>
                    </div>
                  </div>
                </Card>
              </>
            )}
          </motion.div>
        );

      case 'provider-setup':
        return (
          <motion.div variants={stepVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Service Setup</h2>
              <p className="text-muted-foreground mt-1">Tell us about your services</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Service Categories {formData.serviceCategories.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{formData.serviceCategories.length} selected</Badge>
                  )}
                </label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const isSelected = formData.serviceCategories.includes(category.name);
                    return (
                      <motion.div key={category.id} whileTap={{ scale: 0.95 }}>
                        <Button type="button" variant={isSelected ? 'default' : 'outline'} size="sm"
                          onClick={() => toggleCategory(category.name)} className={isSelected ? 'shadow-sm' : ''}>
                          {isSelected && <CheckCircle className="w-3 h-3 mr-1" />}
                          {category.name}
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Service Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {['online', 'offline', 'both'].map((mode) => (
                    <motion.div key={mode} whileTap={{ scale: 0.95 }}>
                      <Button type="button" variant={formData.serviceMode === mode ? 'default' : 'outline'} size="sm"
                        onClick={() => setFormData({ ...formData, serviceMode: mode as any })} className="w-full capitalize">
                        {mode}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Typical Delivery Time</label>
                <div className="flex flex-wrap gap-2">
                  {DELIVERY_TIMES.map((time) => (
                    <motion.div key={time} whileTap={{ scale: 0.95 }}>
                      <Button type="button" variant={formData.deliveryTime === time ? 'default' : 'outline'} size="sm"
                        onClick={() => setFormData({ ...formData, deliveryTime: time })}>
                        {time}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Service Description</label>
                <textarea
                  className="w-full h-24 px-4 py-3 rounded-xl bg-muted/50 border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-colors"
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
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', duration: 0.5 }}
            className="text-center py-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2, stiffness: 200 }}
              className="w-24 h-24 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-6">
              <Sparkles className="w-12 h-12 text-success" />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground">You're All Set!</h2>
            <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
              Your {accountType === 'company' ? 'company ' : ''}profile is under review. You'll be verified within 24-48 hours.
            </p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6">
              <Badge variant="outline" className="text-sm px-4 py-2">
                <Shield className="w-4 h-4 mr-2" />
                Verification Pending
              </Badge>
            </motion.div>
          </motion.div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 p-4 safe-top sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }}
              animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: 'easeOut' }} />
          </div>
        </div>
        <span className="text-sm font-medium text-muted-foreground shrink-0">{currentStepIndex + 1}/{steps.length}</span>
      </header>

      <div className="flex-1 px-6 py-4 overflow-y-auto">
        <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>
      </div>

      <motion.div className="p-6 safe-bottom bg-background border-t border-border/50"
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        {step === 'complete' ? (
          <Button size="lg" className="w-full h-14 text-base font-semibold" onClick={handleComplete} disabled={isLoading}>
            {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin mr-2" />Setting Up...</>) : (<>Go to Dashboard<ArrowRight className="w-5 h-5 ml-2" /></>)}
          </Button>
        ) : (
          <Button size="lg" className="w-full h-14 text-base font-semibold" onClick={handleNext}>
            Continue<ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        )}
      </motion.div>
    </div>
  );
};

export default Onboarding;
