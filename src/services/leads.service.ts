import { supabase } from '../supabaseClient';
import { Lead, LeadFormData, LeadFilters } from '../types/lead';
import { Timestamp } from '../utils/timestamp';

/**
 * Lead Service for Supabase
 * Handles all database operations for leads
 */
export const LeadService = {
  /**
   * Fetch leads with filters and pagination
   */
  async fetchLeads(companyId: string, filters?: LeadFilters, page: number = 1, pageSize: number = 20) {
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (filters) {
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status);
      }
      if (filters.source && filters.source.length > 0) {
        query = query.in('source', filters.source);
      }
      if (filters.assignedTo && filters.assignedTo.length > 0) {
        query = query.in('assigned_to', filters.assignedTo);
      }
      if (filters.city) {
        query = query.eq('city', filters.city);
      }
      if (filters.state) {
        query = query.eq('state', filters.state);
      }
    }

    // Offset-based pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    // Map database fields to interface format
    const leads: Lead[] = (data || []).map(item => ({
      id: item.id,
      name: item.name,
      email: item.email,
      phone: item.phone,
      status: item.status,
      assignedTo: item.assigned_to,
      companyId: item.company_id,
      source: item.source,
      priority: item.priority,
      city: item.city,
      state: item.state,
      address: item.address,
      comment: item.comment,
      isDeleted: item.is_deleted,
      customData: item.custom_data,
      custom_fields: item.custom_fields || {},
      createdAt: item.created_at ? Timestamp.fromDate(new Date(item.created_at)) : null,
      updatedAt: item.updated_at ? Timestamp.fromDate(new Date(item.updated_at)) : null
    }));

    return {
      leads,
      totalCount: count || 0,
      nextPage: leads.length === pageSize ? page + 1 : null
    };
  },

  /**
   * Fetch a single lead by ID
   */
  async fetchLeadById(companyId: string, id: string): Promise<Lead> {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Lead not found or unauthorized access');

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      status: data.status,
      assignedTo: data.assigned_to,
      companyId: data.company_id,
      source: data.source,
      priority: data.priority,
      city: data.city,
      state: data.state,
      address: data.address,
      comment: data.comment,
      isDeleted: data.is_deleted,
      customData: data.custom_data,
      custom_fields: data.custom_fields || {},
      createdAt: data.created_at ? Timestamp.fromDate(new Date(data.created_at)) : null,
      updatedAt: data.updated_at ? Timestamp.fromDate(new Date(data.updated_at)) : null
    };
  },

  /**
   * Create a new lead
   */
  async createLead(companyId: string, data: LeadFormData): Promise<string> {
    try {
      // Check for duplicates
      const { data: duplicate, error: checkError } = await supabase
        .from('leads')
        .select('id')
        .eq('company_id', companyId)
        .eq('phone', data.phone)
        .eq('is_deleted', false)
        .maybeSingle();

      if (checkError) throw checkError;
      if (duplicate) {
        throw new Error('A lead with this phone number already exists in your company.');
      }

      const leadPayload = {
        company_id: companyId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        status: data.status || 'New',
        source: data.source || 'Manual',
        priority: data.priority || 'Medium',
        city: data.city || null,
        state: data.state || null,
        address: data.address || null,
        comment: data.comment || null,
        custom_data: (data as any).customData || {},
        custom_fields: data.custom_fields || {},
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: result, error } = await supabase
        .from('leads')
        .insert([leadPayload])
        .select('id')
        .single();

      if (error) throw error;
      return result.id;
    } catch (err: any) {
      console.error('[LeadService] createLead failed:', err);
      throw new Error(err.message || 'Server error occurred while creating the lead.');
    }
  },

  /**
   * Update an existing lead
   */
  async updateLead(companyId: string, id: string, data: Partial<Lead>): Promise<void> {
    try {
      const updatePayload: any = {
        name: data.name,
        phone: data.phone,
        email: data.email,
        status: data.status,
        assigned_to: data.assignedTo,
        source: data.source,
        priority: data.priority,
        city: data.city,
        state: data.state,
        address: data.address,
        comment: data.comment,
        custom_data: data.customData,
        custom_fields: data.custom_fields,
        is_deleted: data.isDeleted,
        updated_at: new Date().toISOString()
      };

      // Remove undefined values
      Object.keys(updatePayload).forEach(key => {
        if (updatePayload[key] === undefined) delete updatePayload[key];
      });

      const { error } = await supabase
        .from('leads')
        .update(updatePayload)
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) throw error;
    } catch (err: any) {
      console.error('[LeadService] updateLead failed:', err);
      throw new Error(err.message || 'Server error occurred while updating the lead.');
    }
  },

  /**
   * Soft delete a lead
   */
  async deleteLead(companyId: string, id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', companyId);

      if (error) throw error;
    } catch (err: any) {
      console.error('[LeadService] deleteLead failed:', err);
      throw new Error(err.message || 'Server error occurred while deleting the lead.');
    }
  },

  /**
   * Bulk import leads
   */
  async bulkImport(companyId: string, leads: LeadFormData[]): Promise<void> {
    try {
      const leadPayloads = leads.map(lead => ({
        company_id: companyId,
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        status: lead.status || 'New',
        source: lead.source || 'Import',
        priority: lead.priority || 'Medium',
        city: lead.city || null,
        state: lead.state || null,
        address: lead.address || null,
        comment: lead.comment || null,
        custom_data: (lead as any).customData || {},
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('leads')
        .insert(leadPayloads);

      if (error) throw error;
    } catch (err: any) {
      console.error('[LeadService] bulkImport failed:', err);
      throw new Error(err.message || 'Server error occurred during bulk leads import.');
    }
  },

  /**
   * Bulk assign leads to a user
   */
  async bulkAssign(companyId: string, leadIds: string[], userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ assigned_to: userId, updated_at: new Date().toISOString() })
        .in('id', leadIds)
        .eq('company_id', companyId);

      if (error) throw error;
    } catch (err: any) {
      console.error('[LeadService] bulkAssign failed:', err);
      throw new Error(err.message || 'Server error occurred during bulk assignment.');
    }
  }
};
