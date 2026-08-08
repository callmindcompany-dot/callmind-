import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
  useCallback,
} from "react";
import { supabase } from "./supabaseClient";
import { FOUNDER_OWNERS, INTERNAL_TEAM, USER_PERSPECTIVE_TESTERS } from "./constants";
import { sanitize } from "./lib/sanitize";

/**
 * CallMind Supabase Auth Integration
 */

export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  phoneNumber?: string;
  designation?: string;
  companyName?: string;
  companySize?: string;
  companyIndustry?: string;
  onboardingStatus?: "pending" | "completed";
  onboardingStep?: number;
  intendedUserCount?: number;
  goals?: string[];
  role?: "founder" | "tester" | "user" | "sub_admin";
  // Mirrors the CHECK constraints on public.companies.
  plan?: "trial" | "starter" | "growth" | "pro";
  plan_status?: "trialing" | "active" | "past_due" | "expired" | "cancelled";
  trialEndsAt?: any;
  trialStartDate?: any;
  trialEndDate?: any;
  trialStatus?: "active" | "paused" | "extended" | "converted" | "expired";
  trialExtensionCount?: number;
  accountStatus?: "trial" | "active" | "paused" | "deleted";
  dataRetentionDate?: any;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

interface AuthContextType {
  // Base State
  user: any | null;
  profile: UserProfile | null;
  
  // Status Flags
  initialized: boolean;
  loading: boolean;
  profileLoading: boolean;
  isReady: boolean;

