import { useState, useEffect, Suspense } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/AuthContext';
import { CompanyProvider, useCompany } from '@/CompanyContext';
import { ProtectedRoute, FounderRoute, RoleGate, TrialActiveRoute, TrialPausedRoute, TrialExpiredRoute } from '@/ProtectedRoute';
import { DashboardLayout } from '@components/DashboardLayout';
import { AccountPausedPage } from '@components/AccountPausedPage';
import { AccountExpiredPage } from '@components/AccountExpiredPage';
import { Dashboard } from '@components/Dashboard';
import { LeadsPage } from '@components/LeadsPage';
import { ReportsPage } from '@components/ReportsPage';
import { TeamPage } from '@components/TeamPage';
import { CallsPage } from '@components/CallsPage';
import { SettingsPage } from '@components/SettingsPage';
import { BillingPage } from '@components/BillingPage';
import IntegrationsPage from '@components/IntegrationsPage';
import { JoinPage } from '@components/JoinPage';
import { AIInsightsHub } from '@components/AIInsightsHub';
import { AutomationPage } from '@components/AutomationPage';
import { AnalyticsPage } from '@components/AnalyticsPage';
import { AuditLogPage } from '@components/AuditLogPage';
import { AnnouncementsPage } from '@components/AnnouncementsPage';
import { RoadmapPage } from '@components/RoadmapPage';
import { FoundersLab } from '@components/FoundersLab';
import { FounderHub } from '@components/FounderHub';
import { SequencesPage } from '@components/SequencesPage';
import { SchedulerPage } from '@components/SchedulerPage';
import { CommunicationPage } from '@components/CommunicationPage';
import { SupportPage } from '@components/SupportPage';
import { HelpCenterPage } from '@components/HelpCenterPage';
import { PrivacyPage } from '@components/PrivacyPage';
import { TermsPage } from '@components/TermsPage';
import { RefundPage } from '@components/RefundPage';
import { VideoTutorialsPage } from '@components/VideoTutorialsPage';
import { FeatureGate } from '@components/FeatureGate';
import { PipelineBoard } from '@components/PipelineBoard';
import { LandingPage } from '@/website/LandingPage';
import { ProductPage } from '@/website/pages/ProductPage';
import { MobileAppPage } from '@/website/pages/MobileAppPage';
import { SolutionsPage } from '@/website/pages/SolutionsPage';
import { SecurityPage } from '@/website/pages/SecurityPage';
import { PricingPage } from '@/website/pages/PricingPage';
import { CompanyPage } from '@/website/pages/CompanyPage';
import { ContactPage } from '@/website/pages/ContactPage';
import { IntegrationsPage as WebIntegrationsPage } from '@/website/pages/IntegrationsPage';
import { PrivacyPolicyPage } from '@/website/pages/PrivacyPolicyPage';
import { TermsOfServicePage } from '@/website/pages/TermsOfServicePage';
import { RefundPolicyPage } from '@/website/pages/RefundPolicyPage';
import { DocsPage } from '@/website/pages/DocsPage';
import { NotFoundPage } from '@/website/pages/NotFoundPage';
import { PlatformPage } from '@/website/pages/PlatformPage';
import { FaqPage } from '@/website/pages/FaqPage';
import Login from '@/components/Login';
import { 
  UserPlus,
  LayoutGrid,
  Search,
  ShieldCheck,
  Info,
  MoreHorizontal,
  PhoneCall, 
  Users, 
  CheckCircle2, 
  Clock,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  LogIn,
  Phone,
  Database,
  Sparkles,
  Lock,
  AlertCircle,
  Zap,
  ArrowRight,
  Filter,
  FileText,
  Plus,
  Inbox,
  Rocket,
  Layers,
  MapPin,
  Award,
  Target,
  BarChart3,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { OnboardingForm } from '@components/OnboardingForm';
import { ErrorBoundary } from '@components/ErrorBoundary';
import { sanitize } from '@/lib/sanitize';
import CallMindLoader from '@components/CallMindLoader';
import { TrialUpgradeModal } from '@components/TrialUpgradeModal';

// No-op - moved to direct imports for stability
// const Dashboard = lazy(() => import('@components/Dashboard'));
// ... other lazy imports moved up

import { supabase } from '@/supabaseClient';

const PageLoader = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC]">
    <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
  </div>
);

