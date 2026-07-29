import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Users, ShieldAlert, Lock, LogOut, ChevronLeft, MessageSquare, Layers, Building2, FlaskConical } from 'lucide-react';
import { useAuth } from '@/AuthContext';
import { FounderDashboard } from './FounderDashboard';
import { CoFounderManagement } from './CoFounderManagement';
import { PlatformAuditLog } from './PlatformAuditLog';
import { AISetupBot } from './AISetupBot';
import { OrganizationTenants } from './OrganizationTenants';
import { FoundersLab } from './FoundersLab';
import { useNavigate } from 'react-router-dom';

export const FounderHub = () => {
  const { signOut, user, isSuperFounder } = useAuth();
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<string | null>(null);

  const allModules = [
    {
      id: 'F-01',
      title: 'Founder Dashboard',
      desc: 'High-level financial metrics and platform-wide analytics.',
      icon: LayoutDashboard,
      color: 'from-blue-600 to-indigo-600',
      restricted: true
    },
    {
      id: 'F-02',
      title: 'Co-Founder Management',
      desc: 'Manage core team access, permissions, and equity splits.',
      icon: Users,
      color: 'from-brand-600 to-brand-800',
      restricted: false
    },
    {
      id: 'F-03',
      title: 'Platform Audit Log',
      desc: 'Immutable record of all system-level changes and security events.',
      icon: ShieldAlert,
      color: 'from-red-600 to-rose-600',
      restricted: true
    },
    {
      id: 'F-06',
      title: 'Organization Tenants',
      desc: 'Monitor health, billing, and resource utilization across all clients.',
      icon: Building2,
      color: 'from-emerald-600 to-teal-600',
      restricted: true
    },
    {
      id: 'F-04',
      title: 'AI Setup Bot',
      desc: 'Natural language admin setup for lead rules and assignments.',
      icon: MessageSquare,
      color: 'from-brand-600 to-brand-800',
      restricted: true
    },
    {
      id: 'F-05',
      title: 'Automated Sequences',
      desc: 'Test and manage UI flows for automated lead sequences.',
      icon: Layers,
      color: 'from-indigo-600 to-purple-600',
      restricted: false
    },
    {
      id: 'F-07',
      title: 'Founders Testing Lab',
      desc: 'Simulate, diagnose, and test live VoIP streams and carrier bridges.',
      icon: FlaskConical,
      color: 'from-purple-600 to-pink-600',
      restricted: true
    }
  ];

  const modules = allModules;

  const renderModule = () => {
    switch (activeModule) {
      case 'F-01': 
        return isSuperFounder ? <FounderDashboard onBack={() => setActiveModule(null)} /> : null;
      case 'F-02': 
        return <CoFounderManagement onBack={() => setActiveModule(null)} />;
      case 'F-03': 
        return isSuperFounder ? <PlatformAuditLog onBack={() => setActiveModule(null)} /> : null;
      case 'F-06':
        return isSuperFounder ? <OrganizationTenants onBack={() => setActiveModule(null)} /> : null;
      case 'F-04': 
        return isSuperFounder ? <AISetupBot onBack={() => setActiveModule(null)} /> : null;
      case 'F-05':
        return null;
      case 'F-07':
        return (
          <div className="space-y-6">
            <button 
              onClick={() => setActiveModule(null)}
              className="px-5 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm group active:scale-97"
            >
              <ChevronLeft size={16} className="text-gray-400 group-hover:text-brand-600 group-hover:-translate-x-0.5 transition-all" />
              <span className="text-gray-600 group-hover:text-gray-900 transition-colors">Back to Founder Hub</span>
            </button>
            <FoundersLab />
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 selection:bg-brand-500/10 overflow-hidden relative">
      <AnimatePresence mode="wait">
        {activeModule ? (
          <motion.div
            key="module"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="relative z-10 min-h-screen p-8"
          >
            <div className="max-w-7xl mx-auto">
              {renderModule()}
            </div>
          </motion.div>
        ) : (
            <motion.div
            key="hub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 min-h-screen p-8 pt-32"
          >
            {/* Header */}
            <div className="absolute top-12 left-12 right-12 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-gray-100 shadow-sm">
                  <Lock className="text-brand-600" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-gray-900">FOUNDER HUB</h1>
                  <p className="text-gray-500 text-xs font-bold tracking-widest uppercase">Secure Founder Suite</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right hidden lg:block mr-2">
                  <p className="text-sm font-bold text-gray-900">{user?.displayName}</p>
                  <p className="text-[10px] text-brand-600 font-bold tracking-widest uppercase">
                    {isSuperFounder ? 'Super Admin' : 'Co-Founder'}
                  </p>
                </div>
                
                <button 
                  onClick={() => navigate('/dashboard')}
                  className="px-5 py-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl font-bold text-xs transition-all flex items-center gap-2 shadow-sm group"
                >
                  <LayoutDashboard size={16} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
                  <span className="text-gray-400 group-hover:text-gray-900 transition-colors">Back to Dashboard</span>
                </button>

                <button 
                  onClick={() => signOut()}
                  className="p-2.5 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-100 rounded-2xl transition-all group shadow-sm"
                  title="Logout"
                >
                  <LogOut size={18} className="text-gray-400 group-hover:text-red-600 transition-colors" />
                </button>
              </div>
            </div>

            {/* Main Grid */}
            <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[20px] p-[30px] mt-12">
              {modules.map((mod, i) => (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
                  onClick={() => {
                    if (mod.id === 'F-05') {
                      navigate('/dashboard/sequences');
                    } else {
                      setActiveModule(mod.id);
                    }
                  }}
                  className="relative group cursor-pointer"
                >
                  <div className="relative bg-white p-10 h-full flex flex-col transition-all duration-500 border border-gray-100 rounded-2xl group-hover:border-brand-200 group-hover:-translate-y-2 shadow-sm hover:shadow-xl">
                    <div className="flex justify-between items-start mb-12">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                        <mod.icon className="text-white" size={32} />
                      </div>
                      <span className="text-[12px] font-bold tracking-[0.2em] text-gray-200 group-hover:text-brand-200 transition-colors">
                        {mod.id}
                      </span>
                    </div>

                    <h3 className="text-3xl font-bold mb-4 tracking-tight text-gray-900 group-hover:text-brand-600 transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed font-medium flex-1 group-hover:text-gray-600 transition-colors">
                      {mod.desc}
                    </p>

                    <div className="mt-12 pt-8 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
                        <span className="text-[10px] font-bold tracking-widest text-brand-600 uppercase">System Active</span>
                      </div>
                      <div className="p-2 rounded-full bg-gray-50 group-hover:bg-brand-600 transition-all duration-500 border border-gray-100">
                        <ChevronLeft className="rotate-180 text-gray-400 group-hover:text-white" size={16} />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer Decoration */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-8 opacity-40">
              <div className="h-[1px] w-24 bg-gradient-to-r from-transparent to-gray-200" />
              <span className="text-[10px] font-bold tracking-[0.5em] uppercase text-gray-400">CallMind Intelligence Platform</span>
              <div className="h-[1px] w-24 bg-gradient-to-l from-transparent to-gray-200" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
