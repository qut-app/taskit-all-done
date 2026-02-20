import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppProvider } from "@/context/AppContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import OnboardingGuard from "@/components/OnboardingGuard";
import AdminGuard from "@/components/AdminGuard";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import RoleSelect from "./pages/RoleSelect";
import Dashboard from "./pages/Dashboard";
import Discover from "./pages/Discover";
import FindJobs from "./pages/FindJobs";
import PostJob from "./pages/PostJob";
import MyJobs from "./pages/MyJobs";
import Profile from "./pages/Profile";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import CompanyDashboard from "./pages/CompanyDashboard";
import CompanyUpgrade from "./pages/CompanyUpgrade";
import ViewProfile from "./pages/ViewProfile";
import Feed from "./pages/Feed";
import CompanySubscriptionGate from "./components/company/CompanySubscriptionGate";
import JobDetails from "./pages/JobDetails";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<AuthGuard><Onboarding /></AuthGuard>} />
                <Route path="/role-select" element={<AuthGuard><RoleSelect /></AuthGuard>} />
                <Route path="/dashboard" element={<AuthGuard><OnboardingGuard><Dashboard /></OnboardingGuard></AuthGuard>} />
                <Route path="/company-dashboard" element={<AuthGuard><OnboardingGuard><CompanyDashboard /></OnboardingGuard></AuthGuard>} />
                <Route path="/company/upgrade" element={<AuthGuard><OnboardingGuard><CompanyUpgrade /></OnboardingGuard></AuthGuard>} />
                <Route path="/discover" element={<AuthGuard><OnboardingGuard><Discover /></OnboardingGuard></AuthGuard>} />
                <Route path="/view-profile/:userId" element={<AuthGuard><OnboardingGuard><ViewProfile /></OnboardingGuard></AuthGuard>} />
                <Route path="/job/:jobId" element={<AuthGuard><OnboardingGuard><JobDetails /></OnboardingGuard></AuthGuard>} />
                <Route path="/find-jobs" element={<AuthGuard><OnboardingGuard><FindJobs /></OnboardingGuard></AuthGuard>} />
                <Route path="/post-job" element={<AuthGuard><OnboardingGuard><PostJob /></OnboardingGuard></AuthGuard>} />
                <Route path="/my-jobs" element={<AuthGuard><OnboardingGuard><MyJobs /></OnboardingGuard></AuthGuard>} />
                <Route path="/profile" element={<AuthGuard><OnboardingGuard><Profile /></OnboardingGuard></AuthGuard>} />
                <Route path="/feed" element={<AuthGuard><OnboardingGuard><Feed /></OnboardingGuard></AuthGuard>} />
                <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </AppProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
