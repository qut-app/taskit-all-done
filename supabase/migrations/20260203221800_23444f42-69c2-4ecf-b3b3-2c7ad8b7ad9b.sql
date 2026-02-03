-- Create all enums first
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.verification_status AS ENUM ('unverified', 'pending', 'verified');
CREATE TYPE public.service_mode AS ENUM ('online', 'offline', 'both');
CREATE TYPE public.job_status AS ENUM ('open', 'assigned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.subscription_type AS ENUM ('requester_unlimited', 'provider_slot_boost');

-- Create user roles table (CRITICAL: roles stored separately for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    location TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    date_of_birth DATE,
    avatar_url TEXT,
    national_id_number TEXT,
    face_verification_url TEXT,
    verification_status verification_status NOT NULL DEFAULT 'unverified',
    active_role TEXT DEFAULT 'requester',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create provider profiles table
CREATE TABLE public.provider_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    service_categories TEXT[] DEFAULT '{}',
    service_description TEXT,
    service_mode service_mode DEFAULT 'both',
    delivery_time TEXT DEFAULT '3 days',
    active_job_slots INTEGER DEFAULT 0,
    max_job_slots INTEGER DEFAULT 3,
    rating DECIMAL(3, 2) DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    on_time_delivery_score INTEGER DEFAULT 100,
    is_recommended BOOLEAN DEFAULT false,
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;

-- Create work showcase table
CREATE TABLE public.work_showcases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES public.provider_profiles(id) ON DELETE CASCADE NOT NULL,
    media_url TEXT NOT NULL,
    media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    caption TEXT,
    display_order INTEGER DEFAULT 0,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.work_showcases ENABLE ROW LEVEL SECURITY;

-- Create service categories table
CREATE TABLE public.service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- Create jobs table
CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    service_mode service_mode NOT NULL,
    location TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    expected_delivery_time TEXT NOT NULL,
    status job_status DEFAULT 'open',
    budget DECIMAL(12, 2),
    assigned_provider_count INTEGER DEFAULT 0,
    max_providers INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Create job applications table
CREATE TABLE public.job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (job_id, provider_id)
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Create reviews table
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    overall_rating DECIMAL(3, 2),
    comment TEXT,
    is_late_delivery BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create subscriptions table
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subscription_type subscription_type NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
    amount DECIMAL(12, 2) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create ads table (admin managed)
CREATE TABLE public.ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image_url TEXT,
    link_url TEXT,
    ad_type TEXT DEFAULT 'banner' CHECK (ad_type IN ('banner', 'featured_provider')),
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Create function to check if user is verified
CREATE OR REPLACE FUNCTION public.is_user_verified(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT verification_status = 'verified'
    FROM public.profiles
    WHERE user_id = _user_id
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for provider_profiles
CREATE POLICY "Anyone can view provider profiles" ON public.provider_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own provider profile" ON public.provider_profiles FOR ALL TO authenticated USING (user_id = auth.uid());

-- RLS Policies for work_showcases
CREATE POLICY "Anyone can view approved showcases" ON public.work_showcases FOR SELECT TO authenticated USING (is_approved = true OR EXISTS (SELECT 1 FROM public.provider_profiles pp WHERE pp.id = provider_id AND pp.user_id = auth.uid()));
CREATE POLICY "Providers can manage own showcases" ON public.work_showcases FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.provider_profiles pp WHERE pp.id = provider_id AND pp.user_id = auth.uid()));
CREATE POLICY "Admins can manage all showcases" ON public.work_showcases FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for service_categories
CREATE POLICY "Anyone can view active categories" ON public.service_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON public.service_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for jobs
CREATE POLICY "Anyone can view open jobs" ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Verified users can create jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid() AND public.is_user_verified(auth.uid()));
CREATE POLICY "Requesters can update own jobs" ON public.jobs FOR UPDATE TO authenticated USING (requester_id = auth.uid());
CREATE POLICY "Requesters can delete own jobs" ON public.jobs FOR DELETE TO authenticated USING (requester_id = auth.uid());

-- RLS Policies for job_applications
CREATE POLICY "Job owners can view applications" ON public.job_applications FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.requester_id = auth.uid()) OR provider_id = auth.uid());
CREATE POLICY "Verified providers can apply" ON public.job_applications FOR INSERT TO authenticated WITH CHECK (provider_id = auth.uid() AND public.is_user_verified(auth.uid()));
CREATE POLICY "Providers can update own applications" ON public.job_applications FOR UPDATE TO authenticated USING (provider_id = auth.uid() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.requester_id = auth.uid()));

-- RLS Policies for reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (reviewer_id = auth.uid());

-- RLS Policies for subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for ads
CREATE POLICY "Anyone can view active ads" ON public.ads FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage ads" ON public.ads FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'), NEW.email);
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_provider_profiles_updated_at BEFORE UPDATE ON public.provider_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default service categories
INSERT INTO public.service_categories (name, icon) VALUES
    ('Cleaning', 'sparkles'), ('Plumbing', 'wrench'), ('Electrical', 'zap'), ('Carpentry', 'hammer'),
    ('Painting', 'paintbrush'), ('Moving', 'truck'), ('Tutoring', 'book-open'), ('Web Development', 'code'),
    ('Graphic Design', 'palette'), ('Writing', 'pen-tool'), ('Photography', 'camera'), ('Video Editing', 'film'),
    ('Social Media', 'share-2'), ('Virtual Assistant', 'headphones'), ('Data Entry', 'database'), ('Translation', 'globe'),
    ('Cooking', 'utensils'), ('Gardening', 'flower'), ('Pet Care', 'heart'), ('Delivery', 'package');