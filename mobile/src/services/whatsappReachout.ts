import { supabase } from './supabase';
import { Linking } from 'react-native';

export interface WhatsAppSessionStatus {
  isSessionOpen: boolean;
  lastCustomerMessageAt: string | null;
  hoursRemaining: number;
}

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  bodyText: string;
  icon?: string;
}

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: 'intro_greeting',
    name: 'Introduction & Thanks',
    category: 'Greeting',
    icon: '👋',
    bodyText: 'Hello {{lead_name}}, thank you for speaking with us today regarding our services. Please let us know if you have any questions or need further details.',
  },
  {
    id: 'send_brochure',
    name: 'Brochure & Catalog',
    category: 'Product Details',
    icon: '📄',
    bodyText: 'Hi {{lead_name}}, as discussed on our call, here are our product details and catalog. Feel free to review and let me know your thoughts.',
  },
  {
    id: 'quotation_followup',
    name: 'Quotation / Pricing',
    category: 'Sales',
    icon: '💰',
    bodyText: 'Dear {{lead_name}}, sharing our formal proposal and special pricing as discussed. Please review and confirm your requirement.',
  },
  {
    id: 'meeting_confirm',
    name: 'Meeting / Visit Confirmation',
    category: 'Meeting',
    icon: '📅',
    bodyText: 'Hello {{lead_name}}, confirming our upcoming scheduled follow-up / site visit for {{follow_up_time}}. Our team looks forward to connecting with you.',
  },
  {
    id: 'missed_call_callback',
    name: 'Tried Calling / Callback',
    category: 'Follow-up',
    icon: '📞',
    bodyText: 'Hi {{lead_name}}, I tried reaching you earlier regarding your inquiry. Please let me know a convenient time to reconnect.',
  },
];

export const whatsappReachoutService = {
  /**
   * Check if a customer has messaged within the 24-hour Customer Care window.
   * Scoped to the caller's verified company and lead/phone.
   */
  async check24HourWindow(
    companyId: string,
    phone: string,
  ): Promise<WhatsAppSessionStatus> {
    if (!companyId || !phone) {
      return { isSessionOpen: false, lastCustomerMessageAt: null, hoursRemaining: 0 };
    }

    try {
      const sanitizedPhone = phone.replace(/\D/g, '');
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Inbound customer messages in whatsapp_messages table
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('created_at, direction')
        .eq('company_id', companyId)
        .eq('phone', sanitizedPhone)
        .eq('direction', 'inbound')
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        return { isSessionOpen: false, lastCustomerMessageAt: null, hoursRemaining: 0 };
      }

      const lastMsgDate = new Date(data[0].created_at);
      const elapsedMs = Date.now() - lastMsgDate.getTime();
      const hoursRemaining = Math.max(0, Math.round((24 * 60 * 60 * 1000 - elapsedMs) / (60 * 60 * 1000)));

      return {
        isSessionOpen: true,
        lastCustomerMessageAt: data[0].created_at,
        hoursRemaining,
      };
    } catch (err) {
      console.warn('[whatsappReachoutService] Failed to check 24h window:', err);
      return { isSessionOpen: false, lastCustomerMessageAt: null, hoursRemaining: 0 };
    }
  },

  /**
   * Substitute template placeholders (e.g. {{lead_name}}, {{follow_up_time}})
   */
  renderTemplate(templateBody: string, variables: Record<string, string>): string {
    let rendered = templateBody;
    for (const [key, val] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), val);
    }
    return rendered;
  },

  /**
   * Open WhatsApp with pre-filled message
   */
  async openWhatsAppChat(phone: string, message: string): Promise<boolean> {
    const sanitized = phone.replace(/\D/g, '');
    if (!sanitized) return false;
    const url = `https://wa.me/${sanitized}?text=${encodeURIComponent(message)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  /**
   * Fetch company templates from database with local defaults fallback
   */
  async getTemplates(companyId?: string | null): Promise<WhatsAppTemplate[]> {
    if (!companyId) return DEFAULT_WHATSAPP_TEMPLATES;
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('id, name, category, body_text')
        .eq('company_id', companyId);

      if (error || !data || data.length === 0) {
        return DEFAULT_WHATSAPP_TEMPLATES;
      }

      return data.map((t: any) => ({
        id: t.id,
        name: t.name,
        category: t.category || 'General',
        bodyText: t.body_text,
        icon: '💬',
      }));
    } catch {
      return DEFAULT_WHATSAPP_TEMPLATES;
    }
  },
};
