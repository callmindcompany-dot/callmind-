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
    if (isPlaceholder || !companyId) {
      return [
        {
          id: 'conv-mock-1',
          companyId,
          customerPhone: '+919876543210',
          customerName: 'Rajesh Kumar',
          assignedAgentId: agentId || 'agent-1',
          status: 'open',
          unreadCount: 2,
          lastMessageText: 'Interested in Pro subscription pricing',
          lastMessageAt: new Date().toISOString(),
          tags: ['Hot Lead', 'Pricing Query'],
        },
      ];
    }

    try {
      let query = supabaseAdmin.from('whatsapp_conversations').select('*').eq('company_id', companyId);

      // Non-supervisor role filter
      if (!['founder', 'admin', 'manager'].includes(userRole) && agentId) {
        query = query.eq('assigned_agent_id', agentId);
      }

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query.order('last_message_at', { ascending: false });

      if (error || !data) return [];

      return data.map((c) => ({
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
    } catch (err) {
      logger.error(`[WhatsAppInboxService.getConversations Error ${companyId}]:`, err);
      return [];
    }
  }

  /**
   * Fetch message history for a conversation
   */
  static async getMessages(companyId: string, conversationId: string): Promise<WhatsAppMessage[]> {
    if (isPlaceholder || !companyId) {
      return [
        {
          id: 'msg-mock-1',
          conversationId,
          companyId,
          direction: 'inbound',
          senderPhone: '+919876543210',
          messageText: 'Hello, please send product brochure.',
          status: 'read',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 'msg-mock-2',
          conversationId,
          companyId,
          direction: 'outbound',
          senderPhone: 'Company Desk',
          messageText: 'Thank you for reaching out! Here is our product overview.',
          status: 'delivered',
          createdAt: new Date().toISOString(),
        },
      ];
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('whatsapp_messages')
        .select('*')
        .eq('company_id', companyId)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error || !data) return [];

      return data.map((m) => ({
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
    } catch (err) {
      logger.error(`[WhatsAppInboxService.getMessages Error ${conversationId}]:`, err);
      return [];
    }
  }

  /**
   * Send outbound WhatsApp message with idempotency key
   */
  static async sendMessage(
    companyId: string,
    conversationId: string,
    senderPhone: string,
    messageText: string,
    templateName?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!companyId || !conversationId || !messageText) {
      return { success: false, error: 'Missing mandatory fields' };
    }

    const idempotencyKey = `wa_${companyId}_${conversationId}_${Date.now()}`;
    const now = new Date().toISOString();

    if (!isPlaceholder) {
      try {
        const { data, error } = await supabaseAdmin.from('whatsapp_messages').insert({
          conversation_id: conversationId,
          company_id: companyId,
          direction: 'outbound',
          sender_phone: senderPhone,
          message_text: messageText,
          template_name: templateName || null,
          status: 'sent',
          idempotency_key: idempotencyKey,
          created_at: now,
        }).select('id').single();

        if (error) {
          if (error.code === '23505') {
            return { success: true, messageId: 'duplicate-ignored' };
          }
          throw error;
        }

        // Update conversation last message timestamp & text
        await supabaseAdmin.from('whatsapp_conversations').update({
          last_message_text: messageText,
          last_message_at: now,
          updated_at: now,
        }).eq('id', conversationId).eq('company_id', companyId);

        return { success: true, messageId: data.id };
      } catch (err: any) {
        logger.error('[WhatsAppInboxService.sendMessage Error]:', err);
        return { success: false, error: err.message };
      }
    }

    return { success: true, messageId: `msg-sent-${Date.now()}` };
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
