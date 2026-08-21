import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase, isSupabasePlaceholder } from './supabase';
import { formatAuthError } from './authErrors';

WebBrowser.maybeCompleteAuthSession();

/**
 * CallMind Mobile Auth Context
 * 
 * Role Enforcement: Only `telecaller` role users can use the mobile app.
 * Admin/Founder accounts are blocked with an error message.
 */

export interface MobileUserProfile {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  designation?: string;
  companyId?: string;
  companyName?: string;
  city?: string;
  goals?: string[];
  role: 'telecaller' | 'team_lead' | 'floor_manager';
  onboardingStatus: 'pending' | 'completed';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  avatarUrl?: string;
  createdAt?: string;
}

interface MobileAuthContextType {
  // State
  user: any | null;
  profile: MobileUserProfile | null;
  initialized: boolean;
  loading: boolean;

  // Computed
  isAuthenticated: boolean;
  isOnboarded: boolean;
  isApproved: boolean;
  isAdminBlocked: boolean;

  // Auth Methods
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;

  // Profile Methods
  updateProfile: (data: Partial<MobileUserProfile>) => Promise<void>;
  completeOnboarding: (data: Partial<MobileUserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;

  // Error
  authError: string | null;
  clearError: () => void;
}

const MobileAuthContext = createContext<MobileAuthContextType | null>(null);

export const MobileAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<MobileUserProfile | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAdminBlocked, setIsAdminBlocked] = useState(false);

  const clearError = useCallback(() => setAuthError(null), []);

  /**
   * Fetch user profile from Supabase `users` table
   */
  const fetchProfile = useCallback(async (uid: string, email?: string) => {
    if (isSupabasePlaceholder) return null;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        console.error('[MobileAuth] Profile fetch error:', error);
        return null;
      }

      if (data) {
        // Role Guard: Block admin/founder accounts from mobile
        if (data.role === 'founder' || data.role === 'sub_admin') {
          setIsAdminBlocked(true);
          setAuthError('This account has admin access. Please use the web dashboard at callmind.ai');
          await supabase.auth.signOut();
          return null;
        }

        const mapped: MobileUserProfile = {
          uid: data.id,
          email: data.email || email || '',
          name: data.name || '',
          phone: data.phone || '',
          designation: data.designation || 'Telecaller',
          companyId: data.company_id || '',
          companyName: data.company_name || '',
          city: data.city || '',
          goals: data.goals || [],
          role: data.role || 'telecaller',
          onboardingStatus: data.onboarding_status || 'pending',
          approvalStatus: data.approval_status || 'pending',
          avatarUrl: data.avatar_url || '',
          createdAt: data.created_at,
        };
        setProfile(mapped);
        return mapped;
      }

      return null;
    } catch (e) {
      console.error('[MobileAuth] Profile fetch exception:', e);
      return null;
    }
  }, []);

  /**
   * Core Auth Listener
   */
  useEffect(() => {
    if (isSupabasePlaceholder) {
      console.warn('[MobileAuth] Supabase not configured — running in offline mode');
      setUser(null);
      setProfile(null);
      setInitialized(true);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id, session.user.email || undefined);
      }
      setInitialized(true);
      setLoading(false);
    });

    // 2. Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id, session.user.email || undefined);
      } else {
        setUser(null);
        setProfile(null);
        setIsAdminBlocked(false);
      }
      setInitialized(true);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  /**
   * Google Sign-In via Supabase OAuth with in-app WebBrowser
   */
  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setIsAdminBlocked(false);

    if (isSupabasePlaceholder) {
      console.warn('[MobileAuth] Supabase not configured. Google Sign-In unavailable.');
      setAuthError('Supabase is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }

    try {
      const redirectUrl = Linking.createURL('google-auth');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (error) throw error;
      if (!data?.url) {
        throw new Error('Could not retrieve authentication URL from Supabase.');
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type === 'success' && result.url) {
        const url = result.url;

        // 1. PKCE flow (code=...)
        if (url.includes('code=')) {
          const parsed = Linking.parse(url);
          const code = (parsed.queryParams?.code as string) || '';
          if (code) {
            const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
            if (sessionError) throw sessionError;
            if (sessionData.session?.user) {
              setUser(sessionData.session.user);
              await fetchProfile(sessionData.session.user.id, sessionData.session.user.email || undefined);
            }
            return;
          }
        }

        // 2. Implicit / Hash flow (#access_token=...&refresh_token=...)
        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        if (url.includes('#')) {
          const hashPart = url.split('#')[1];
          const params = new URLSearchParams(hashPart);
          accessToken = params.get('access_token');
          refreshToken = params.get('refresh_token');
        } else if (url.includes('?')) {
          const queryPart = url.split('?')[1];
          const params = new URLSearchParams(queryPart);
          accessToken = params.get('access_token');
          refreshToken = params.get('refresh_token');
        }

        if (accessToken && refreshToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
          if (sessionData.session?.user) {
            setUser(sessionData.session.user);
            await fetchProfile(sessionData.session.user.id, sessionData.session.user.email || undefined);
          }
        }
      }
    } catch (e: any) {
      console.error('[MobileAuth] Google Sign-In error:', e);
      const parsed = formatAuthError(e);
      setAuthError(parsed.message);
    }
  }, [fetchProfile]);

  /**
   * Email / Password Sign-In
   */
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    setIsAdminBlocked(false);

    if (isSupabasePlaceholder) {
      setAuthError('Supabase is not configured.');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id, data.user.email || undefined);
      }
    } catch (e: any) {
      console.error('[MobileAuth] Email Sign-In error:', e);
      const parsed = formatAuthError(e);
      setAuthError(parsed.message);
    }
  }, [fetchProfile]);

  /**
   * Email / Password Sign-Up
   */
  const signUpWithEmail = useCallback(async (email: string, password: string, name: string) => {
    setAuthError(null);
    setIsAdminBlocked(false);

    if (isSupabasePlaceholder) {
      setAuthError('Supabase is not configured.');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
        },
      });

      if (error) throw error;
      if (data.user) {
        setUser(data.user);
        await fetchProfile(data.user.id, data.user.email || undefined);
      }
    } catch (e: any) {
      console.error('[MobileAuth] Email Sign-Up error:', e);
      const parsed = formatAuthError(e);
      setAuthError(parsed.message);
    }
  }, [fetchProfile]);

  /**
   * Sign Out
   */
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setIsAdminBlocked(false);
      setAuthError(null);
    } catch (e) {
      console.error('[MobileAuth] Sign out error:', e);
    }
  }, []);

  /**
   * Update Profile in Supabase
   */
  const updateProfile = useCallback(async (data: Partial<MobileUserProfile>) => {
    if (isSupabasePlaceholder || !user) return;

    try {
      const updatePayload: Record<string, any> = {};
      if (data.name !== undefined) updatePayload.name = data.name;
      if (data.phone !== undefined) updatePayload.phone = data.phone;
      if (data.designation !== undefined) updatePayload.designation = data.designation;
      if (data.city !== undefined) updatePayload.city = data.city;
      if (data.goals !== undefined) updatePayload.goals = data.goals;
      if (data.companyId !== undefined) updatePayload.company_id = data.companyId;
      if (data.companyName !== undefined) updatePayload.company_name = data.companyName;

      const { error } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', user.id);

      if (error) throw error;

      // Refresh local profile
      setProfile(prev => prev ? { ...prev, ...data } : prev);
    } catch (e) {
      console.error('[MobileAuth] Update profile error:', e);
    }
  }, [user]);

  /**
   * Complete Onboarding — save profile data + mark as completed
   */
  const completeOnboarding = useCallback(async (data: Partial<MobileUserProfile>) => {
    if (!user) return;

    // Immediately establish local profile state with onboarding completed
    const updatedProfile: MobileUserProfile = {
      uid: user.id,
      email: user.email || '',
      name: data.name || user.user_metadata?.full_name || '',
      phone: data.phone || '',
      designation: data.designation || 'Telecaller',
      companyId: profile?.companyId || '',
      companyName: profile?.companyName || '',
      city: data.city || '',
      goals: data.goals || ['Lead Management', 'Call Tracking'],
      role: profile?.role || 'telecaller',
      onboardingStatus: 'completed',
      approvalStatus: profile?.approvalStatus || 'approved',
      avatarUrl: profile?.avatarUrl || '',
    };
    setProfile(updatedProfile);

    // Persist to Supabase if available
    if (!isSupabasePlaceholder) {
      try {
        const { error } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email,
            name: updatedProfile.name,
            phone: updatedProfile.phone,
            designation: updatedProfile.designation,
            city: updatedProfile.city,
            role: 'telecaller',
            onboarding_status: 'completed',
          }, { onConflict: 'id' });

        if (error) {
          console.warn('[MobileAuth] completeOnboarding upsert warning:', error);
        } else {
          await fetchProfile(user.id, user.email);
        }
      } catch (e) {
        console.warn('[MobileAuth] Complete onboarding server sync error:', e);
      }
    }
  }, [user, profile, fetchProfile]);

  /**
   * Refresh Profile
   */
  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id, user.email);
    }
  }, [user, fetchProfile]);

  // Computed values
  const isAuthenticated = useMemo(() => !!user && !isAdminBlocked, [user, isAdminBlocked]);
  const isOnboarded = useMemo(() => profile?.onboardingStatus === 'completed', [profile]);
  const isApproved = useMemo(() => profile?.approvalStatus === 'approved', [profile]);

  const contextValue = useMemo<MobileAuthContextType>(() => ({
    user,
    profile,
    initialized,
    loading,
    isAuthenticated,
    isOnboarded,
    isApproved,
    isAdminBlocked,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    updateProfile,
    completeOnboarding,
    refreshProfile,
    authError,
    clearError,
  }), [
    user, profile, initialized, loading,
    isAuthenticated, isOnboarded, isApproved, isAdminBlocked,
    signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, updateProfile, completeOnboarding, refreshProfile,
    authError, clearError,
  ]);

  return (
    <MobileAuthContext.Provider value={contextValue}>
      {children}
    </MobileAuthContext.Provider>
  );
};

export const useMobileAuth = (): MobileAuthContextType => {
  const context = useContext(MobileAuthContext);
  if (!context) {
    throw new Error('useMobileAuth must be used within a MobileAuthProvider');
  }
  return context;
};
