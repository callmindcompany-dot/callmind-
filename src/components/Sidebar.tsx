import React, { useState, useEffect } from 'react';
import { useAuth } from '@/AuthContext';
import { useCompany } from '@/CompanyContext';
import { FOUNDER_OWNERS, INTERNAL_TEAM, USER_PERSPECTIVE_TESTERS } from '@/constants';
import { supabase } from '@/supabaseClient';
import { 
  Home, 
  Users, 
  Phone, 
  BrainCircuit, 
  Database, 
  BarChart3, 
  Settings, 
  LifeBuoy,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
  Search,
  Users2,
  Zap,
  CreditCard,
  Sparkles,
  Megaphone,
  History,
  Lock,
  MessageSquare,
  Mail,
  Layers,
  Calendar,
  RefreshCw,
  FlaskConical,
  Crown,
  PlayCircle,
  Rocket,
  Menu,
  X,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';

import { FeatureGate } from './FeatureGate';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
  phase?: string;
  key?: string;
  to?: string;
  activeClass?: string;
  hoverClass?: string;
  iconActiveColor?: string;
  iconHoverColor?: string;
}

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  phase, 
  isLocked, 
  featureId, 
  to, 
  isCollapsed,
  activeClass = 'bg-brand-50 text-brand-600 border-brand-600',
  hoverClass = 'hover:bg-brand-50/50 hover:text-brand-600',
  iconActiveColor = 'text-brand-600',
  iconHoverColor = 'group-hover:text-brand-600'
}: SidebarItemProps & { isLocked?: boolean, featureId?: string, isCollapsed?: boolean }) => {
  const content = (
    <Link
      to={to || '#'}
      title={isCollapsed ? label : undefined}
      onMouseEnter={() => {
        // Prefetch logic can happen here
      }}
      onClick={(e) => {
        if (isLocked || !to) e.preventDefault();
        if (!isLocked && onClick) {
          onClick();
        }
      }}
      className={`
        flex items-center w-full p-2.5 rounded-xl transition-all duration-200 group relative
        active:scale-[0.97] hover:scale-[1.02] origin-left
        ${isCollapsed ? 'justify-center' : ''}
        ${active 
          ? `${activeClass} font-bold border-l-4 pl-2 shadow-sm` 
          : isLocked 
            ? 'opacity-30 cursor-not-allowed text-gray-400'
            : `text-slate-600 ${hoverClass}`}
      `}
    >
      <div className="relative flex items-center justify-center shrink-0">
        <Icon size={22} className={`${active ? iconActiveColor : isLocked ? 'text-gray-300' : `text-slate-500 ${iconHoverColor}`}`} />
        {isLocked && (
          <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100">
            <Lock size={8} className="text-gray-400" />
          </div>
        )}
      </div>
      <AnimatePresence mode="wait">
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="ml-3 font-semibold text-sm whitespace-nowrap flex items-center gap-2 overflow-hidden"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );

  if (isLocked && featureId) {
    return (
      <FeatureGate featureId={featureId} phase={phase === 'P3' ? 3 : 2}>
        {content}
      </FeatureGate>
    );
  }

  return content;
};

export interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  logoUrl?: string;
  companyName?: string;
}

