import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Wifi, Map, Loader2, MapPin, Building2, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import MobileLayout from '@/components/navigation/MobileLayout';
import JobCard from '@/components/cards/JobCard';
import { useAuth } from '@/hooks/useAuth';
import { useJobs } from '@/hooks/useJobs';
import { useCategories } from '@/hooks/useCategories';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

const FindJobs = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { jobs, loading: jobsLoading, applyToJob } = useJobs();
  const { categories } = useCategories();
  const { profile } = useProfile();
  const geo = useGeolocation();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [serviceMode, setServiceMode] = useState<'all' | 'online' | 'offline'>('all');
  const [locationFilter, setLocationFilter] = useState<string | null>(null);
  const [accountTypeFilter, setAccountTypeFilter] = useState<'all' | 'individual' | 'company'>('all');

  // Default location from geolocation or profile
  useEffect(() => {
    if (geo.locationName && !locationFilter) {
      setLocationFilter(geo.locationName);
    } else if (!geo.locationName && profile?.location && !locationFilter) {
      setLocationFilter(profile.location);
    }
  }, [geo.locationName, profile?.location]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || job.category === selectedCategory;
    const matchesMode = serviceMode === 'all' || job.service_mode === serviceMode || job.service_mode === 'both';
    
    // Location filter
    if (locationFilter) {
      const jobLoc = job.location?.toLowerCase() || '';
      if (!jobLoc.includes(locationFilter.toLowerCase())) return false;
    }

    // Account type filter
    if (accountTypeFilter !== 'all') {
      if ((job.requester_profile as any)?.account_type !== accountTypeFilter) return false;
    }
    
    return matchesSearch && matchesCategory && matchesMode;
  });

  const handleApply = async (jobId: string) => {
    const { error } = await applyToJob(jobId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Applied!', description: 'Your application has been submitted.' });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MobileLayout>
      <header className="p-4 safe-top space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Find Jobs</h1>
          <p className="text-muted-foreground">Browse available opportunities</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input variant="filled" placeholder="Search jobs..." className="pl-12" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        {/* Service Mode Filter */}
        <div className="flex gap-2">
          <Button variant={serviceMode === 'all' ? 'soft' : 'ghost'} size="sm" onClick={() => setServiceMode('all')}>All</Button>
          <Button variant={serviceMode === 'online' ? 'soft' : 'ghost'} size="sm" onClick={() => setServiceMode('online')} className="gap-1">
            <Wifi className="w-4 h-4" />Remote
          </Button>
          <Button variant={serviceMode === 'offline' ? 'soft' : 'ghost'} size="sm" onClick={() => setServiceMode('offline')} className="gap-1">
            <Map className="w-4 h-4" />On-Site
          </Button>
        </div>

        {/* Footer Filters: Location + Account Type */}
        <div className="flex gap-2">
          <Button
            variant={locationFilter ? 'soft' : 'outline'}
            size="sm"
            className="gap-1"
            onClick={() => {
              if (locationFilter) {
                setLocationFilter(null);
              } else {
                setLocationFilter(geo.locationName || profile?.location || '');
              }
            }}
          >
            <MapPin className="w-3.5 h-3.5" />
            {locationFilter || 'Location'}
          </Button>
          <Button
            variant={accountTypeFilter === 'individual' ? 'soft' : 'ghost'}
            size="sm"
            className="gap-1"
            onClick={() => setAccountTypeFilter(accountTypeFilter === 'individual' ? 'all' : 'individual')}
          >
            <User className="w-3.5 h-3.5" />Individual
          </Button>
          <Button
            variant={accountTypeFilter === 'company' ? 'soft' : 'ghost'}
            size="sm"
            className="gap-1"
            onClick={() => setAccountTypeFilter(accountTypeFilter === 'company' ? 'all' : 'company')}
          >
            <Building2 className="w-3.5 h-3.5" />Company
          </Button>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <Button variant={selectedCategory === null ? 'soft' : 'outline'} size="sm" onClick={() => setSelectedCategory(null)}>All</Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.name ? 'soft' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.name)}
              className="flex-shrink-0"
            >
              {category.name}
            </Button>
          ))}
        </div>
      </header>

      {/* Results */}
      <div className="px-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} available
          </p>
          <Button variant="ghost" size="sm" className="gap-1">
            <Filter className="w-4 h-4" />Filters
          </Button>
        </div>

        {jobsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredJobs.length > 0 ? (
          filteredJobs.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <JobCard job={job} onApply={() => handleApply(job.id)} />
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">No jobs found</h3>
            <p className="text-sm text-muted-foreground mt-1">Check back later for new opportunities</p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default FindJobs;
