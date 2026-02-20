import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword, user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const refUserId = searchParams.get('ref');
  
  const [authMode, setAuthMode] = useState<'login' | 'signup'>(refUserId ? 'signup' : 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', fullName: '',
  });

  useEffect(() => {
    if (user && !authLoading) {
      const checkOnboarding = async () => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed, account_type, active_role, location, gender')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!profile || !profile.onboarding_completed || !profile.account_type || !profile.active_role || !profile.location) {
          navigate('/onboarding');
        } else if (profile.account_type === 'individual' && !profile.gender) {
          navigate('/onboarding');
        } else {
          navigate('/feed');
        }
      };
      checkOnboarding();
    }
  }, [user, authLoading, navigate]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Google sign-in failed', variant: 'destructive' });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authMode === 'signup') {
        if (formData.password !== formData.confirmPassword) {
          toast({ title: 'Error', description: 'Passwords do not match', variant: 'destructive' });
          setLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
          setLoading(false);
          return;
        }
        const { error } = await signUp(formData.email, formData.password, formData.fullName);
        if (error) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } else {
          // Store referral if ref param present and not self-referral
          if (refUserId) {
            // We store ref in localStorage; the referral record is created after
            // the user completes email verification + onboarding
            localStorage.setItem('referrer_id', refUserId);
          }
          setShowConfirmation(true);
        }
      } else {
        const { error } = await signIn(formData.email, formData.password);
        if (error) {
          toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
        // Redirect is handled by the useEffect that watches user state
      }
    } catch (err) {
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await resetPassword(formData.email);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Success', description: 'Password reset email sent. Check your inbox.' });
        setShowResetPassword(false);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
          className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
          <CheckCircle className="w-10 h-10 text-success" />
        </motion.div>
        <h1 className="text-2xl font-bold text-foreground text-center">Check Your Email</h1>
        <p className="text-muted-foreground text-center mt-2 max-w-sm">
          We've sent a confirmation email to <strong>{formData.email}</strong>. 
          Please click the link to verify your account.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => { setShowConfirmation(false); setAuthMode('login'); }}>
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-4 p-4 safe-top">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold text-lg">
          {showResetPassword ? 'Reset Password' : authMode === 'login' ? 'Welcome Back' : 'Create Account'}
        </h1>
      </header>

      <div className="px-6 py-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="flex justify-center mb-8">
          <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-primary">
            <span className="text-primary-foreground font-bold text-3xl">Q</span>
          </div>
        </motion.div>

        {showResetPassword ? (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <Input type="email" placeholder="you@example.com" value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Reset Link'}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setShowResetPassword(false)}>
                Back to Login
              </Button>
            </form>
          </motion.div>
        ) : (
          <>
            <Tabs value={authMode} onValueChange={(v) => setAuthMode(v as 'login' | 'signup')} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Google Sign In */}
            <Button
              variant="outline"
              size="lg"
              className="w-full mb-4 gap-3 h-12"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Continue with Google
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={authMode} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {authMode === 'signup' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Full Name</label>
                      <Input type="text" placeholder="Your full name" value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Email Address</label>
                    <Input type="email" placeholder="you@example.com" value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <div className="relative">
                      <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                      <Button type="button" variant="ghost" size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  {authMode === 'signup' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Confirm Password</label>
                      <Input type="password" placeholder="••••••••" value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} required />
                    </div>
                  )}
                  {authMode === 'login' && (
                    <Button type="button" variant="link" className="px-0 text-sm" onClick={() => setShowResetPassword(true)}>
                      Forgot password?
                    </Button>
                  )}
                  <Button type="submit" size="lg" className="w-full mt-6" disabled={loading}>
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : authMode === 'login' ? 'Sign In' : 'Create Account'}
                  </Button>
                </form>
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
};

export default Auth;
