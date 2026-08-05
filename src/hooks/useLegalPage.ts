import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { LegalPage, UserAcceptance, LegalPageHistory } from '@/types/legal';

// 1. Fetch Legal Document
export function useLegalDocument(
  slug: 'privacy' | 'terms' | 'refund',
  language: 'English' | 'Hindi' | 'Marathi',
  preferDraft: boolean = false
) {
  return useQuery<LegalPage | null>({
    queryKey: ['legal_page', slug, language, preferDraft],
    queryFn: async () => {
      if (preferDraft) {
        const { data: draftData, error: draftError } = await supabase
          .from('legal_pages')
          .select('*')
          .eq('slug', slug)
          .eq('language', language)
          .eq('status', 'draft')
          .maybeSingle();

        if (draftError) throw draftError;
        if (draftData) return draftData as LegalPage;
      }

      // Try to find the document with targeted language
      const { data, error } = await supabase
        .from('legal_pages')
        .select('*')
        .eq('slug', slug)
        .eq('language', language)
        .eq('status', 'published')
        .maybeSingle();

      if (error) throw error;

      // Fallback to English if targeted translation does not exist yet
      if (!data && language !== 'English') {
        const { data: engData, error: engError } = await supabase
          .from('legal_pages')
          .select('*')
          .eq('slug', slug)
          .eq('language', 'English')
          .eq('status', 'published')
          .maybeSingle();
          
        if (engError) throw engError;
        return engData as LegalPage | null;
      }

      return data as LegalPage | null;
    }
  });
}

// 2. Publish/Update Legal Document (Founder Only)
export function usePublishLegalUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      slug,
      language,
      title,
      content,
      status,
      editedBy
    }: {
      slug: 'privacy' | 'terms' | 'refund';
      language: 'English' | 'Hindi' | 'Marathi';
      title: string;
      content: string;
      status: 'draft' | 'published';
      editedBy?: string | null;
    }) => {
      if (status === 'published') {
        // Fetch current published version
        const { data: currentPublished, error: fetchError } = await supabase
          .from('legal_pages')
          .select('*')
          .eq('slug', slug)
          .eq('language', language)
          .eq('status', 'published')
          .maybeSingle();

        if (fetchError) throw fetchError;

        // If exists, insert into history
        if (currentPublished) {
          const currentVerInt = parseInt(currentPublished.version) || 1;
          const { error: histError } = await supabase
            .from('legal_pages_history')
            .insert({
              page_slug: slug,
              version: currentVerInt,
              content: currentPublished.content,
              language: language,
              edited_by: editedBy || null,
              edited_at: new Date().toISOString()
            });

          if (histError) throw histError;
        }

        // Determine new version
        const nextVer = currentPublished ? (parseInt(currentPublished.version) || 1) + 1 : 1;

        // Upsert new published version
        const { data, error } = await supabase
          .from('legal_pages')
          .upsert({
            slug,
            language,
            title,
            content,
            version: nextVer.toString(),
            status: 'published',
            updated_at: new Date().toISOString(),
            published_at: new Date().toISOString()
          }, {
            onConflict: 'slug,language,status'
          })
          .select()
          .single();

        if (error) throw error;

        // Clean up draft record if it exists
        await supabase
          .from('legal_pages')
          .delete()
          .eq('slug', slug)
          .eq('language', language)
          .eq('status', 'draft');

        return data;
      } else {
        // Save as draft
        // Fetch current published version to get its version
        const { data: currentPublished } = await supabase
          .from('legal_pages')
          .select('version')
          .eq('slug', slug)
          .eq('language', language)
          .eq('status', 'published')
          .maybeSingle();

        const draftVer = currentPublished ? currentPublished.version : '1';

        const { data, error } = await supabase
          .from('legal_pages')
          .upsert({
            slug,
            language,
            title,
            content,
            version: draftVer,
            status: 'draft',
            updated_at: new Date().toISOString(),
            published_at: new Date().toISOString()
          }, {
            onConflict: 'slug,language,status'
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['legal_page', data.slug, data.language] });
      queryClient.invalidateQueries({ queryKey: ['legal_history', data.slug, data.language] });
    }
  });
}

// 3. Discard Draft (Founder Only)
export function useDiscardDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      slug,
      language
    }: {
      slug: 'privacy' | 'terms' | 'refund';
      language: 'English' | 'Hindi' | 'Marathi';
    }) => {
      const { data, error, count } = await supabase
        .from('legal_pages')
        .delete({ count: 'exact' })
        .eq('slug', slug)
        .eq('language', language)
        .eq('status', 'draft')
        .select();

      if (error) throw error;
      if (!count) throw new Error('Nothing was deleted — the draft may already be gone.');
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['legal_page', variables.slug, variables.language] });
    }
  });
}

// 4. Fetch Legal Document Version History
export function useLegalHistory(slug: 'privacy' | 'terms' | 'refund', language: 'English' | 'Hindi' | 'Marathi') {
  return useQuery<LegalPageHistory[]>({
    queryKey: ['legal_history', slug, language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_pages_history')
        .select('*')
        .eq('page_slug', slug)
        .eq('language', language)
        .order('version', { ascending: false });

      if (error) throw error;
      return data as LegalPageHistory[];
    }
  });
}

// 5. Check User Acceptance — returns full row so UI can show accepted_at date
export function useUserAcceptance(slug: string, userId: string | null, version: string | undefined) {
  return useQuery<UserAcceptance | null>({
    queryKey: ['user_acceptance', slug, userId, version],
    queryFn: async () => {
      if (!userId || !version) return null;

      const { data, error } = await supabase
        .from('user_acceptances')
        .select('*')
        .eq('user_id', userId)
        .eq('page_slug', slug)
        .eq('version', version)
        .maybeSingle();

      if (error) throw error;
      return data as UserAcceptance | null;
    },
    enabled: !!userId && !!version
  });
}

// 6. Log User Acceptance
export function useAcceptTerms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      companyId,
      pageSlug,
      version,
      language
    }: {
      userId: string;
      companyId: string | null;
      pageSlug: string;
      version: string;
      language?: 'English' | 'Hindi' | 'Marathi';
      ipAddress?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('accept-terms', {
        body: {
          userId,
          companyId,
          pageSlug,
          version,
          language: language || 'English'
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user_acceptance', data?.page_slug, data?.user_id, data?.version] });
      queryClient.invalidateQueries({ queryKey: ['legal_compliance', data?.user_id] });
    }
  });
}

// 7. Invoke legal-actions edge function — returns typed response
export interface LegalActionResult {
  success: boolean;
  downloadUrl?: string;
  message?: string;
  error?: string;
}

export function useLegalAction() {
  return useMutation({
    mutationFn: async ({
      action,
      userId,
      companyId
    }: {
      action: 'export-data' | 'purge-data' | 'cancel-subscription';
      userId: string;
      companyId: string | null;
    }): Promise<LegalActionResult> => {
      const { data, error } = await supabase.functions.invoke('legal-actions', {
        body: { action, userId, companyId }
      });
      if (error) throw error;
      return data as LegalActionResult;
    }
  });
}

// 8. Fetch English document for translation-sync comparison (Task 5)
export function useEnglishDocument(slug: 'privacy' | 'terms' | 'refund') {
  return useQuery<LegalPage | null>({
    queryKey: ['legal_page', slug, 'English', false],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legal_pages')
        .select('updated_at')
        .eq('slug', slug)
        .eq('language', 'English')
        .eq('status', 'published')
        .maybeSingle();
      if (error) throw error;
      return data as LegalPage | null;
    },
    staleTime: 120000
  });
}

