import React from 'react';
import { Filter, Users } from 'lucide-react';
// react-window v2 renamed FixedSizeList to List and changed its API. The old
// code read `FixedSizeList` off the module, which does not exist in v2 — the
// fallback expression resolved to undefined on both sides, so rendering it threw
// "Element type is invalid" for any company that had leads. The build only
// warned about the missing export, so it shipped.
import { List, type RowComponentProps } from 'react-window';
import { SkeletonLoader } from '../SkeletonLoader';
import { maskPhone } from '@/website/components/dataMasking';
import { isLeadRotting } from '@/utils/leadRotting';
import { LeadsPagination } from '../LeadsPagination';
import { StatusBadge, Lead } from '../LeadsPage';

/**
 * A colour for each lead source, so a column of them can be read at a glance.
 *
 * Matched loosely because the value is whatever the ingest function wrote --
 * "IndiaMart", "IndiaMART", "Facebook Ads" -- and a customer can type their own
 * on a manual lead. Anything unrecognised stays neutral rather than being given
 * a colour that would imply a vendor we do not know it came from.
 */
export function sourceChipClass(source?: string | null): string {
  const s = (source ?? '').toLowerCase();
  if (s.includes('indiamart')) return 'bg-orange-50 text-orange-700 border-orange-100';
  if (s.includes('justdial')) return 'bg-blue-50 text-blue-700 border-blue-100';
  if (s.includes('tradeindia')) return 'bg-amber-50 text-amber-700 border-amber-100';
  if (s.includes('facebook') || s.includes('meta')) return 'bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/20';
  if (s.includes('google')) return 'bg-red-50 text-red-700 border-red-100';
  if (s.includes('webhook') || s.includes('api')) return 'bg-brand-50 text-brand-700 border-brand-100';
  if (s.includes('website') || s.includes('form')) return 'bg-indigo-50 text-indigo-700 border-indigo-100';
  if (s.includes('csv') || s.includes('import') || s.includes('excel')) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  return 'bg-gray-100 text-gray-600 border-gray-200';
}

interface LeadRowProps {
  lead: Lead;
  assignedAgent?: { id: string; name: string } | null;
  isSelected: boolean;
  teamSettings: any;
  isAdmin: boolean;
  onSelectLead: (lead: Lead) => void;
  handleSelectLead: (e: React.ChangeEvent<HTMLInputElement>, leadId: string) => void;
  rottingThreshold: number;
}

const getCreatedAtMillis = (createdAt: any): number | undefined => {
  if (!createdAt) return undefined;
  if (typeof createdAt.toMillis === 'function') {
    try {
      return createdAt.toMillis();
    } catch (e) {}
  }
  if (createdAt.seconds) {
    return createdAt.seconds * 1000;
  }
  try {
    const ms = new Date(createdAt).getTime();
    return isNaN(ms) ? undefined : ms;
  } catch (e) {
    return undefined;
  }
};

