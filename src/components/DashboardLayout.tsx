import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Bell, Search, Plus, Lock, AlertTriangle, HelpCircle, Send, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/AuthContext';
import { usePlan } from '@/hooks/usePlan';
import { useNavigate } from 'react-router-dom';
import { useCompany } from '@/CompanyContext';
import { SubscriptionStatusHeader } from './SubscriptionStatusHeader';
import { ErrorBoundary } from './ErrorBoundary';
import { toast } from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { useLegalCompliance } from '@/hooks/useLegalCompliance';
import { NotificationBell } from './notifications/NotificationBell';
import { useGlobalSearch } from '@/hooks/useGlobalSearch';
import { GlobalSearchModal } from './search/GlobalSearchModal';


interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const DashboardLayout = ({ children, activeTab, onTabChange }: LayoutProps) => {
  const { hasExpiredTrial, isGodMode, plan_status, trialDaysRemaining, profile, user } = useAuth();
  const { data: compliance } = useLegalCompliance(user?.uid || user?.id || null);
  const needsReacceptance = compliance?.needsReacceptance;
  const { companyId } = useCompany();
  const { data: companyData } = useQuery({
    queryKey: ['company_profile', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('name, logo_url')
        .eq('id', companyId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!companyId
  });

  const logoUrl = companyData?.logo_url || '';
  const companyName = companyData?.name || 'CallMind';
  const navigate = useNavigate();

  // Was hardcoded to false, with the header below hardcoded to
  // isSubscribed / 365 days -- so a trial about to expire looked identical to
  // a paid annual plan. Both now come from the company's actual subscription.
  const plan = usePlan();
  const isSubscriptionHeaderVisible = plan.isTrial || plan.isLapsed;
  const headerTopClass = isSubscriptionHeaderVisible ? 'top-14 md:top-10' : 'top-14 md:top-0';

  const search = useGlobalSearch();

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-slate-900 overflow-x-hidden">
      {/* Global Search Modal Command Palette */}
      <GlobalSearchModal isOpen={search.isOpen} onClose={search.closeModal} />

      <Sidebar 
        activeTab={activeTab} 
        onTabChange={onTabChange} 
        logoUrl={logoUrl}
        companyName={companyName}
      />
      <div className="flex-1 min-w-0 flex flex-col transition-all duration-300">
        <SubscriptionStatusHeader
          isSubscribed={!plan.isTrial && !plan.isLapsed}
          isExpired={plan.isLapsed || plan_status === 'expired'}
          planName={plan.plan.name}
          expiryDays={plan.daysRemaining}
          onOpenHistory={() => {
            onTabChange('Subscription');
          }}
        />
        
        {/* Header */}
        <header className={`h-max min-h-16 py-2 bg-white border-b border-gray-200 flex flex-wrap sm:flex-nowrap items-center justify-between px-4 sm:px-8 sticky ${headerTopClass} z-30 gap-4`}>
          <div className="flex items-center gap-4 flex-1 max-w-xl order-2 w-full sm:order-1 sm:w-auto">
            <button
              onClick={search.openModal}
              className="relative w-full flex items-center justify-between pl-10 pr-4 py-2 bg-gray-100/80 hover:bg-gray-100 border border-gray-200/60 rounded-xl text-sm transition-all text-gray-500 hover:text-slate-700 shadow-inner group"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-brand-600 transition-colors" size={18} />
              <span className="truncate text-xs font-medium">Search leads, phone (+91), calls, invoices, tickets...</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold text-gray-400 bg-white border border-gray-200 rounded-md shadow-xs shrink-0">
                Ctrl K
              </kbd>
            </button>
          </div>
          
          <div className="flex items-center justify-end w-full sm:w-auto order-1 sm:order-2 gap-4 ml-auto">
            <div className="flex items-center gap-4 shrink-0">
              <NotificationBell onNavigateToNotifications={() => onTabChange('Notifications')} />
              <button className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm shadow-brand-200 shrink-0">
                <Plus size={18} />
                <span className="hidden sm:inline">New Campaign</span>
                <span className="sm:hidden">New</span>
              </button>
            </div>
          </div>
        </header>

        {/* Compliance Updates Banner */}
        {needsReacceptance && activeTab !== 'Terms' && (
          <div className="bg-amber-50 border-b border-amber-100 px-6 sm:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold text-amber-800 no-print animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 animate-bounce" />
              <span>Terms updated. Review now.</span>
            </div>
            <button 
              onClick={() => onTabChange('Terms')} 
              className="w-full sm:w-auto px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all btn-tactile text-center"
            >
              Review Terms
            </button>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-5 pb-24 md:pb-8 overflow-auto relative">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>

        {/* Expiration Overlay */}
        {hasExpiredTrial && activeTab !== 'Subscription' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-md">
            <div className="bg-white p-10 rounded-[32px] shadow-2xl max-w-md w-full text-center border border-gray-100">
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Lock size={40} strokeWidth={2} />
              </div>
              <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-4">Trial Expired</h2>
              <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                Your 3-day Free Trial of CallMind Pro has officially ended. Upgrade your subscription to restore full dashboard access and continue scaling your operations.
              </p>
              
              <div className="space-y-4">
                <button 
                  onClick={() => {
                    onTabChange('Subscription');
                  }}
                  className="w-full py-4 bg-brand-600 text-white rounded-xl font-black uppercase tracking-[0.1em] text-xs hover:bg-brand-700 transition-colors shadow-xl shadow-brand-500/20"
                >
                  View Subscription Plans
                </button>
                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <AlertTriangle size={14} />
                  <span className="text-[10px] uppercase font-bold tracking-widest">Data is safely preserved</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
