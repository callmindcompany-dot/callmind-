import { supabaseAdmin, isPlaceholder } from '../lib/dbAdapter';
import { logger } from '../lib/logger';
import crypto from 'crypto';

export interface WhatsAppConversation {
  id: string;
  companyId: string;
  leadId?: string;
  customerPhone: string;
  customerName: string;
  assignedAgentId?: string;
  status: 'open' | 'pending' | 'closed';
  unreadCount: number;
  lastMessageText: string;
  lastMessageAt: string;
  tags: string[];
  notes?: string;
}

export interface WhatsAppMessage {
  id: string;
  conversationId: string;
  companyId: string;
  direction: 'inbound' | 'outbound';
  senderPhone: string;
  messageText: string;
  templateName?: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  idempotencyKey?: string;
  createdAt: string;
}

export class WhatsAppInboxService {
  /**
   * Validate Meta / WhatsApp Webhook HMAC SHA-256 signature
   */
  static validateWebhookSignature(payloadBody: string, signatureHeader: string, appSecret: string): boolean {
    if (!signatureHeader || !appSecret) return false;
    try {
      const expectedSignature = 'sha256=' + crypto.createHmac('sha256', appSecret).update(payloadBody).digest('hex');
      return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expectedSignature));
    } catch {
      return false;
    }
  }

  /**
   * Fetch company conversations (Supervisors see all, agents see assigned if non-admin)
   */
  static async getConversations(
    companyId: string,
    agentId?: string,
    statusFilter?: string,
    userRole: string = 'founder'
  ): Promise<WhatsAppConversation[]> {
    // "Rajesh Kumar, interested in Pro subscription pricing" used to be returned
    // here whenever the database was unconfigured. A demo conversation in a real
    // customer's inbox is indistinguishable from a real one, and a telecaller
    // would have chased it.
    if (!companyId) throw new Error('companyId is required');
    if (isPlaceholder) throw new Error('Supabase is not configured');

    {
      let query = supabaseAdmin.from('whatsapp_conversations').select('*').eq('company_id', companyId);

      // Non-supervisor role filter
      if (!['founder', 'admin', 'manager'].includes(userRole) && agentId) {
        query = query.eq('assigned_agent_id', agentId);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.order('last_message_at', { ascending: false });

      // An empty inbox and a failed query look identical to the person reading
      // the screen, and only one of them means "nobody has written to you".
      if (error) throw error;

      return (data ?? []).map((c) => ({
        id: c.id,
        companyId: c.company_id,
        leadId: c.lead_id,
        customerPhone: c.customer_phone,
        customerName: c.customer_name || 'Customer',
        assignedAgentId: c.assigned_agent_id,
        status: c.status,
        unreadCount: c.unread_count || 0,
        lastMessageText: c.last_message_text || '',
        lastMessageAt: c.last_message_at,
        tags: c.tags || [],
        notes: c.notes,
      }));
    }
  }

  /**
   * Fetch message history for a conversation
   */
  static async getMessages(companyId: string, conversationId: string): Promise<WhatsAppMessage[]> {
    if (!companyId) throw new Error('companyId is required');
    if (isPlaceholder) throw new Error('Supabase is not configured');

    {
      const { data, error } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('*')
        .eq('company_id', companyId)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((m) => ({
        id: m.id,
        conversationId: m.conversation_id,
        companyId: m.company_id,
        direction: m.direction,
        senderPhone: m.sender_phone,
        messageText: m.message_text,
        templateName: m.template_name,
        status: m.status,
        idempotencyKey: m.idempotency_key,
        createdAt: m.created_at,
      }));
    }
  }

  /**
   * Outbound WhatsApp sending. Not connected to Meta, and therefore refused.
   *
   * This used to insert a row with status 'sent' and return success: true
   * without ever contacting Meta's Graph API. The telecaller saw the message
   * appear in the thread marked sent; the customer received nothing, and
   * nobody could tell from inside the product that the message had gone
   * nowhere. A feature that is missing is a smaller problem than one that
   * reports success -- the first is visible, the second is acted upon.
   *
   * The two halves that would make this real are both stubs as well:
   * supabase/functions/send-whatsapp-message has the Graph API call commented
   * out, and supabase/functions/receive-whatsapp-webhook stores nothing. Until
   * those dispatch and store, this refuses, and the refusal reaches the UI.
   *
   * Deliberately writes no row. A stored message that was never delivered is a
   * false record of having contacted a customer, which is worse than no record.
   */
  static async sendMessage(
    companyId: string,
    conversationId: string,
    _senderPhone: string,
    messageText: string,
    _templateName?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!companyId || !conversationId || !messageText) {
      return { success: false, error: 'Missing mandatory fields' };
    }

    logger.warn(
      `[WhatsAppInboxService.sendMessage] refused for company ${companyId}: no WhatsApp provider is connected`,
    );

    return {
      success: false,
      error:
        'Sending from CallMind is not available yet — WhatsApp is not connected to this workspace. Message the customer from WhatsApp directly for now.',
    };
  }

  /**
   * Reassign conversation agent
   */
  static async assignConversation(
    companyId: string,
    conversationId: string,
    assignedAgentId: string
  ): Promise<boolean> {
    if (isPlaceholder || !companyId) return true;
    try {
      const { error } = await supabaseAdmin
        .from('whatsapp_conversations')
        .update({ assigned_agent_id: assignedAgentId, updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('company_id', companyId);

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Update conversation status (open/pending/closed)
   */
  static async updateStatus(
    companyId: string,
    conversationId: string,
    status: 'open' | 'pending' | 'closed'
  ): Promise<boolean> {
    if (isPlaceholder || !companyId) return true;
    try {
      const { error } = await supabaseAdmin
        .from('whatsapp_conversations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', conversationId)
        .eq('company_id', companyId);

      return !error;
    } catch {
      return false;
    }
  }
}