const LeadRow = React.memo(({ 
  lead, 
  assignedAgent, 
  isSelected, 
  teamSettings, 
  isAdmin, 
  onSelectLead, 
  handleSelectLead,
  rottingThreshold
}: LeadRowProps) => {
  const formatSafeDate = (dateInput: any) => {
    if (!dateInput) return '-';
    if (typeof dateInput.toDate === 'function') {
      try {
        return dateInput.toDate().toLocaleString('en-GB');
      } catch (e) {
        return '-';
      }
    }
    if (dateInput.seconds) {
      try {
        return new Date(dateInput.seconds * 1000).toLocaleString('en-GB');
      } catch (e) {
        return '-';
      }
    }
    try {
      return new Date(dateInput).toLocaleString('en-GB');
    } catch (e) {
      return '-';
    }
  };

  const createdAtMillis = getCreatedAtMillis(lead.createdAt);
  const isRotting = isLeadRotting(createdAtMillis, rottingThreshold);

  return (
    <div 
      onClick={() => onSelectLead(lead)}
      className={`flex items-center hover:bg-gray-50 border-b border-gray-100 transition-colors cursor-pointer w-[2670px] h-[56px] text-sm font-medium text-gray-800`}
    >
      <div className="w-[50px] px-4 py-3 border-r border-gray-100 flex items-center justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
        <input 
          type="checkbox"
          checked={isSelected}
          onChange={(e) => handleSelectLead(e, lead.id)}
          className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
        />
      </div>
      <div className="w-[180px] px-4 py-3 border-r border-gray-100 flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <p className="font-bold text-blue-600 uppercase truncate">{lead.name || 'Anonymous'}</p>
          {lead.isUnseen && (
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 border-2 border-white shadow-sm shrink-0 animate-pulse" title="Unseen Lead" />
          )}
          {isRotting && (
            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 border border-orange-200 rounded-full text-[9px] font-black uppercase tracking-wider animate-pulse shrink-0">
              Rotting
            </span>
          )}
        </div>
      </div>
      <div className="w-[150px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0 truncate">
        {assignedAgent ? (
          <span className="text-gray-800 truncate">{assignedAgent.name}</span>
        ) : (
          <span className="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider shrink-0">Unassigned</span>
        )}
      </div>
      <div className="w-[140px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0 truncate">
        {teamSettings?.hidePhoneNumbers ? maskPhone(lead.phone || '', isAdmin) : (lead.phone || 'No Contact')}
      </div>
      <div className="w-[130px] px-4 py-3 border-r border-gray-100 flex items-center justify-center shrink-0">
        <StatusBadge status={lead.status || 'New'} />
      </div>
      <div className="w-[140px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0 truncate">
        {lead.reference || '-'}
      </div>
      <div className="w-[200px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0 truncate italic text-gray-400">
        {lead.comment || ''}
      </div>
      <div className="w-[160px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0 truncate">
        {formatSafeDate(lead.createdAt)}
      </div>
      <div className="w-[110px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0 truncate">
        {lead.date || formatSafeDate(lead.createdAt).split(' ')[0]}
      </div>
      <div className="w-[120px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0 truncate">
        {lead.branch || '-'}
      </div>
      {/* Was plain blue text. A chip in the vendor's own colour makes a column
          of sources scannable -- which is the point of having the column, since
          a telecaller wants to know where this person came from before the
          call connects. sourceChipClass keeps unknown sources neutral rather
          than inventing a colour for them. */}
      <div className="w-[140px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0">
        {lead.source || lead.brand ? (
          <span
            className={`px-2 py-1 rounded-md text-[11px] font-bold truncate max-w-full border ${sourceChipClass(
              lead.source || lead.brand,
            )}`}
            title={lead.source || lead.brand}
          >
            {lead.source || lead.brand}
          </span>
        ) : (
          <span className="text-gray-300 text-xs font-bold">—</span>
        )}
      </div>
      <div className="w-[100px] px-4 py-3 border-r border-gray-100 flex items-center justify-center shrink-0">
        <span className={`px-2 py-1 rounded text-xs font-bold shrink-0 ${lead.priority === 'High' ? 'bg-red-100 text-red-700' : lead.priority === 'Medium' ? 'bg-orange-100 text-orange-700' : lead.priority === 'Low' ? 'bg-green-100 text-green-700' : ''}`}>
          {lead.priority || '-'}
        </span>
      </div>
      <div className="w-[200px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0 truncate">
        {lead.description || '-'}
      </div>
      <div className="w-[130px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0 truncate">
        {lead.estimatedBudget || '-'}
      </div>
      <div className="w-[120px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0 truncate">
        {lead.state || '-'}
      </div>
      <div className="w-[120px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0 truncate">
        {lead.city || '-'}
      </div>
      <div className="w-[200px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0 truncate">
        {lead.address || '-'}
      </div>
      <div className="w-[200px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0 truncate">
        {lead.facebookAdName || '-'}
      </div>
      <div className="w-[80px] px-4 py-3 flex items-center justify-center shrink-0" onClick={(e) => e.stopPropagation()}>
         <button className="p-1 hover:bg-gray-100 rounded text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-more-vertical"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
         </button>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.lead.id === next.lead.id &&
    prev.lead.status === next.lead.status &&
    prev.lead.isUnseen === next.lead.isUnseen &&
    prev.isSelected === next.isSelected &&
    prev.isAdmin === next.isAdmin &&
    prev.assignedAgent?.id === next.assignedAgent?.id &&
    prev.assignedAgent?.name === next.assignedAgent?.name &&
    prev.rottingThreshold === next.rottingThreshold &&
    JSON.stringify(prev.teamSettings) === JSON.stringify(next.teamSettings)
  );
});

LeadRow.displayName = 'LeadRow';

interface LeadTableProps {
  displayedLeads: Lead[];
  activeLeadsLength: number;
  selectedLeadIds: string[];
  handleSelectLead: (e: React.ChangeEvent<HTMLInputElement>, leadId: string) => void;
  handleSelectAll: (e: React.ChangeEvent<HTMLInputElement>, activeLeadsList: Lead[]) => void;
  onSelectLead: (lead: Lead) => void;
  paginatedLoading: boolean;
  isPlaceholder: boolean;
  teamSettings: any;
  isAdmin: boolean;
  agents: any[];
  setShowAddModal: (show: boolean) => void;
  setShowSmartImport: (show: boolean) => void;
  onClearFilters: () => void;
  rottingThreshold?: number;
  
