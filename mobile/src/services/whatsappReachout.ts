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
  language: string;
  bodyText: string;
  headerType?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO' | 'NONE';
}

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
   * Substitute template placeholders (e.g. {{lead_name}}, {{company_name}})
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
};
