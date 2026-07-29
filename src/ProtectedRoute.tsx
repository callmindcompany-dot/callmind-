import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
  requireFounder?: boolean;
  requireSubscription?: boolean;
}

/**
 * Reusable role gate helper/component to protect arbitrary UI segments or screens.
 */
export const RoleGate: React.FC<{
  requireAdmin?: boolean;
  requireFounderOnly?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}> = ({ requireAdmin = false, requireFounderOnly = false, fallback, children }) => {
  const { profile, isFounder, isSubAdmin, isGodMode, hasFounderHubAccess } = useAuth();
  const isAdmin = isFounder || isGodMode;
  const isAdminOrSubAdmin = isAdmin || isSubAdmin;

  // Founder-only screens (Billing, Integrations, Founders Lab)
  if (requireFounderOnly && !isAdmin) {
    return <>{fallback || <Navigate to="/dashboard" replace />}</>;
  }

  // Admin-level screens (Team, Analytics, Reports) — Sub-Admins allowed
  if (requireAdmin && !isAdminOrSubAdmin) {
    return <>{fallback || <Navigate to="/dashboard" replace />}</>;
  }

  return <>{children}</>;
};

/**
 * World-Class Route Protection Layer for CallMind
 * Orchestrates auth state, onboarding gates, and permission-based routing.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireOnboarding = true,
  requireFounder = false,
  requireSubscription = false 
}) => {
  const { 
    isAuthenticated, 
    isOnboarded, 
    isReady, 
    hasFounderHubAccess,
    isFounder,
    isGodMode,
    profile,
    isLoggingOut
  } = useAuth();
  
  const location = useLocation();

  // 1. Session Resolution: Show high-performance splash while auth/profile resolves
  if (!isReady) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 border-4 border-slate-50 rounded-full" />
          <div className="absolute inset-0 border-4 border-t-amber-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
             <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-slate-900 font-bold text-lg tracking-tight">Securing Session</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">
            CallMind Network
          </p>
        </div>
      </div>
    );
  }

  // Prevent routing flash if actively logging out
  if (isLoggingOut) return null;

  // 2. Auth Gate: Bounce to login if no session exists or was recovered
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Founder Gate: Restrict administrative routes to authorized founder personas
  if (requireFounder && !hasFounderHubAccess) {
    console.warn("[Auth Guard] Unauthorized founder-hub attempt. Bouncing to dashboard.");
    return <Navigate to="/dashboard" replace />;
  }

  // 4. Onboarding Gate: Force-redirect to onboarding if profile is incomplete
  // We exclude the /onboarding route itself to prevent self-referential loops
  const isAtOnboarding = location.pathname === '/onboarding';
  
  if (requireOnboarding && !isOnboarded && !isAtOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  // 5. Success Loop: If already onboarded, don't allow backtracking to onboarding form
  if (isOnboarded && isAtOnboarding) {
    return <Navigate to="/dashboard" replace />;
  }

  // 6. Subscription Gate: Optional logic for premium/active plan locks
  if (requireSubscription) {
    const hasActivePlan = profile?.plan_status === 'active' || profile?.plan === 'enterprise';
    if (!hasActivePlan && location.pathname !== '/billing') {
      return <Navigate to="/billing" replace />;
    }
  }

  return <>{children}</>;
};

/**
 * TrialActiveRoute: Normal app flow for active trialers
 */
export const TrialActiveRoute: React.FC<ProtectedRouteProps> = (props) => {
  const { accountStatus } = useAuth();

  if (accountStatus === 'paused') return <Navigate to="/account/paused" replace />;
  if (accountStatus === 'deleted') return <Navigate to="/account/expired" replace />;

  return <ProtectedRoute {...props} />;
};

/**
 * TrialPausedRoute: Redirects to Paused page
 */
export const TrialPausedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { accountStatus } = useAuth();
  if (accountStatus !== 'paused') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

/**
 * TrialExpiredRoute: Redirects to Expired page
 */
export const TrialExpiredRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { accountStatus } = useAuth();
  if (accountStatus !== 'deleted') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

/**
 * FounderRoute (Specialized Shortcut)
 * Convenience component for wrapping internal tools.
 */
export const FounderRoute = ({ children }: { children: React.ReactNode }) => {
  return (
    <ProtectedRoute requireFounder={true} requireOnboarding={false}>
      {children}
    </ProtectedRoute>
  );
};
