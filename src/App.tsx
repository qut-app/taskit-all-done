import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AppProvider } from "@/context/AppContext";
import ErrorBoundary from "@/components/ErrorBoundary";
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
import ViewProfile from "./pages/ViewProfile";

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
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/role-select" element={<RoleSelect />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/company-dashboard" element={<CompanyDashboard />} />
                <Route path="/discover" element={<Discover />} />
                <Route path="/view-profile/:userId" element={<ViewProfile />} />
                <Route path="/find-jobs" element={<FindJobs />} />
                <Route path="/post-job" element={<PostJob />} />
                <Route path="/my-jobs" element={<MyJobs />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin" element={<AdminDashboard />} />
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
