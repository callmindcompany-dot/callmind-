import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface CompanyContextType {
  companyId: string | null;
  setCompanyId: (id: string | null) => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, loading } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Sync companyId with user profile data
  useEffect(() => {
    if (!loading) {
      if (profile?.companyId) {
        setCompanyId(profile.companyId);
      } else if (profile?.workspaceId) {
        setCompanyId(profile.workspaceId);
      } else if (profile?.onboardingStatus === 'completed') {
        // Fallback for onboarded users without an explicit companyId field yet
        // In this architecture, we use the user's UID as their personal isolated company ID
        setCompanyId(profile.uid ? `user_${profile.uid}` : null);
      } else {
        setCompanyId(null);
      }
    } else {
      setCompanyId(null);
    }
  }, [profile, loading]);

  const value = useMemo(() => ({ companyId, setCompanyId }), [companyId]);

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
