import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoreVertical, Phone, MessageSquare, Clock, User, Filter, AlertCircle } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCompany } from '@/CompanyContext';
import { usePipelineLeads, Lead } from '@/hooks/usePipelineLeads';
import { usePipelineMutations } from '@/hooks/usePipelineMutations';
import CallMindLoader from './CallMindLoader';
import { toast } from 'react-hot-toast';

function getColorForStatus(status: string): string {
  const lower = (status || '').toLowerCase();
  if (lower.includes('new')) return 'bg-blue-500';
  if (lower.includes('contacted')) return 'bg-indigo-500';
  if (lower.includes('interested')) return 'bg-teal-500';
  if (lower.includes('call back') || lower.includes('follow')) return 'bg-amber-500';
  if (lower.includes('converted') || lower.includes('negotiation')) return 'bg-emerald-500';
  return 'bg-slate-400';
}

const SortableLeadCard = React.memo(({ lead, isOverlay = false }: { lead: Lead; isOverlay?: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handlePhoneCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.phone) {
      window.open(`tel:${lead.phone}`);
      toast.success(`Calling ${lead.name || 'Lead'}...`);
    } else {
      toast.error('No phone number registered');
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.phone) {
      const sanitized = lead.phone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${sanitized}`);
      toast.success('Redirecting to WhatsApp...');
    } else {
      toast.error('No phone number registered');
    }
  };

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success(`Details modal for ${lead.name || 'Lead'} coming soon!`);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-brand-100 transition-all cursor-grab active:cursor-grabbing group ${isOverlay ? 'shadow-xl border-brand-500 rotate-2' : ''}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-600 font-bold text-xs border border-brand-100">
            {lead.name?.charAt(0) || 'L'}
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 group-hover:text-brand-600 transition-colors">{lead.name || 'Unnamed Lead'}</h4>
            <p className="text-[10px] text-gray-500 font-medium">{lead.phone || 'No phone'}</p>
          </div>
        </div>
        <button 
          onClick={handleDetailsClick} 
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <MoreVertical size={14} />
        </button>
      </div>

      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
          <Clock size={12} />
          {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          <button 
            onClick={handlePhoneCall}
            className="p-1.5 bg-gray-50 text-gray-500 rounded-lg hover:bg-brand-50 hover:text-brand-600 transition-all border border-gray-100"
          >
            <Phone size={12} />
          </button>
          <button 
            onClick={handleWhatsApp}
            className="p-1.5 bg-gray-50 text-gray-500 rounded-lg hover:bg-green-50 hover:text-green-600 transition-all border border-gray-100"
          >
            <MessageSquare size={12} />
          </button>
        </div>
      </div>
    </div>
  );
});
SortableLeadCard.displayName = 'SortableLeadCard';

interface ColumnType {
  id: string;
  title: string;
  color: string;
}

const VirtualKanbanColumn = React.memo(({ column, columnLeads }: { column: ColumnType; columnLeads: Lead[] }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: columnLeads.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 128, // approx height + spacing
    overscan: 10, // expanded overscan to preserve drag layout integrity
  });

  return (
    <div className="flex flex-col bg-gray-50 rounded-[32px] p-4 border border-gray-100 min-w-[300px] lg:min-w-0 snap-start shrink-0 max-h-[700px]">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 px-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${column.color}`} />
          <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">{column.title}</h3>
          <span className="bg-white px-2 py-0.5 rounded-lg text-[10px] font-bold text-gray-400 border border-gray-100">
            {columnLeads.length}
          </span>
        </div>
        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
          <MoreVertical size={14} />
        </button>
      </div>

      {/* Virtual Scroll Container */}
      <SortableContext
        id={column.id}
        items={columnLeads.map(l => l.id)}
        strategy={verticalListSortingStrategy}
      >
        {columnLeads.length === 0 ? (
          <div className="h-32 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-400 text-xs font-medium">
            Drop leads here
          </div>
        ) : (
          <div
            ref={parentRef}
            className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const lead = columnLeads[virtualRow.index];
                if (!lead) return null;
                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      paddingBottom: '12px',
                    }}
                  >
                    <SortableLeadCard lead={lead} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SortableContext>
    </div>
  );
});
VirtualKanbanColumn.displayName = 'VirtualKanbanColumn';