const AppContent = () => {
  const { 
    user, 
    profile, 
    isReady, 
    onboardingStatus, 
    hasFounderHubAccess 
  } = useAuth();
  
  const { companyId } = useCompany();
  const [enabledSections, setEnabledSections] = useState({
    sectionBEnabled: true,
    sectionKEnabled: true,
    sectionDEnabled: true,
  });

  const [activeTab, setActiveTab] = useState('Home');
  const navigate = useNavigate();
  const location = useLocation();

  // Load active modules toggles in real-time
  useEffect(() => {
    if (!companyId) return;

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('sectionBEnabled, sectionKEnabled, sectionDEnabled')
          .eq('id', companyId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setEnabledSections({
            sectionBEnabled: data.sectionBEnabled ?? true,
            sectionKEnabled: data.sectionKEnabled ?? true,
            sectionDEnabled: data.sectionDEnabled ?? true,
          });
        }
      } catch (err) {
        console.warn('[App] Failed to fetch company modules:', err);
      }
    };

    fetchSettings();

    const channel = supabase
      .channel(`company-settings-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'companies',
          filter: `id=eq.${companyId}`,
        },
        (payload) => {
          const data = payload.new;
          setEnabledSections({
            sectionBEnabled: data.sectionBEnabled ?? true,
            sectionKEnabled: data.sectionKEnabled ?? true,
            sectionDEnabled: data.sectionDEnabled ?? true,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  // Lifecycle Audit: Expose core context for debugging and legacy automation
  useEffect(() => {
    // SECURITY FIX: Removed window.currentUserProfile and window.onTabChange assignments to prevent PII exposure
  }, [profile]);

  // Route Synchronization: Align active tab state with URL deep links
  useEffect(() => {
    const path = location.pathname;
    const tabMap: Record<string, string> = {
      '/dashboard/ai': 'AI Insights',
      '/dashboard/calls': 'Calls',
      '/dashboard/sequences': 'Sequences',
      '/dashboard/scheduler': 'Scheduler',
      '/dashboard/reports': 'Reports',
      '/dashboard/team': 'Team',
      '/dashboard/integrations': 'Integrations',
      '/dashboard/communication': 'Communication',
      '/dashboard/analytics': 'Analytics',
      '/dashboard/subscription': 'Subscription',
      '/dashboard/support': 'Support',
      '/dashboard/help-center': 'Help Center',
      '/dashboard/settings': 'Settings',
      '/dashboard/audit-log': 'Audit Log',
      '/dashboard/announcements': 'Announcements',
      '/dashboard/legal/privacy': 'Privacy',
      '/dashboard/legal/terms': 'Terms',
      '/dashboard/legal/refund': 'Refund',
      '/dashboard/training': 'Video Guides',
    };

    // Logical Prefix Matching
    const matchedPath = Object.keys(tabMap).find(p => path.startsWith(p));
    if (matchedPath) {
      setActiveTab(tabMap[matchedPath]);
    } else if (path === '/dashboard') {
      setActiveTab('Home');
    }
  }, [location.pathname]);

  /**
   * Internal Product Module Router
   * Maintains existing product logic while enabling clean shell orchestration.
   */
  const renderDashboardContent = () => {
    let Content;
    switch (activeTab) {
      case 'Home': Content = <ErrorBoundary componentName="Dashboard"><Dashboard onTabChange={setActiveTab} /></ErrorBoundary>; break;
      case 'Leads': Content = <ErrorBoundary componentName="Leads"><LeadsPage onTabChange={setActiveTab} /></ErrorBoundary>; break;
      case 'Calls': Content = <ErrorBoundary componentName="Calls"><CallsPage onTabChange={setActiveTab} /></ErrorBoundary>; break;
      case 'AI Insights': 
        Content = enabledSections.sectionKEnabled ? <AIInsightsHub /> : null; 
        break;
      case 'Sequences': 
        Content = enabledSections.sectionDEnabled ? <SequencesPage /> : null; 
        break;
      case 'Scheduler': 
        Content = enabledSections.sectionDEnabled ? <SchedulerPage /> : null; 
        break;
      case 'Team': Content = <RoleGate requireAdmin={true}><ErrorBoundary componentName="Team"><TeamPage onTabChange={setActiveTab} /></ErrorBoundary></RoleGate>; break;
      case 'Analytics': Content = <RoleGate requireAdmin={true}><AnalyticsPage /></RoleGate>; break;
      case 'Automation': 
        Content = enabledSections.sectionDEnabled ? <RoleGate requireAdmin={true}><AutomationPage /></RoleGate> : null; 
        break;
      case 'Reports': Content = <RoleGate requireAdmin={true}><ErrorBoundary componentName="Reports"><ReportsPage /></ErrorBoundary></RoleGate>; break;
      case 'Settings': Content = <ErrorBoundary componentName="Settings"><SettingsPage /></ErrorBoundary>; break;
      case 'Subscription': Content = <RoleGate requireFounderOnly={true}><BillingPage /></RoleGate>; break;
      case 'Audit Log': Content = <RoleGate requireAdmin={true}><AuditLogPage /></RoleGate>; break;
      case 'Announcements': Content = <AnnouncementsPage />; break;
      case 'Roadmap': Content = <RoadmapPage />; break;
      case 'Integrations': 
        Content = enabledSections.sectionBEnabled ? <RoleGate requireFounderOnly={true}><IntegrationsPage /></RoleGate> : null; 
        break;
      case 'Founders Lab': Content = <RoleGate requireFounderOnly={true}><FoundersLab /></RoleGate>; break;
      case 'Communication': 
        Content = enabledSections.sectionBEnabled ? <CommunicationPage /> : null; 
        break;
      case 'Support':
      case 'Help Center':
        Content = <Navigate to="/dashboard/settings?tab=support" replace />;
        break;
      case 'Privacy': Content = <PrivacyPage />; break;
      case 'Terms': Content = <TermsPage />; break;
      case 'Refund': Content = <RefundPage />; break;
      case 'Video Guides': Content = <VideoTutorialsPage />; break;
      default: 
        console.warn("[App] Unknown tab requested:", activeTab);
        Content = <Dashboard onTabChange={setActiveTab} />;
    }

    return (
      <Suspense fallback={<PageLoader />}>
        {Content}
      </Suspense>
    );
  };

  return (
    <>
      <TrialUpgradeModal />
      <Routes>
      {/* 0. Legal Early-Exit: Public pages — no auth gate, no loading wait */}
      <Route path="/legal/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/legal/terms" element={<TermsOfServicePage />} />
      <Route path="/legal/refund" element={<RefundPolicyPage />} />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/refund" element={<RefundPolicyPage />} />
      {/* 1. Public Domain: Marketing and Multi-Page Enterprise Website */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/product" element={<ProductPage />} />
      <Route path="/platform" element={<PlatformPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/mobile-app" element={<MobileAppPage />} />
      <Route path="/solutions" element={<SolutionsPage />} />
      <Route path="/security" element={<SecurityPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/company" element={<CompanyPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/integrations" element={<WebIntegrationsPage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/docs/*" element={<DocsPage />} />
      <Route path="/resources" element={<Navigate to="/docs" replace />} />

      {/* 2. Authentication Entry: Handles redirecting active sessions away from login */}
      <Route path="/preview/loader" element={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><CallMindLoader onComplete={() => window.location.reload()} size="lg" text="Simulating loader..." /></div>} />
      <Route path="/login" element={
        isReady && user ? (
          <Navigate to={onboardingStatus !== 'completed' ? "/onboarding" : (hasFounderHubAccess ? "/founder-hub" : "/dashboard")} replace />
        ) : (
          !isReady ? (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white">
              <div className="relative w-12 h-12 mb-4">
                <div className="absolute inset-0 border-4 border-slate-50 rounded-full" />
                <div className="absolute inset-0 border-4 border-t-brand-500 rounded-full animate-spin" />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Initializing</p>
            </div>
          ) : <Login defaultMode="login" />
        )
      } />
      
      <Route path="/signup" element={
        isReady && user ? (
          <Navigate to={onboardingStatus !== 'completed' ? "/onboarding" : (hasFounderHubAccess ? "/founder-hub" : "/dashboard")} replace />
        ) : (
          !isReady ? (
            <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white">
              <div className="relative w-12 h-12 mb-4">
                <div className="absolute inset-0 border-4 border-slate-50 rounded-full" />
                <div className="absolute inset-0 border-4 border-t-brand-500 rounded-full animate-spin" />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest animate-pulse">Initializing</p>
            </div>
          ) : <Login defaultMode="signup" />
        )
      } />

      {/* 3. Onboarding Gating: Protected session entry but bypasses completion check */}
      <Route path="/onboarding" element={
        <ProtectedRoute requireOnboarding={false}>
          <OnboardingForm onComplete={() => navigate(hasFounderHubAccess ? '/founder-hub' : '/dashboard', { replace: true })} />
        </ProtectedRoute>
      } />

      <Route path="/account/paused" element={
        <ProtectedRoute requireOnboarding={false}>
          <TrialPausedRoute>
            <AccountPausedPage />
          </TrialPausedRoute>
        </ProtectedRoute>
      } />

      <Route path="/account/expired" element={
        <ProtectedRoute requireOnboarding={false}>
          <TrialExpiredRoute>
            <AccountExpiredPage />
          </TrialExpiredRoute>
        </ProtectedRoute>
      } />

      <Route path="/join" element={
        <ProtectedRoute requireOnboarding={false}>
          <Suspense fallback={<PageLoader />}>
            <JoinPage />
          </Suspense>
        </ProtectedRoute>
      } />

      {/* 4. Administrative Hub: Founder-only permission check */}
      <Route path="/founder-hub" element={
        <FounderRoute>
          <FounderHub />
        </FounderRoute>
      } />

      {/* 5. Production App Workspace: Fully guarded by authed & onboarded logic */}
      <Route path="/dashboard/*" element={
        <TrialActiveRoute>
          <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
            <Suspense fallback={<PageLoader />}>
              {renderDashboardContent()}
            </Suspense>
          </DashboardLayout>
        </TrialActiveRoute>
      } />

      {/* 6. Fallback: real 404 page for unknown routes (was a silent redirect
             to "/", i.e. a soft 404 that hid mistyped URLs from users and SEO). */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </>
  );
};


export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CompanyProvider>
          <Toaster position="bottom-right" toastOptions={{ className: 'font-bold text-sm shadow-2xl rounded-2xl' }} />
          <AppContent />
        </CompanyProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
