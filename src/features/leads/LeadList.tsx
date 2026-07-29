import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, ChevronRight, User, Phone, Calendar, RefreshCcw } from 'lucide-react';
// @ts-ignore
import { FixedSizeList as List } from 'react-window';
import { useLeads } from '../../hooks/useLeads';
import { LeadStatus, Lead, LeadFilters } from '../../types/lead';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { clsx } from 'clsx';
import { format } from 'date-fns';

interface LeadListProps {
  onSelectLead: (lead: Lead) => void;
  onAddLead: () => void;
  onOpenFilters: () => void;
  activeFilterCount: number;
  filters?: LeadFilters;
}

/**
 * LeadList Component
 * Displays a real-time list of leads with pagination and search.
 */
export const LeadList: React.FC<LeadListProps> = ({ 
  onSelectLead, 
  onAddLead, 
  onOpenFilters,
  activeFilterCount,
  filters
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { 
    data, 
    isLoading, 
    isError, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    refetch 
  } = useLeads(filters);

  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(500);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setHeight(containerRef.current.clientHeight || 500);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const allLeads = useMemo(() => {
    return data?.pages.flatMap(page => page?.leads || []) || [];
  }, [data]);

  const filteredLeads = useMemo(() => {
    if (!searchTerm) return allLeads;
    const lowerSearch = searchTerm.toLowerCase();
    return allLeads.filter(lead => 
      (lead.name || '').toLowerCase().includes(lowerSearch) || 
      (lead.phone || '').includes(searchTerm) ||
      (lead.email || '').toLowerCase().includes(lowerSearch)
    );
  }, [allLeads, searchTerm]);

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const lead = filteredLeads[index];
    if (!lead) return null;

    // Trigger loading next page when scrolling near the end
    if (index === filteredLeads.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }

    return (
      <div style={{ ...style, paddingBottom: '12px' }}>
        <motion.div
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => onSelectLead(lead)}
          className="group p-6 bg-white border border-transparent rounded-[30px] shadow-sm hover:shadow-xl hover:border-brand-100 hover:bg-brand-50/10 transition-all cursor-pointer flex items-center gap-6 h-[104px]"
        >
          <div className="w-14 h-14 bg-brand-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-brand-600/20 group-hover:scale-105 transition-transform shrink-0">
            {(lead.name || '?').charAt(0)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h4 className="text-base font-bold text-gray-900 group-hover:text-brand-600 transition-colors truncate">{lead.name || 'Anonymous Lead'}</h4>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-black uppercase tracking-widest shrink-0">{lead.source || 'Direct'}</span>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500 truncate">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                {lead.phone || 'No phone'}
              </div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-400 shrink-0">
                <Calendar className="w-3.5 h-3.5" />
                {lead.createdAt?.seconds ? format(new Date(lead.createdAt.seconds * 1000), 'MMM d, yyyy') : 'Recently'}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={clsx(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm",
              lead.status === LeadStatus.NEW && "bg-blue-100 text-blue-700",
              lead.status === LeadStatus.CONTACTED && "bg-amber-100 text-amber-700",
              lead.status === LeadStatus.INTERESTED && "bg-emerald-100 text-emerald-700",
              lead.status === LeadStatus.CONVERTED && "bg-indigo-100 text-indigo-700",
              lead.status === LeadStatus.NOT_INTERESTED && "bg-rose-100 text-rose-700",
            )}>
              {lead.status}
            </span>
            <div className="p-1 text-gray-300 group-hover:text-brand-600 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </motion.div>
      </div>
    );
  }, [filteredLeads, onSelectLead, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white/40 backdrop-blur-xl border border-white/20 rounded-[40px] shadow-2xl">
        <div className="p-4 bg-red-50 rounded-full text-red-500 mb-4">
          <RefreshCcw className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold font-display">Something went wrong</h3>
        <p className="text-gray-500 mb-6">We couldn't load your leads right now.</p>
        <button 
          onClick={() => refetch()} 
          className="px-6 py-3 bg-brand-600 text-white rounded-2xl font-bold hover:bg-brand-700 transition-all active:scale-95"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white/60 backdrop-blur-xl border border-white/20 rounded-[40px] shadow-2xl overflow-hidden relative">
      {/* Header section */}
      <div className="p-8 border-b border-gray-100/50 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black font-display text-slate-950 tracking-tight">Leads Dashboard</h1>
            <p className="text-gray-500 text-sm font-medium mt-1">Manage and track your pipeline in real-time</p>
          </div>
          <button 
            onClick={onAddLead}
            className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 transition-all font-bold shadow-lg shadow-brand-600/30 active:scale-95 group"
          >
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
            <span>New Lead</span>
          </button>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-brand-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Name/Phone/Email"
              className="w-full pl-12 pr-4 py-4 bg-white/50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-medium placeholder:text-gray-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={onOpenFilters}
            className="relative p-4 bg-white/50 border border-gray-100 rounded-2xl hover:bg-white transition-all shadow-sm active:scale-95"
          >
            <Filter className={clsx("w-6 h-6 transition-colors", activeFilterCount > 0 ? "text-brand-600" : "text-gray-600")} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-brand-600 text-white text-xs font-black flex items-center justify-center rounded-full border-4 border-white shadow-md">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Leads List Section */}
      <div ref={containerRef} className="flex-1 overflow-hidden p-6">
        {isLoading ? (
          <SkeletonLoader type="list" count={6} />
        ) : filteredLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mb-6">
              <User className="w-10 h-10 text-brand-300" />
            </div>
            <h3 className="text-2xl font-black font-display text-gray-900">Your Pipeline is Empty</h3>
            <p className="text-gray-500 max-w-xs mx-auto mt-2">Start your growth journey by adding your first lead to the system.</p>
            <button 
              onClick={onAddLead}
              className="mt-8 px-8 py-3 bg-white border-2 border-brand-100 text-brand-600 rounded-2xl font-black hover:bg-brand-50 transition-all shadow-sm"
            >
              Get Started Now
            </button>
          </div>
        ) : (
          <List
            height={height - 48}
            itemCount={filteredLeads.length}
            itemSize={116}
            width="100%"
            className="custom-scrollbar"
          >
            {Row}
          </List>
        )}
      </div>

      {isFetchingNextPage && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 backdrop-blur-sm z-10 animate-bounce">
          <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
          <span>Fetching next page...</span>
        </div>
      )}
    </div>
  );
};
