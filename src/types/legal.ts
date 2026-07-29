export interface LegalPage {
  id: string;
  slug: 'privacy' | 'terms' | 'refund';
  title: string;
  content: string;
  version: string;
  language: 'English' | 'Hindi' | 'Marathi';
  status?: 'draft' | 'published';
  published_at?: string;
  updated_at?: string;
  // Per-language update timestamps for translation-sync warning (Task 5)
  updated_at_en?: string | null;
  updated_at_hi?: string | null;
  updated_at_mr?: string | null;
}

export interface UserAcceptance {
  id: string;
  user_id: string;
  company_id: string;
  page_slug: string;
  version: string;
  accepted_at: string;
  ip_address?: string | null;
}

export interface LegalPageHistory {
  id: string;
  page_slug: string;
  version: number;
  content: string;
  language: string;
  edited_by?: string | null;
  edited_at: string;
  // Display-only: editor email/name fetched by join (optional)
  editor_name?: string | null;
}
