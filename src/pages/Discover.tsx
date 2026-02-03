import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Wifi, Map, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import MobileLayout from '@/components/navigation/MobileLayout';
import ProviderCard from '@/components/cards/ProviderCard';
import { useAuth } from '@/hooks/useAuth';
import { useProviders } from '@/hooks/useProviders';
import { useCategories } from '@/hooks/useCategories';

const Discover = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { categories } = useCategories();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [serviceMode, setServiceMode] = useState<'all' | 'online' | 'offline'>('all');
  
  const { providers, loading: providersLoading } = useProviders({
    category: selectedCategory || undefined,
    serviceMode: serviceMode === 'all' ? undefined : serviceMode,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const filteredProviders = providers.filter((provider) => {
    if (!searchQuery) return true;
    const matchesName = provider.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = (provider.service_categories || []).some(
      c => c.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return matchesName || matchesCategory;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MobileLayout>
      {/* Header */}
      <header className="p-4 safe-top space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Discover</h1>
          <p className="text-muted-foreground">Find the perfect provider</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            variant="filled"
            placeholder="Search providers or services..."
            className="pl-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Service Mode Filter */}
        <div className="flex gap-2">
          <Button
            variant={serviceMode === 'all' ? 'soft' : 'ghost'}
            size="sm"
            onClick={() => setServiceMode('all')}
          >
            All
          </Button>
          <Button
            variant={serviceMode === 'online' ? 'soft' : 'ghost'}
            size="sm"
            onClick={() => setServiceMode('online')}
            className="gap-1"
          >
            <Wifi className="w-4 h-4" />
            Online
          </Button>
          <Button
            variant={serviceMode === 'offline' ? 'soft' : 'ghost'}
            size="sm"
            onClick={() => setServiceMode('offline')}
            className="gap-1"
          >
            <Map className="w-4 h-4" />
            Offline
          </Button>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <Button
            variant={selectedCategory === null ? 'soft' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
          >
            All
          </Button>
          {categories.slice(0, 8).map((category) => (
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
            {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''} found
          </p>
          <Button variant="ghost" size="sm" className="gap-1">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>

        {providersLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProviders.length > 0 ? (
          filteredProviders.map((provider, index) => (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <ProviderCard provider={provider} />
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">No providers found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </MobileLayout>
  );
};

export default Discover;