  // Pagination Props
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onLoadMore: () => void;
}

export const LeadTable = React.memo(({
  displayedLeads,
  activeLeadsLength,
  selectedLeadIds,
  handleSelectLead,
  handleSelectAll,
  onSelectLead,
  paginatedLoading,
  isPlaceholder,
  teamSettings,
  isAdmin,
  agents,
  setShowAddModal,
  setShowSmartImport,
  onClearFilters,
  rottingThreshold = 3,
  currentPage,
  totalPages,
  totalCount,
  onPageChange,
  onLoadMore
}: LeadTableProps) => {
  const getLabel = (key: string, defaultLabel: string) => {
    return teamSettings?.fieldLabels?.[key] || defaultLabel;
  };

  // Fix 6: react-window row virtualizer definition
  // v2 passes ariaAttributes alongside index/style and expects a component in
  // `rowComponent`, not a children-as-function. Spreading ariaAttributes keeps
  // the list's listitem semantics intact for screen readers.
  // Typed with the library's own RowComponentProps so TypeScript can tell the
  // rows' built-in props (index/style/ariaAttributes) apart from any extra
  // `rowProps`; declaring them by hand made it demand them in rowProps.
  const Row = React.useCallback(({ index, style, ariaAttributes }: RowComponentProps) => {
    const lead = displayedLeads[index];
    if (!lead) return null;
    const assignedAgent = agents.find(a => a.id === lead.assignedTo);
    const isSelected = selectedLeadIds.includes(lead.id);

    return (
      <div style={style} {...ariaAttributes}>
        <LeadRow
          lead={lead}
          assignedAgent={assignedAgent}
          isSelected={isSelected}
          teamSettings={teamSettings}
          isAdmin={isAdmin}
          onSelectLead={onSelectLead}
          handleSelectLead={handleSelectLead}
          rottingThreshold={rottingThreshold}
        />
      </div>
    );
  }, [displayedLeads, agents, selectedLeadIds, teamSettings, isAdmin, onSelectLead, handleSelectLead, rottingThreshold]);

  return (
    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden relative mt-4 flex flex-col">
      <div className="overflow-x-auto min-h-[400px]">
        <div className="min-w-max w-[2670px] flex flex-col">
          {/* Header Row */}
          <div className="flex bg-white border-b border-gray-200 text-xs font-black text-gray-500 uppercase tracking-widest h-[48px] shrink-0">
            <div className="w-[50px] px-4 py-3 border-r border-gray-100 flex items-center justify-center shrink-0">
              <input 
                type="checkbox" 
                checked={displayedLeads.length > 0 && displayedLeads.every(l => selectedLeadIds.includes(l.id))}
                onChange={(e) => handleSelectAll(e, displayedLeads)}
                className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
              />
            </div>
            <div className="w-[180px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0">{getLabel('name', 'Name')}</div>
            <div className="w-[150px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0">Assigned To</div>
            <div className="w-[140px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0">{getLabel('phone', 'Phone')}</div>
            <div className="w-[130px] px-4 py-3 border-r border-gray-100 flex items-center justify-center shrink-0 text-center">{getLabel('status', 'Status')}</div>
            <div className="w-[140px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0">{getLabel('reference', 'Reference')}</div>
            <div className="w-[200px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0">{getLabel('comment', 'Comment')}</div>
            <div className="w-[160px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0">Created Date</div>
            <div className="w-[110px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0">{getLabel('date', 'Date')}</div>
            <div className="w-[120px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0">{getLabel('branch', 'Branch')}</div>
            <div className="w-[140px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0">{getLabel('source', 'Source')}</div>
            <div className="w-[100px] px-4 py-3 border-r border-gray-100 flex items-center justify-center shrink-0">{getLabel('priority', 'Priority')}</div>
            <div className="w-[200px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0">{getLabel('description', 'Description')}</div>
            <div className="w-[130px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0">{getLabel('estimatedBudget', 'Estimated Budget')}</div>
            <div className="w-[120px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0">{getLabel('state', 'State')}</div>
            <div className="w-[120px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0">{getLabel('city', 'City')}</div>
            <div className="w-[200px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0">{getLabel('address', 'Address')}</div>
            <div className="w-[200px] px-4 py-3 border-r border-gray-100 flex items-center shrink-0">{getLabel('facebookAdName', 'Facebook Ad Name')}</div>
            <div className="w-[80px] px-4 py-3 flex items-center justify-center shrink-0 text-right">Action</div>
          </div>

          {/* Virtual Scroll Body */}
          <div className="flex flex-col min-h-[400px]">
            {paginatedLoading ? (
               <div className="p-6">
                 <SkeletonLoader type="table" count={5} />
               </div>
            ) : activeLeadsLength === 0 ? (
               <div className="py-24 text-center w-full flex items-center justify-center">
                 <div className="flex flex-col items-center justify-center py-6 px-12 bg-white/40 backdrop-blur-xl border border-white/20 rounded-[32px] max-w-lg mx-auto shadow-xl shadow-brand-600/5">
                   <div className="w-20 h-20 bg-gradient-to-tr from-brand-600 to-brand-500 text-white rounded-[24px] flex items-center justify-center mb-6 shadow-lg shadow-brand-600/20 animate-pulse">
                     <Users size={36} />
                   </div>
                   <h3 className="text-2xl font-black font-display text-slate-900 mb-2 tracking-tight">Your Pipeline is Empty</h3>
                   <p className="text-slate-500 text-sm max-w-sm mx-auto mb-8 font-medium leading-relaxed">There are no leads in your database yet. Start by adding a single lead manually, or uploading a list.</p>
                   <div className="flex gap-3">
                     <button 
                       onClick={() => setShowAddModal(true)}
                       className="px-6 py-3 bg-brand-600 text-white font-bold rounded-2xl hover:bg-brand-700 hover:shadow-lg shadow-md active:scale-95 transition-all duration-150 btn-tactile"
                     >
                       Add First Lead
                     </button>
                     <button 
                       onClick={() => setShowSmartImport(true)}
                       className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all duration-150 btn-tactile"
                     >
                       Upload CSV
                     </button>
                   </div>
                 </div>
               </div>
            ) : displayedLeads.length === 0 ? (
               <div className="py-24 text-center w-full flex items-center justify-center">
                 <div className="flex flex-col items-center justify-center">
                   <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-6">
                     <Filter size={40} />
                   </div>
                   <h3 className="text-xl font-bold text-gray-900 mb-2">No Leads Match Your Filters</h3>
                   <p className="text-gray-500 max-w-sm mx-auto mb-6">We couldn't find any leads matching the current view, search, and filter settings.</p>
                   <button 
                     onClick={onClearFilters}
                     className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                   >
                     Clear All Filters
                   </button>
                 </div>
               </div>
            ) : (
               <List
                 /* v2 API: rowCount/rowHeight/rowComponent. There is no `width`
                    prop — the list fills its container, and the fixed 2670px
                    width already comes from the wrapper above. `height` is now
                    `defaultHeight`, used for first paint before measurement. */
                 defaultHeight={500}
                 rowCount={displayedLeads.length}
                 rowHeight={56}
                 rowComponent={Row}
                 rowProps={{}}
                 className="custom-scrollbar"
                 style={{ height: 500 }}
               />
            )}
          </div>
        </div>
      </div>
      
      {!isPlaceholder ? (
        <LeadsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          onPageChange={onPageChange}
          loading={paginatedLoading}
        />
      ) : (
        displayedLeads.length < activeLeadsLength && (
          <div className="p-4 border-t border-gray-100 flex justify-center bg-gray-50/50">
            <button 
              onClick={onLoadMore} 
              className="px-6 py-2.5 bg-white border border-gray-200 text-brand-600 font-bold rounded-xl hover:bg-brand-50 transition-colors shadow-sm"
            >
              Load More
            </button>
          </div>
        )
      )}
    </div>
  );
}, (prev, next) => {
  return (
    prev.displayedLeads === next.displayedLeads &&
    prev.activeLeadsLength === next.activeLeadsLength &&
    prev.selectedLeadIds.length === next.selectedLeadIds.length &&
    prev.selectedLeadIds.every((id, idx) => id === next.selectedLeadIds[idx]) &&
    prev.paginatedLoading === next.paginatedLoading &&
    prev.isPlaceholder === next.isPlaceholder &&
    prev.isAdmin === next.isAdmin &&
    JSON.stringify(prev.teamSettings) === JSON.stringify(next.teamSettings) &&
    prev.agents === next.agents &&
    prev.currentPage === next.currentPage &&
    prev.totalPages === next.totalPages &&
    prev.totalCount === next.totalCount &&
    prev.rottingThreshold === next.rottingThreshold
  );
});

LeadTable.displayName = 'LeadTable';
