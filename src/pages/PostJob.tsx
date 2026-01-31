import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { SERVICE_CATEGORIES, DELIVERY_TIMES, useApp } from '@/context/AppContext';

const PostJob = () => {
  const navigate = useNavigate();
  const { jobs, setJobs } = useApp();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    serviceMode: 'offline' as 'online' | 'offline',
    location: '',
    expectedDeliveryTime: '3 days',
    budget: '',
  });

  const handleSubmit = () => {
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const newJob = {
        id: String(Date.now()),
        requesterId: 'current-user',
        requesterName: 'You',
        title: formData.title,
        description: formData.description,
        category: formData.category,
        serviceMode: formData.serviceMode,
        location: formData.location,
        expectedDeliveryTime: formData.expectedDeliveryTime,
        status: 'open' as const,
        budget: formData.budget ? parseInt(formData.budget) : undefined,
        createdAt: new Date().toISOString().split('T')[0],
      };
      
      setJobs([newJob, ...jobs]);
      setIsLoading(false);
      setStep('success');
    }, 1500);
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
          className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mb-6"
        >
          <CheckCircle className="w-12 h-12 text-success" />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold text-foreground">Job Posted!</h1>
          <p className="text-muted-foreground mt-2">
            Providers will start applying soon
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-sm mt-8 space-y-3"
        >
          <Button
            variant="hero"
            size="lg"
            className="w-full"
            onClick={() => navigate('/my-jobs')}
          >
            View My Jobs
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 p-4 safe-top border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold text-lg">Post a Job</h1>
      </header>

      {/* Form */}
      <div className="p-4 space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Job Title</label>
          <Input
            variant="filled"
            placeholder="e.g., Need a plumber urgently"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Category</label>
          <div className="flex flex-wrap gap-2">
            {SERVICE_CATEGORIES.slice(0, 12).map((category) => (
              <Button
                key={category}
                type="button"
                variant={formData.category === category ? 'soft' : 'outline'}
                size="sm"
                onClick={() => setFormData({ ...formData, category })}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Service Mode */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Service Type</label>
          <div className="grid grid-cols-2 gap-3">
            <Card
              variant={formData.serviceMode === 'online' ? 'outlined' : 'interactive'}
              className={`p-4 text-center cursor-pointer ${
                formData.serviceMode === 'online' ? 'border-primary' : ''
              }`}
              onClick={() => setFormData({ ...formData, serviceMode: 'online', location: '' })}
            >
              <h3 className="font-semibold text-foreground">Remote</h3>
              <p className="text-xs text-muted-foreground mt-1">Done online</p>
            </Card>
            <Card
              variant={formData.serviceMode === 'offline' ? 'outlined' : 'interactive'}
              className={`p-4 text-center cursor-pointer ${
                formData.serviceMode === 'offline' ? 'border-primary' : ''
              }`}
              onClick={() => setFormData({ ...formData, serviceMode: 'offline' })}
            >
              <h3 className="font-semibold text-foreground">On-Site</h3>
              <p className="text-xs text-muted-foreground mt-1">Physical presence</p>
            </Card>
          </div>
        </div>

        {/* Location (if offline) */}
        {formData.serviceMode === 'offline' && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Location</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                variant="filled"
                placeholder="Enter job location"
                className="pl-12"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
          </div>
        )}

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Description</label>
          <textarea
            className="w-full h-32 px-4 py-3 rounded-lg bg-muted border-0 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 resize-none"
            placeholder="Describe what you need..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        {/* Delivery Time */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Expected Delivery</label>
          <div className="flex flex-wrap gap-2">
            {DELIVERY_TIMES.map((time) => (
              <Button
                key={time}
                type="button"
                variant={formData.expectedDeliveryTime === time ? 'soft' : 'outline'}
                size="sm"
                onClick={() => setFormData({ ...formData, expectedDeliveryTime: time })}
              >
                {time}
              </Button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Budget (Optional)</label>
          <Input
            variant="filled"
            type="number"
            placeholder="₦0"
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="p-4 safe-bottom">
        <Button
          variant="hero"
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={!formData.title || !formData.category || !formData.description || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Posting...
            </>
          ) : (
            'Post Job'
          )}
        </Button>
      </div>
    </div>
  );
};

export default PostJob;