export const Sidebar = ({ 
  activeTab, 
  onTabChange,
  logoUrl: propLogoUrl,
  companyName: propCompanyName,
}: SidebarProps) => {
  const { 
    signOut, 
    user, 
    isFounder, 
    isSuperFounder, 
    isTester, 
    hasFounderHubAccess,
    isGodMode, 
    featureFlags, 
    trialDaysRemaining,
    resetTrial,
    profile
  } = useAuth();
  const navigate = useNavigate();

  const isAdmin = isFounder || isGodMode || (profile?.role === 'sub_admin'); // Sub-Admins get operational access

  // Determine actual status for specific buttons
  const normalizedEmail = user?.email?.toLowerCase()?.trim() || '';
  const isFounderOwnerActual = FOUNDER_OWNERS.includes(normalizedEmail);
  const isInternalTeamActual = INTERNAL_TEAM.includes(normalizedEmail);
  const isTesterActual = USER_PERSPECTIVE_TESTERS.includes(normalizedEmail);

  const { companyId } = useCompany();
  const [logoUrl, setLogoUrl] = useState('');
  const [companyName, setCompanyName] = useState('CallMind');
  const [enabledSections, setEnabledSections] = useState({
    sectionBEnabled: true,
    sectionKEnabled: true,
    sectionDEnabled: true,
  });

  // Toggle Collapse State
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('sidebar-collapsed') === 'true');
  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
  };

  useEffect(() => {
    if (!companyId) return;

    const fetchCompanyData = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          // The column is logo_url. Selecting logoUrl made the whole statement
          // fail with 42703, which is why the company logo and name never
          // appeared in the sidebar -- the error went to console.warn and the
          // defaults stayed. sectionBEnabled/KEnabled/DEnabled do not exist at
          // all; they are gone along with the toggle they were meant to drive.
          .select('logo_url, name')
          .eq('id', companyId)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setLogoUrl(data.logo_url || '');
          setCompanyName(data.name || 'CallMind');
        }
      } catch (err) {
        console.warn('[Sidebar] Failed to load company settings:', err);
      }
    };

    fetchCompanyData();

    const channel = supabase
      .channel(`sidebar-company-${companyId}`)
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
          setLogoUrl(data.logo_url || '');
          setCompanyName(data.name || 'CallMind');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId]);

  const menuItems = [
    { 
      icon: Home, 
      label: 'Home', 
      phase: 'P1', 
      activeClass: 'bg-brand-50 text-brand-700 border-brand-600', 
      hoverClass: 'hover:bg-brand-50/50 hover:text-brand-600',
      iconActiveColor: 'text-brand-600',
      iconHoverColor: 'group-hover:text-brand-600'
    },
    { 
      icon: Users, 
      label: 'Leads', 
      phase: 'P1', 
      activeClass: 'bg-emerald-50 text-emerald-700 border-emerald-600', 
      hoverClass: 'hover:bg-emerald-50/50 hover:text-emerald-600',
      iconActiveColor: 'text-emerald-600',
      iconHoverColor: 'group-hover:text-emerald-600'
    },
    { 
      icon: BrainCircuit, 
      label: 'AI Insights', 
      phase: 'P1', 
      activeClass: 'bg-violet-50 text-violet-700 border-violet-600', 
      hoverClass: 'hover:bg-violet-50/50 hover:text-violet-600',
      iconActiveColor: 'text-violet-600',
      iconHoverColor: 'group-hover:text-violet-600'
    },
    { 
      icon: MessageSquare, 
      label: 'Communication', 
      phase: 'P1', 
      activeClass: 'bg-sky-50 text-sky-700 border-sky-600', 
      hoverClass: 'hover:bg-sky-50/50 hover:text-sky-650',
      iconActiveColor: 'text-sky-600',
      iconHoverColor: 'group-hover:text-sky-600'
    },
    { 
      icon: Users2, 
      label: 'Team', 
      phase: 'P1', 
      activeClass: 'bg-rose-50 text-rose-700 border-rose-600', 
      hoverClass: 'hover:bg-rose-50/50 hover:text-rose-600',
      iconActiveColor: 'text-rose-600',
      iconHoverColor: 'group-hover:text-rose-600'
    },
    { 
      icon: Zap, 
      label: 'Automation', 
      phase: 'P1', 
      activeClass: 'bg-amber-50 text-amber-700 border-amber-600', 
      hoverClass: 'hover:bg-amber-50/50 hover:text-amber-650',
      iconActiveColor: 'text-amber-600',
      iconHoverColor: 'group-hover:text-amber-600'
    },
    { 
      icon: RefreshCw, 
      label: 'Integrations', 
      phase: 'P1', 
      activeClass: 'bg-indigo-50 text-indigo-700 border-indigo-600', 
      hoverClass: 'hover:bg-indigo-50/50 hover:text-indigo-600',
      iconActiveColor: 'text-indigo-600',
      iconHoverColor: 'group-hover:text-indigo-600'
    },
    { 
      icon: FileText, 
      label: 'Documents', 
      phase: 'P1', 
      activeClass: 'bg-amber-50 text-amber-700 border-amber-600', 
      hoverClass: 'hover:bg-amber-50/50 hover:text-amber-600',
      iconActiveColor: 'text-amber-600',
      iconHoverColor: 'group-hover:text-amber-600'
    },
    { 
      icon: BarChart3, 
      label: 'Reports', 
      phase: 'P1', 
      activeClass: 'bg-teal-50 text-teal-700 border-teal-600', 
      hoverClass: 'hover:bg-teal-50/50 hover:text-teal-600',
      iconActiveColor: 'text-teal-600',
      iconHoverColor: 'group-hover:text-teal-600'
    },
    { 
      icon: CreditCard, 
      label: 'Subscription', 
      phase: 'P1', 
      activeClass: 'bg-blue-50 text-blue-700 border-blue-600', 
      hoverClass: 'hover:bg-blue-50/50 hover:text-blue-600',
      iconActiveColor: 'text-blue-600',
      iconHoverColor: 'group-hover:text-blue-600'
    },
    { 
      icon: Layers, 
      label: 'Sequences', 
      phase: 'P2 - Beta', 
      flag: 'sequences', 
      activeClass: 'bg-purple-50 text-purple-700 border-purple-600', 
      hoverClass: 'hover:bg-purple-50/50 hover:text-purple-600',
      iconActiveColor: 'text-purple-600',
      iconHoverColor: 'group-hover:text-purple-600'
    },
    { 
      icon: Calendar, 
      label: 'Scheduler', 
      phase: 'P2 - Beta', 
      flag: 'scheduler', 
      activeClass: 'bg-orange-50 text-orange-700 border-orange-600', 
      hoverClass: 'hover:bg-orange-50/50 hover:text-orange-600',
      iconActiveColor: 'text-orange-600',
      iconHoverColor: 'group-hover:text-orange-600'
    },
    { 
      icon: Rocket, 
      label: 'Global Sales', 
      phase: 'P3 - Upcoming', 
      activeClass: 'bg-pink-50 text-pink-700 border-pink-600', 
      hoverClass: 'hover:bg-pink-50/50 hover:text-pink-600',
      iconActiveColor: 'text-pink-600',
      iconHoverColor: 'group-hover:text-pink-600'
    },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (!isAdmin) {
      const restrictedLabels = ['Team', 'Automation', 'Integrations', 'Reports', 'Subscription'];
      if (restrictedLabels.includes(item.label)) {
        return false;
      }
    }

    // Sub-Admins: Hide Founder-only items (Subscription, Integrations)
    const isSubAdminRole = profile?.role === 'sub_admin';
    if (isSubAdminRole) {
      const founderOnlyLabels = ['Subscription', 'Integrations'];
      if (founderOnlyLabels.includes(item.label)) {
        return false;
      }
    }
    
    // Autonomy Toggles enforcement
    if ((item.label === 'Communication' || item.label === 'Integrations') && !enabledSections.sectionBEnabled) {
      return false;
    }
    if (item.label === 'AI Insights' && !enabledSections.sectionKEnabled) {
      return false;
    }
    if (['Sequences', 'Scheduler', 'Automation'].includes(item.label) && !enabledSections.sectionDEnabled) {
      return false;
    }
    
    return true;
  });

  const bottomItems = [
    { 
      icon: Settings, 
      label: 'Settings',
      activeClass: 'bg-slate-100 text-slate-800 border-slate-500', 
      hoverClass: 'hover:bg-slate-50 hover:text-slate-700',
      iconActiveColor: 'text-slate-700',
      iconHoverColor: 'group-hover:text-slate-700'
    },
    { 
      icon: History, 
      label: 'Audit Log',
      activeClass: 'bg-slate-100 text-slate-800 border-slate-500', 
      hoverClass: 'hover:bg-slate-50 hover:text-slate-700',
      iconActiveColor: 'text-slate-700',
      iconHoverColor: 'group-hover:text-slate-700'
    },
    { 
      icon: Megaphone, 
      label: 'Announcements',
      activeClass: 'bg-slate-100 text-slate-800 border-slate-500', 
      hoverClass: 'hover:bg-slate-50 hover:text-slate-700',
      iconActiveColor: 'text-slate-700',
      iconHoverColor: 'group-hover:text-slate-700'
    },
  ];

  const filteredBottomItems = bottomItems.filter(item => {
    if (!isAdmin) {
      if (item.label === 'Audit Log') {
        return false;
      }
    }
    return true;
  });

  const renderNavLinks = (collapsed: boolean, closeMobileMenu = false) => {
    return filteredMenuItems.map((item) => {
      let isLocked = false;
      
      if (item.phase?.includes('P2') || item.phase?.includes('P3')) {
        const flagEnabled = item.flag && featureFlags[item.flag as keyof typeof featureFlags];
        
        if (isGodMode) {
          isLocked = false;
        } else {
          isLocked = true;
        }

        if (item.phase?.includes('P3')) isLocked = true;
      }

      const routeMap: Record<string, string> = {
        'Home': '/dashboard',
        'Leads': '/dashboard',
        'AI Insights': '/dashboard/ai',
        'Communication': '/dashboard/communication',
        'Team': '/dashboard/team',
        'Automation': '/dashboard/automation',
        'Integrations': '/dashboard/integrations',
        'Reports': '/dashboard/reports',
        'Subscription': '/dashboard/subscription',
        'Sequences': '/dashboard/sequences',
        'Scheduler': '/dashboard/scheduler',
      };
      const linkTo = isLocked ? '/dashboard/subscription' : (routeMap[item.label] || '/dashboard');

      return (
        <SidebarItem
          key={item.label}
          icon={item.icon}
          label={item.label}
          active={activeTab === item.label}
          phase={item.phase}
          isLocked={isLocked}
          featureId={item.label.toLowerCase()}
          to={linkTo}
          isCollapsed={collapsed}
          activeClass={item.activeClass}
          hoverClass={item.hoverClass}
          iconActiveColor={item.iconActiveColor}
          iconHoverColor={item.iconHoverColor}
          onClick={() => {
            if (isLocked) {
              onTabChange('Subscription');
            } else {
              onTabChange(item.label);
            }
            if (closeMobileMenu) {
              setIsMobileMenuOpen(false);
            }
          }}
        />
      );
    });
  };

  const renderBottomLinks = (collapsed: boolean, closeMobileMenu = false) => {
    return filteredBottomItems.map((item) => {
      const routeMap: Record<string, string> = {
        'Settings': '/dashboard/settings',
        'Audit Log': '/dashboard/audit-log',
        'Announcements': '/dashboard/announcements',
      };
      return (
        <SidebarItem
          key={item.label}
          icon={item.icon}
          label={item.label}
          active={activeTab === item.label}
          to={routeMap[item.label] || '/dashboard'}
          isCollapsed={collapsed}
          activeClass={item.activeClass}
          hoverClass={item.hoverClass}
          iconActiveColor={item.iconActiveColor}
          iconHoverColor={item.iconHoverColor}
          onClick={() => {
            onTabChange(item.label);
            if (closeMobileMenu) {
              setIsMobileMenuOpen(false);
            }
          }}
        />
      );
    });
  };

  return (
    <>
      {/* MOBILE TOP BAR HEADER */}
      <div className="md:hidden h-14 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-40 shrink-0 w-full">
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 -ml-2 text-slate-600 hover:text-slate-900 active:scale-95 transition-all"
        >
          <Menu size={20} />
        </button>
        <span className="font-bold text-slate-900 text-base tracking-tight">{companyName}</span>
        <div className="w-8 h-8 rounded-full bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center font-bold text-xs uppercase animate-pulse">
          {user?.email?.charAt(0) || 'U'}
        </div>
      </div>

      {/* MOBILE DRAWER MENU */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50"
            />
            {/* Slide-out Sidebar aside */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed top-0 bottom-0 left-0 w-[260px] bg-white border-r border-slate-100 shadow-2xl flex flex-col z-50 h-screen"
            >
              {/* Logo / Header inside Drawer (Removed Title for vertical height) */}
              <div className="p-4 flex items-center justify-end">
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-655 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Menu items inside Drawer */}
              <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto custom-scrollbar">
                {renderNavLinks(false, true)}

                {/* Admin Control */}
                {hasFounderHubAccess && (
                  <div className="mt-6 pt-4 border-t border-gray-100 space-y-1">
                    <p className="px-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Admin Control</p>
                    <SidebarItem
                      icon={Lock}
                      label="Founder Hub"
                      active={false}
                      isCollapsed={false}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        navigate('/founder-hub');
                      }}
                    />
                  </div>
                )}
              </nav>

              {/* Bottom links inside Drawer */}
              <div className="px-4 py-4 border-t border-gray-100 space-y-1 mt-auto">
                {renderBottomLinks(false, true)}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* DESKTOP COLLAPSIBLE SIDEBAR */}
      <motion.aside
        animate={{ width: isCollapsed ? 86 : 210 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className="h-screen bg-white border-r border-gray-100 hidden md:flex flex-col sticky top-0 z-40 relative shrink-0"
      >
        {/* Border Floating Collapse Toggle Button */}
        <button
          onClick={toggleCollapse}
          className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 shadow-sm flex items-center justify-center z-50 transition-all hover:scale-110 active:scale-95"
          title={isCollapsed ? 'Expand Menu' : 'Collapse Menu'}
        >
          {isCollapsed ? <ChevronRight size={12} strokeWidth={3} /> : <ChevronLeft size={12} strokeWidth={3} />}
        </button>

        {/* Top spacing block replacing header */}
        <div className="h-6" />

        {/* Navigation Items */}
        <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {renderNavLinks(isCollapsed)}

          {/* Founder Hub Control for admins */}
          {hasFounderHubAccess && (
            <div className="mt-6 pt-4 border-t border-gray-100 space-y-1">
              {!isCollapsed && (
                <p className="px-3 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Admin Control</p>
              )}
              <SidebarItem
                icon={Lock}
                label="Founder Hub"
                active={false}
                isCollapsed={isCollapsed}
                onClick={() => navigate('/founder-hub')}
              />
            </div>
          )}

          {/* Enterprise partner status box */}
          {isGodMode && (
            <div className="mt-6 mb-2 overflow-hidden">
              {isCollapsed ? (
                <div className="flex items-center justify-center text-emerald-600 p-2.5 bg-emerald-50 rounded-xl border border-emerald-100" title="Enterprise Partner Access">
                  <Crown size={18} className="animate-pulse" />
                </div>
              ) : (
                <div className="bg-emerald-600 rounded-xl p-4 text-white relative overflow-hidden shadow-lg border border-emerald-500/50">
                  <Crown className="absolute -right-2 -top-2 w-12 h-12 opacity-10 rotate-12" />
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" />
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-100">Enterprise Active</p>
                  </div>
                  <h4 className="text-xs font-black tracking-tight leading-none uppercase">Full Access</h4>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Bottom Action Links */}
        <div className="px-4 py-4 border-t border-gray-100 space-y-1 overflow-hidden mt-auto">
          {renderBottomLinks(isCollapsed)}
        </div>
      </motion.aside>
    </>
  );
};
