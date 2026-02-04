import { motion } from 'framer-motion';
import { BadgeCheck, Building2, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificationBadgeProps {
  status: 'unverified' | 'pending' | 'verified';
  accountType?: 'individual' | 'company';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function VerificationBadge({ 
  status, 
  accountType = 'individual',
  size = 'md', 
  showLabel = false,
  className 
}: VerificationBadgeProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const containerClasses = {
    sm: 'gap-1 text-xs',
    md: 'gap-1.5 text-sm',
    lg: 'gap-2 text-base'
  };

  if (status !== 'verified') {
    return null;
  }

  return (
    <motion.div 
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 15 }}
      className={cn(
        'inline-flex items-center',
        containerClasses[size],
        className
      )}
    >
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          repeatType: 'reverse'
        }}
        className={cn(
          'text-primary',
          accountType === 'company' ? 'text-secondary' : 'text-primary'
        )}
      >
        {accountType === 'company' ? (
          <div className="relative">
            <Building2 className={sizeClasses[size]} />
            <BadgeCheck className={cn(
              'absolute -bottom-0.5 -right-0.5 text-success',
              size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'
            )} />
          </div>
        ) : (
          <BadgeCheck className={sizeClasses[size]} />
        )}
      </motion.div>
      {showLabel && (
        <span className="font-medium text-success">
          {accountType === 'company' ? 'Verified Business' : 'Verified'}
        </span>
      )}
    </motion.div>
  );
}

export function VerificationStatus({ 
  status,
  className
}: { 
  status: 'unverified' | 'pending' | 'verified';
  className?: string;
}) {
  const config = {
    unverified: {
      icon: Shield,
      label: 'Not Verified',
      className: 'text-muted-foreground bg-muted'
    },
    pending: {
      icon: Shield,
      label: 'Pending Review',
      className: 'text-warning bg-warning/10'
    },
    verified: {
      icon: BadgeCheck,
      label: 'Verified',
      className: 'text-success bg-success/10'
    }
  };

  const { icon: Icon, label, className: statusClass } = config[status];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        statusClass,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </motion.div>
  );
}