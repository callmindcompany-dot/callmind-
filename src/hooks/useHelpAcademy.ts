import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { HelpFaq, ChatMessage, VideoTutorial, PdfGuide, CompanySupportSettings } from '@/types/helpAcademy';

// 1. Help FAQs Hook
export function useHelpFaqs(companyId: string | null) {
  return useQuery<HelpFaq[]>({
    queryKey: ['help_faqs', companyId],
    queryFn: async () => {
      let query = supabase.from('help_faqs').select('*');
      if (companyId) {
        query = query.or(`company_id.eq.${companyId},company_id.is.null`);
      } else {
        query = query.is('company_id', null);
      }

      const { data, error } = await query.order('order_num', { ascending: true });
      if (error) throw error;

      if (!data || data.length === 0) {
        // Seed default help FAQs
        const defaultFaqs = [
          { company_id: null as string | null, category: 'Getting Started', question: 'How do I initialize my CallMind CRM?', answer: 'Navigate to Settings to activate your tenant, then upload your telecalling list in the Leads panel to get started.', order_num: 1 },
          { company_id: null as string | null, category: 'Leads', question: 'How do I import telecalling lists?', answer: 'Click on the Leads panel, and select "Import CSV". Ensure your columns contain name, phone, and standard status keys.', order_num: 2 },
          { company_id: null as string | null, category: 'Calls', question: 'How are auto-retries scheduled?', answer: 'The Smart Callback Engine calculates delays automatically based on outcomes (e.g. Busy = +30m, Switched Off = Tomorrow 10 AM).', order_num: 3 },
          { company_id: null as string | null, category: 'Billing', question: 'Where can I review pricing plans?', answer: 'Founder dashboards and subscription billing settings let you toggle plans between Basic, Standard, and Enterprise plans.', order_num: 4 }
        ];

        const { error: seedError } = await supabase.from('help_faqs').insert(defaultFaqs);
        if (seedError) throw seedError;

        const { data: refetched } = await supabase.from('help_faqs').select('*').order('order_num', { ascending: true });
        return (refetched || []) as HelpFaq[];
      }

      return data as HelpFaq[];
    },
    staleTime: 60000
  });
}

// 2. Support Chat Hooks
export function useSupportChatHistory(companyId: string | null, userId: string | null) {
  return useQuery<ChatMessage[]>({
    queryKey: ['support_chat_history', companyId, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('support_chat_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as ChatMessage[];
    },
    enabled: !!userId,
    staleTime: 10000
  });
}

export function useSendSupportMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      companyId,
      userId,
      role,
      message
    }: {
      companyId: string | null;
      userId: string;
      role: 'user' | 'ai';
      message: string;
    }) => {
      const { data, error } = await supabase
        .from('support_chat_history')
        .insert({
          company_id: companyId,
          user_id: userId,
          role,
          message
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['support_chat_history', data.company_id, data.user_id] });
    }
  });
}

// 3. Video Tutorials Hooks
export function useVideoTutorials() {
  return useQuery<VideoTutorial[]>({
    queryKey: ['video_tutorials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('video_tutorials')
        .select('*')
        .order('order_num', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Seed default tutorials
        const defaultVideos = [
          { title: 'CallMind Setup Blueprint', youtube_id: 'Y3k3zB86f4I', duration: '2:15', category: 'Leads', description: 'Understand the core CRM layout, how to upload telecalling leads, and configure agent settings.', order_num: 1 },
          { title: 'Connecting AI Outbound Dialers', youtube_id: 'dQw4w9WgXcQ', duration: '5:40', category: 'Calls', description: 'Train your virtual AI agents with your company FAQ context and select standard regional speech voices.', order_num: 2 },
          { title: 'Campaign Outreach Sequences', youtube_id: '3JZ_D3K6IhY', duration: '3:20', category: 'Settings', description: 'Build automated drips mapping WhatsApp and email pings, and configure smart pause intervals.', order_num: 3 }
        ];

        const { error: seedError } = await supabase.from('video_tutorials').insert(defaultVideos);
        if (seedError) throw seedError;

        const { data: refetched } = await supabase.from('video_tutorials').select('*').order('order_num', { ascending: true });
        return (refetched || []) as VideoTutorial[];
      }

      return data as VideoTutorial[];
    },
    staleTime: 60000
  });
}

// 4. PDF Guides Hooks
export function usePdfGuides() {
  return useQuery<PdfGuide[]>({
    queryKey: ['pdf_guides'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pdf_guides')
        .select('*')
        .order('order_num', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        const defaultPdfs = [
          { title: 'CallMind Setup Guide PDF', file_url: '/CallMind_Setup_Guide.pdf', category: 'Leads', order_num: 1 }
        ];

        const { error: seedError } = await supabase.from('pdf_guides').insert(defaultPdfs);
        if (seedError) throw seedError;

        const { data: refetched } = await supabase.from('pdf_guides').select('*').order('order_num', { ascending: true });
        return (refetched || []) as PdfGuide[];
      }

      return data as PdfGuide[];
    },
    staleTime: 60000
  });
}

// 5. Company Support Settings
export function useCompanySupportSettings(companyId: string | null) {
  return useQuery<CompanySupportSettings | null>({
    queryKey: ['company_settings', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const defaultSettings = {
          company_id: companyId,
          support_email: 'support@callmind.company',
          // Left empty until the operator sets a real one; the UI hides the
          // button rather than pointing it at an invented number.
          support_whatsapp: null as string | null
        };

        const { data: inserted, error: insertError } = await supabase
          .from('company_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (insertError) throw insertError;
        return inserted as CompanySupportSettings;
      }

      return data as CompanySupportSettings;
    },
    enabled: !!companyId,
    staleTime: 120000
  });
}
