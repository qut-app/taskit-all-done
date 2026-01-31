import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'requester' | 'provider' | null;
export type VerificationStatus = 'unverified' | 'pending' | 'verified';
export type ServiceMode = 'online' | 'offline' | 'both';

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  dateOfBirth: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  avatarUrl?: string;
  nationalIdNumber?: string;
  faceVerificationUrl?: string;
}

export interface ProviderProfile extends UserProfile {
  serviceCategories: string[];
  serviceDescription: string;
  serviceMode: ServiceMode;
  deliveryTime: string;
  activeJobSlots: number;
  maxJobSlots: number;
  rating: number;
  reviewCount: number;
  onTimeDeliveryScore: number;
  isRecommended: boolean;
  isPremium: boolean;
}

export interface Job {
  id: string;
  requesterId: string;
  requesterName: string;
  title: string;
  description: string;
  category: string;
  serviceMode: ServiceMode;
  location?: string;
  expectedDeliveryTime: string;
  status: 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  budget?: number;
  createdAt: string;
  assignedProviderId?: string;
}

interface AppContextType {
  user: UserProfile | ProviderProfile | null;
  setUser: (user: UserProfile | ProviderProfile | null) => void;
  isAuthenticated: boolean;
  currentRole: UserRole;
  switchRole: (role: UserRole) => void;
  jobs: Job[];
  setJobs: (jobs: Job[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const SERVICE_CATEGORIES = [
  'Cleaning',
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Painting',
  'Moving',
  'Tutoring',
  'Web Development',
  'Graphic Design',
  'Writing',
  'Photography',
  'Video Editing',
  'Social Media',
  'Virtual Assistant',
  'Data Entry',
  'Translation',
  'Cooking',
  'Gardening',
  'Pet Care',
  'Delivery',
];

export const DELIVERY_TIMES = [
  '1 day',
  '2 days',
  '3 days',
  '1 week',
  '2 weeks',
  '1 month',
];

// Mock data for demo
const mockProviders: ProviderProfile[] = [
  {
    id: '1',
    fullName: 'Adebayo Johnson',
    email: 'adebayo@example.com',
    phone: '+234 801 234 5678',
    location: 'Lagos, Nigeria',
    dateOfBirth: '1990-05-15',
    role: 'provider',
    verificationStatus: 'verified',
    serviceCategories: ['Web Development', 'Graphic Design'],
    serviceDescription: 'Professional web developer with 5 years of experience building modern websites and applications.',
    serviceMode: 'online',
    deliveryTime: '3 days',
    activeJobSlots: 2,
    maxJobSlots: 3,
    rating: 4.8,
    reviewCount: 124,
    onTimeDeliveryScore: 96,
    isRecommended: true,
    isPremium: false,
  },
  {
    id: '2',
    fullName: 'Chioma Okafor',
    email: 'chioma@example.com',
    phone: '+234 802 345 6789',
    location: 'Abuja, Nigeria',
    dateOfBirth: '1988-11-22',
    role: 'provider',
    verificationStatus: 'verified',
    serviceCategories: ['Cleaning', 'Cooking'],
    serviceDescription: 'Professional house cleaner and cook. I provide top-notch home services with attention to detail.',
    serviceMode: 'offline',
    deliveryTime: '1 day',
    activeJobSlots: 1,
    maxJobSlots: 3,
    rating: 4.9,
    reviewCount: 89,
    onTimeDeliveryScore: 98,
    isRecommended: true,
    isPremium: true,
  },
  {
    id: '3',
    fullName: 'Emmanuel Ade',
    email: 'emmanuel@example.com',
    phone: '+234 803 456 7890',
    location: 'Lagos, Nigeria',
    dateOfBirth: '1995-03-10',
    role: 'provider',
    verificationStatus: 'verified',
    serviceCategories: ['Plumbing', 'Electrical'],
    serviceDescription: 'Certified plumber and electrician. Quick response and quality workmanship guaranteed.',
    serviceMode: 'offline',
    deliveryTime: '1 day',
    activeJobSlots: 0,
    maxJobSlots: 3,
    rating: 4.6,
    reviewCount: 67,
    onTimeDeliveryScore: 92,
    isRecommended: false,
    isPremium: false,
  },
];

const mockJobs: Job[] = [
  {
    id: '1',
    requesterId: 'user1',
    requesterName: 'Tunde Bakare',
    title: 'Need a website for my business',
    description: 'Looking for someone to build a professional website for my small business. Should be mobile-friendly and modern.',
    category: 'Web Development',
    serviceMode: 'online',
    expectedDeliveryTime: '1 week',
    status: 'open',
    budget: 150000,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    requesterId: 'user2',
    requesterName: 'Funke Akindele',
    title: 'House cleaning service needed',
    description: 'Need deep cleaning for a 4-bedroom apartment. Must be available this weekend.',
    category: 'Cleaning',
    serviceMode: 'offline',
    location: 'Lekki, Lagos',
    expectedDeliveryTime: '1 day',
    status: 'open',
    budget: 25000,
    createdAt: '2024-01-16',
  },
  {
    id: '3',
    requesterId: 'user3',
    requesterName: 'Uche Nnamdi',
    title: 'Fix electrical issues in my house',
    description: 'Several electrical outlets not working properly. Need a certified electrician.',
    category: 'Electrical',
    serviceMode: 'offline',
    location: 'Victoria Island, Lagos',
    expectedDeliveryTime: '2 days',
    status: 'assigned',
    budget: 35000,
    createdAt: '2024-01-14',
    assignedProviderId: '3',
  },
];

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | ProviderProfile | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>(null);
  const [jobs, setJobs] = useState<Job[]>(mockJobs);

  const isAuthenticated = user !== null;

  const switchRole = (role: UserRole) => {
    setCurrentRole(role);
    if (user) {
      setUser({ ...user, role });
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        currentRole,
        switchRole,
        jobs,
        setJobs,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export { mockProviders };