  // Auth Methods
  signIn: (email: string, password?: string) => Promise<void>;
  signUp: (email: string, password?: string, additionalData?: any) => Promise<any>;
  signOut: () => Promise<void>;
  isLoggingOut: boolean;
  signInWithGoogle: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  updateUserPassword: (newPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  
  // Profile Methods
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  completeOnboarding: (data?: any) => Promise<void>;
  checkUserExistsByEmail: (email: string) => Promise<boolean>;

  // Computed / Logic Flags
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isOnboarded: boolean;
  onboardingStatus: "pending" | "completed";
  
  // Role & Access
  isSuperFounder: boolean;
  isFounder: boolean;
  isSubAdmin: boolean;
  isTester: boolean;
  isInternal: boolean;
  hasFounderHubAccess: boolean;
  isGodMode: boolean;

  // Subscription / Trial
  plan_status: string;
  trialStatus: string;
  accountStatus: string;
  hasExpiredTrial: boolean;
  trialDaysRemaining: number;
  resetTrial: () => Promise<void>;
  refreshTrialStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [trialApiStatus, setTrialApiStatus] = useState<any>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isPlaceholder = !import.meta.env.VITE_SUPABASE_URL || 
                        !import.meta.env.VITE_SUPABASE_ANON_KEY || 
                        import.meta.env.VITE_SUPABASE_URL.includes('your-project-id');

  /**
   * TRIAL STATUS FETCHER
   */
  const refreshTrialStatus = useCallback(async () => {
    if (isPlaceholder || !user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const baseUrl = typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
        ? window.location.origin
        : 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/trial/status`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTrialApiStatus(data);
      }
    } catch (e) {
      console.error("[Auth] Failed to refresh trial status:", e);
    }
  }, [user, isPlaceholder]);

  useEffect(() => {
    if (user && !loading) {
      refreshTrialStatus();
    }
  }, [user, loading, refreshTrialStatus]);

  /**
   * CORE AUTH LISTENER
   */
  useEffect(() => {
    if (isPlaceholder) {
      console.warn('[AuthContext] Supabase is not configured...');
      setUser(null);
      setProfile(null);
      setInitialized(true);
      setLoading(false);
      return;
    }

    // Set initial loading state
    setLoading(true);

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchAndSubscribeProfile(session.user.id, session.user.email);
      } else {
        setLoading(false);
      }
      setInitialized(true);
    });

    // 2. Listen to Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchAndSubscribeProfile(session.user.id, session.user.email);
      } else {
        clearState();
      }
      setInitialized(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchAndSubscribeProfile = async (uid: string, email?: string | null) => {
    setProfileLoading(true);
    try {
      const normalizedEmail = (email || "unknown").toLowerCase();
      const isFounderOwner = FOUNDER_OWNERS.includes(normalizedEmail);
      const isTesterAccount = USER_PERSPECTIVE_TESTERS.includes(normalizedEmail);
      const isInternal = isFounderOwner || isTesterAccount || INTERNAL_TEAM.includes(normalizedEmail);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        console.error('[AuthContext] Failed to fetch profile:', error);
      }

      if (!data) {
        // Create initial profile
        const initialProfile: UserProfile = {
          uid,
          email: normalizedEmail,
          role: isTesterAccount ? 'tester' : 'founder',
          onboardingStatus: isInternal ? "completed" : "pending",
          plan: "trial",
          plan_status: "trialing",
          createdAt: new Date().toISOString(),
        };

        const { error: insertError } = await supabase
          .from('users')
          .insert([{
            id: uid,
            email: normalizedEmail,
            role: initialProfile.role,
            onboarding_status: initialProfile.onboardingStatus,
            plan_status: 'active'
          }]);

        if (insertError) {
          console.error('[AuthContext] Failed to create profile:', insertError);
        }
        setProfile(initialProfile);
      } else {
        // Map Supabase fields to local profile
        setProfile({
          uid: data.id,
          email: data.email,
          name: data.name,
          phoneNumber: data.phone,
          designation: data.designation,
          role: data.role,
          onboardingStatus: data.onboarding_status,
          companyId: data.company_id,
          plan_status: data.plan_status,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProfileLoading(false);
      setLoading(false);
    }
  };

  const clearState = () => {
    setUser(null);
    setProfile(null);
    setLoading(false);
    setProfileLoading(false);
  };

  /**
   * AUTHENTICATION ACTIONS
   */

  const signIn = async (email: string, password?: string) => {
    const normalizedEmail = email.toLowerCase().trim();

    if (isPlaceholder || (import.meta.env.DEV && password === 'mock')) {
      console.warn('[AuthContext] Using mock authentication fallback.');
      const isFounderOwner = FOUNDER_OWNERS.includes(normalizedEmail);
      const isTesterAccount = USER_PERSPECTIVE_TESTERS.includes(normalizedEmail);
      const isInternal = isFounderOwner || isTesterAccount || INTERNAL_TEAM.includes(normalizedEmail);

      const mockUser = {
        id: "mock_uid_" + btoa(normalizedEmail).replace(/=/g, ''),
        email: normalizedEmail,
        emailVerified: true,
        displayName: normalizedEmail.split('@')[0],
      };

      const mockProfile: UserProfile = {
        uid: mockUser.id,
        email: normalizedEmail,
        name: isFounderOwner ? "CallMind Founder (Mock)" : (normalizedEmail.split('@')[0] + " (Demo)"),
        role: isFounderOwner ? 'founder' : (isTesterAccount ? 'tester' : 'user'),
        onboardingStatus: "completed",
        plan: "trial",
        plan_status: "trialing",
        createdAt: new Date().toISOString(),
      };

      setUser(mockUser);
      setProfile(mockProfile);
      localStorage.setItem('mock_user', JSON.stringify(sanitize({ user: mockUser, profile: mockProfile })));
      localStorage.setItem('rememberMe', 'true');
      return;
    }

    if (!password) {
      throw new Error("Password is required for login.");
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) throw error;
    localStorage.setItem('rememberMe', 'true');
  };

  const signUp = async (email: string, password?: string, additionalData?: any) => {
    const normalizedEmail = email.toLowerCase().trim();

    if (isPlaceholder) {
      console.warn('[AuthContext] Supabase is not configured. Creating mock user.');
      const mockUser = {
        id: "mock_uid_" + btoa(normalizedEmail).replace(/=/g, ''),
        email: normalizedEmail,
        emailVerified: true,
      };

      const { password: _, ...safeData } = additionalData || {};
      const mockProfile: UserProfile = {
        uid: mockUser.id,
        email: normalizedEmail,
        name: safeData?.name || (normalizedEmail.split('@')[0] + " (Demo)"),
        onboardingStatus: "completed",
        role: 'user',
        plan: 'trial',
        plan_status: "trialing",
        createdAt: new Date().toISOString(),
        ...safeData
      };

      setUser(mockUser);
      setProfile(mockProfile);
      localStorage.setItem('mock_user', JSON.stringify(sanitize({ user: mockUser, profile: mockProfile })));
      localStorage.setItem('rememberMe', 'true');
      return;
    }

    if (!password) {
      throw new Error("Password required for registration.");
    }

    const { data: { user: supabaseUser, session }, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name: additionalData?.name || normalizedEmail.split('@')[0],
          role: 'founder'
        }
      }
    });

    if (error) throw error;
    localStorage.setItem('rememberMe', 'true');

    if (supabaseUser) {
      // Create profile record explicitly in client using upsert
      const { password: _, ...safeData } = additionalData || {};
      await supabase.from('users').upsert([{
        id: supabaseUser.id,
        email: normalizedEmail,
        name: safeData?.name || normalizedEmail.split('@')[0],
        phone: safeData?.phoneNumber || null,
        designation: safeData?.designation || null,
        onboarding_status: 'pending',
        role: 'founder'
      }], { onConflict: 'id' });
    }

    return { user: supabaseUser, session };
  };

  const signInWithGoogle = async () => {
    if (isPlaceholder) {
      console.warn('[AuthContext] Supabase not configured. Google Sign In mocked.');
      await signIn('founder@callmind.ai');
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          prompt: 'select_account',
        }
      }
    });
    if (error) throw error;
    localStorage.setItem('rememberMe', 'true');
  };

  const sendPasswordResetEmail = async (email: string) => {
    if (isPlaceholder) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  const sendVerificationEmail = async () => {
    // Supabase handles email verification automatically based on project configurations
  };
  
  const updateUserPassword = async (newPassword: string) => {
    if (isPlaceholder) return;
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  const changePassword = async (current: string, newPass: string) => {
    if (isPlaceholder) {
      await updateUserPassword(newPass);
      return;
    }
    // Re-authenticate to verify current password before allowing change
    const normalizedEmail = user?.email?.toLowerCase().trim();
    if (!normalizedEmail) throw new Error('No authenticated user email found');
    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: current,
    });
    if (reAuthError) throw new Error('Current password is incorrect');
    await updateUserPassword(newPass);
  };

  const refreshUser = async () => {
    if (isPlaceholder) return;
    const { data: { user: freshUser } } = await supabase.auth.getUser();
    if (freshUser) {
      setUser(freshUser);
    }
  };

  const signOut = async () => {
    setIsLoggingOut(true);
    try {
      if (!isPlaceholder) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error("[Auth] Sign out warning:", e);
    } finally {
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('mock_user');
      localStorage.removeItem('user_view_active');
      window.location.href = '/';
    }
  };

  /**
   * PROFILE ACTIONS
   */

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!user) return;
    
    // Deconstruct fields
    const updatePayload = {
      name: data.name,
      phone: data.phoneNumber,
      designation: data.designation,
      company_id: data.companyId,
      role: data.role,
      onboarding_status: data.onboardingStatus,
      updated_at: new Date().toISOString()
    };

    // Filter out undefined values to prevent overwriting
    Object.keys(updatePayload).forEach(key => {
      if ((updatePayload as any)[key] === undefined) {
        delete (updatePayload as any)[key];
      }
    });

    if (isPlaceholder) {
      const updatedProfile = { ...profile, ...data } as UserProfile;
      setProfile(updatedProfile);
      localStorage.setItem('mock_user', JSON.stringify(sanitize({ user, profile: updatedProfile })));
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', user.id || user.uid);

      if (error) throw error;

      // Update state locally
      setProfile(prev => prev ? ({ ...prev, ...data }) : null);
    } catch (e) {
      console.error("[Auth] Profile update failure:", e);
      throw e;
    }
  }, [user, profile, isPlaceholder]);

  const completeOnboarding = useCallback(async (data?: any) => {
    await updateProfile({ 
      onboardingStatus: "completed",
      ...data
    });
  }, [updateProfile]);

  const resetTrial = useCallback(async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    await updateProfile({ 
      trialEndsAt: futureDate,
      plan_status: "active"
    });
  }, [updateProfile]);

  const checkUserExistsByEmail = async (email: string) => {
    if (isPlaceholder) return false;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (error) return false;
      return !!data;
    } catch {
      return false;
    }
  };

  /**
   * COMPUTED LOGIC & ACCESSORS
   */
  // This used to overwrite every profile with `plan: 'Growth'` and
  // `plan_status: 'active'`, which meant no customer was ever on the plan they
  // paid for and every limit downstream was dead. Entitlement now comes from
  // the company row via usePlan(); this is a plain pass-through kept only so
  // the existing references below do not all have to change at once.
  const profileWithOverrides = profile;

  const isAuthenticated = !!user;
  const isEmailVerified = user?.email_confirmed_at !== undefined || user?.emailVerified || false;
  const onboardingStatus = (profileWithOverrides?.onboardingStatus || "pending") as "pending" | "completed";
  const isOnboarded = onboardingStatus === "completed";

  const normalizedEmail = user?.email?.toLowerCase().trim() || "";

  const isSuperFounder = useMemo(() => FOUNDER_OWNERS.includes(normalizedEmail), [normalizedEmail]);
  const isFounder = useMemo(() => profileWithOverrides?.role === 'founder' || isSuperFounder, [profileWithOverrides?.role, isSuperFounder]);
  const isSubAdmin = useMemo(() => profileWithOverrides?.role === 'sub_admin', [profileWithOverrides?.role]);
  const isTester = useMemo(() => profileWithOverrides?.role === 'tester' || USER_PERSPECTIVE_TESTERS.includes(normalizedEmail), [profileWithOverrides?.role, normalizedEmail]);
  const isInternal = useMemo(() => isSuperFounder || isTester || INTERNAL_TEAM.includes(normalizedEmail), [isSuperFounder, isTester, normalizedEmail]);
  const hasFounderHubAccess = isSuperFounder; 
  const isGodMode = useMemo(() => isSuperFounder || INTERNAL_TEAM.includes(normalizedEmail), [isSuperFounder, normalizedEmail]);

  const plan_status = profileWithOverrides?.plan_status || "active";

  const trialStatus = useMemo(() => {
    if (isGodMode) return "active";
    if (trialApiStatus?.trialStatus) return trialApiStatus.trialStatus;
    return profileWithOverrides?.trialStatus || "active";
  }, [isGodMode, trialApiStatus, profileWithOverrides]);

  const accountStatus = useMemo(() => {
    if (isGodMode) return "active";
    if (trialApiStatus?.accountStatus) return trialApiStatus.accountStatus;
    return profileWithOverrides?.accountStatus || "active";
  }, [isGodMode, trialApiStatus, profileWithOverrides]);

  const hasExpiredTrial = useMemo(() => {
    if (isGodMode) return false;

    const activePlans = ['starter', 'pro', 'growth', 'business', 'enterprise'];
    const userPlan = (profileWithOverrides?.plan || profileWithOverrides?.subscriptionPlan || '').toLowerCase();
    const userPlanStatus = (profileWithOverrides?.planStatus || profileWithOverrides?.plan_status || '').toLowerCase();

    if (userPlanStatus === 'active' || (userPlan && activePlans.includes(userPlan))) {
      return false;
    }

    if (trialStatus === 'expired' || accountStatus === 'deleted') return true;
    return false;
  }, [isGodMode, trialStatus, accountStatus, profileWithOverrides]);

  const trialEndsAt = useMemo(() => {
    if (isGodMode) return new Date('2030-01-01');
    if (profileWithOverrides?.trialEndsAt) return new Date(profileWithOverrides.trialEndsAt);
    if (profileWithOverrides?.createdAt) {
      const created = new Date(profileWithOverrides.createdAt);
      created.setDate(created.getDate() + 7);
      return created;
    }
    return new Date('2030-01-01');
  }, [isGodMode, profileWithOverrides]);

  /**
   * @deprecated Use `usePlan().can('sequences')`.
   *
   * Kept for one release so the remaining call sites in LeadsPage can migrate
   * separately. It is no longer an entitlement check -- it only says the
   * account is in good standing.
   */
  const canAccessSequences = isGodMode || plan_status === 'active' || plan_status === 'trialing';


  const trialDaysRemaining = useMemo(() => {
    if (isGodMode) return 365;
    if (trialApiStatus?.daysRemaining !== undefined) return trialApiStatus.daysRemaining;
    if (!trialEndsAt) return 0;
    const diff = trialEndsAt.getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [isGodMode, trialEndsAt, trialApiStatus]);

  // featureFlags is gone. It read profile.featureFlags, and no migration
  // creates that column -- so it was permanently {} and every flag read from it
  // was permanently undefined. Three screens gated themselves on it: the
  // Scheduler hid itself from every telecaller behind a message telling them to
  // ask an admin to enable it, and Sequences and AI Insights showed their AI
  // parts as unavailable regardless of the real setting. The kill switch that
  // does work reads companies.ai_enabled.
  const isReady = initialized && (!user || (user && !profileLoading));

  const value = useMemo(
    () => ({
      user,
      profile: profileWithOverrides,
      loading,
      profileLoading,
      isReady,
      initialized,
      signIn,
      signUp,
      signOut,
      isLoggingOut,
      signInWithGoogle,
      sendPasswordResetEmail,
      sendVerificationEmail,
      updateUserPassword,
      changePassword,
      refreshUser,
      updateProfile,
      completeOnboarding,
      checkUserExistsByEmail,
      isAuthenticated,
      isEmailVerified,
      isOnboarded,
      onboardingStatus,
      isSuperFounder,
      isFounder,
      isSubAdmin,
      isTester,
      isInternal,
      hasFounderHubAccess,
      isGodMode,
      plan_status,
      trialStatus,
      accountStatus,
      hasExpiredTrial,
      trialDaysRemaining,
      resetTrial,
      refreshTrialStatus,
      canAccessSequences,
    }),
    [
      user, profileWithOverrides, loading, profileLoading, isReady, initialized, onboardingStatus, 
      resetTrial, trialStatus, accountStatus, trialDaysRemaining, trialApiStatus, 
      refreshTrialStatus, isSuperFounder, isFounder, isSubAdmin, isTester, isInternal, 
      hasFounderHubAccess, isGodMode, plan_status, hasExpiredTrial, 
      canAccessSequences
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthContext provider missing");
  return ctx;
};