export const PipelineBoard = () => {
  const { companyId } = useCompany();

  // 1. Data Query
  const { data: leadsData = [], isLoading, isError } = usePipelineLeads(companyId);

  // 2. Persistent Mutation
  const updateLeadMutation = usePipelineMutations(companyId);

  // Local state copy for visual drag-over feedback
  const [localLeads, setLocalLeads] = useState<Lead[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week'>('all');

  useEffect(() => {
    if (leadsData) {
      setLocalLeads(leadsData);
    }
  }, [leadsData]);

  // Derived columns dynamically
  const COLUMNS = useMemo((): ColumnType[] => {
    const standardStages = ['New', 'Contacted', 'Interested', 'Call Back', 'Converted', 'Not Interested'];
    const activeStatuses = Array.from(new Set(localLeads.map(l => l.status).filter(Boolean)));
    const merged = Array.from(new Set([...standardStages, ...activeStatuses]));
    
    return merged.map(status => ({
      id: status,
      title: status,
      color: getColorForStatus(status)
    }));
  }, [localLeads]);

  // Handle pipeline date filter dropdown settings
  const filteredLeads = useMemo(() => {
    return localLeads.filter(lead => {
      if (timeFilter === 'all') return true;
      if (!lead.created_at) return false;
      const createdDate = new Date(lead.created_at);
      const now = new Date();
      if (timeFilter === 'today') {
        return createdDate.toDateString() === now.toDateString();
      }
      if (timeFilter === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return createdDate >= oneWeekAgo;
      }
      return true;
    });
  }, [localLeads, timeFilter]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeLead = localLeads.find(l => l.id === active.id);
    if (!activeLead) return;

    if (COLUMNS.some(col => col.id === over.id)) {
      if (activeLead.status !== over.id) {
        setLocalLeads(prev => prev.map(l => l.id === active.id ? { ...l, status: String(over.id) } : l));
      }
      return;
    }

    const overLead = localLeads.find(l => l.id === over.id);
    if (overLead && activeLead.status !== overLead.status) {
      setLocalLeads(prev => prev.map(l => l.id === active.id ? { ...l, status: overLead.status } : l));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeLead = localLeads.find(l => l.id === active.id);
    if (!activeLead) return;

    let finalStatus = activeLead.status;
    if (COLUMNS.some(col => col.id === over.id)) {
      finalStatus = String(over.id);
    } else {
      const overLead = localLeads.find(l => l.id === over.id);
      if (overLead) {
        finalStatus = overLead.status;
      }
    }

    // Persist final position in Supabase
    updateLeadMutation.mutate({ leadId: String(active.id), newStatus: finalStatus });

    const activeIndex = localLeads.findIndex(l => l.id === active.id);
    const overIndex = localLeads.findIndex(l => l.id === over.id);
    if (overIndex !== -1 && activeIndex !== -1) {
      setLocalLeads((items) => arrayMove(items, activeIndex, overIndex));
    }
  };

  const activeLead = activeId ? localLeads.find(l => l.id === activeId) : null;

  if (isLoading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center">
        <CallMindLoader size="lg" text="Loading pipeline board..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-red-500 gap-2">
        <AlertCircle size={32} />
        <p className="text-sm font-bold">Failed to load pipeline leads.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Pipeline Kanban</h2>
          <p className="text-sm text-gray-500 font-medium">Drag and drop leads to update status persisted to database</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                <User size={14} />
              </div>
            ))}
            <div className="w-8 h-8 rounded-full border-2 border-white bg-brand-600 flex items-center justify-center text-[10px] font-bold text-white shadow-sm">
              +{localLeads.length}
            </div>
          </div>

          {/* Dynamic Filter Dropdown */}
          <div className="relative flex items-center bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm text-xs font-bold text-gray-600 gap-1.5">
            <Filter size={14} />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">All Leads</option>
              <option value="today">Created Today</option>
              <option value="week">Created This Week</option>
            </select>
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex lg:grid lg:grid-cols-6 gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
          {COLUMNS.map((column) => (
            <VirtualKanbanColumn
              key={column.id}
              column={column}
              columnLeads={filteredLeads.filter(l => l.status === column.id)}
            />
          ))}
        </div>

        <DragOverlay
          dropAnimation={{
            sideEffects: defaultDropAnimationSideEffects({
              styles: { active: { opacity: '0.5' } },
            }),
          }}
        >
          {activeLead ? <SortableLeadCard lead={activeLead} isOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
