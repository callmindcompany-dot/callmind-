import { supabase } from '../supabaseClient';
import { Lead } from '../types/lead';

export const DeduplicationService = {
  /**
   * Checks if a lead with the same phone number already exists for this company
   */
  async checkDuplicateByPhone(companyId: string, phone: string): Promise<Lead | null> {
    if (!phone) return null;
    
    // Clean phone number to digits only (e.g. 9876543210) to avoid mismatch from formatting
    const cleanedPhone = phone.replace(/[^\d+]/g, '');
    
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('company_id', companyId)
      .eq('phone', cleanedPhone)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) {
      console.error('Error checking duplicate phone:', error);
      return null;
    }

    if (!data) return null;

    // Map database fields to Lead model
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
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  /**
   * Merges two leads by combining their standard and custom fields
   */
  async mergeLeads(companyId: string, existingLead: Lead, newFields: Partial<Lead>): Promise<void> {
    const mergedPayload = {
      name: newFields.name || existingLead.name,
      email: newFields.email || existingLead.email,
      status: newFields.status || existingLead.status,
      source: newFields.source || existingLead.source,
      priority: newFields.priority || existingLead.priority,
      city: newFields.city || existingLead.city,
      state: newFields.state || existingLead.state,
      address: newFields.address || existingLead.address,
      comment: newFields.comment || existingLead.comment,
      custom_data: {
        ...(existingLead.customData || {}),
        ...(newFields.customData || {})
      },
      custom_fields: {
        ...(existingLead.custom_fields || {}),
        ...(newFields.custom_fields || {})
      },
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('leads')
      .update(mergedPayload)
      .eq('id', existingLead.id)
      .eq('company_id', companyId);

    if (error) throw error;
  },

  /**
   * Overwrites the existing lead with the new lead data
   */
  async overwriteLead(companyId: string, existingLeadId: string, newFields: Partial<Lead>): Promise<void> {
    const overwritePayload = {
      name: newFields.name,
      email: newFields.email || null,
      status: newFields.status,
      source: newFields.source,
      priority: newFields.priority || 'Medium',
      city: newFields.city || null,
      state: newFields.state || null,
      address: newFields.address || null,
      comment: newFields.comment || null,
      custom_data: newFields.customData || {},
      custom_fields: newFields.custom_fields || {},
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('leads')
      .update(overwritePayload)
      .eq('id', existingLeadId)
      .eq('company_id', companyId);

    if (error) throw error;
  }
};
