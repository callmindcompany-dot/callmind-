import { supabase } from './supabase';

/**
 * The four screens that were reachable and still showed literals.
 *
 * Each had a table behind it the whole time:
 *
 *   TargetScreen        showed incentives of ₹ 2,500 and ₹ 5,000 and read
 *                       nothing. `targets` holds the company's real ones.
 *   DocumentsScreen     rendered a `docs` array written into the file.
 *   HelpCenterScreen    rendered a `faqs` array written into the file.
 *   NotificationCenter  read nothing at all.
 *
 * Everything here throws. A screen that renders empty after a failed query
 * tells an agent there is no target, no document and nothing to read, and all
 * three are things they would act on.
 */

export interface TargetRow {
  id: string;
  label: string;
  targetValue: number;
  currentValue: number;
  type: string;
}

export interface DocumentRow {
  id: string;
  fileName: string;
  category: string;
  sizeBytes: number;
  status: string;
  uploadedAt: string;
}

export interface FaqRow {
  id: string;
  category: string;
  question: string;
  answer: string;
}

export const workspaceService = {
  /** The company's targets. Empty is a real answer: nobody has set one. */
  async targets(companyId: string): Promise<TargetRow[]> {
    if (!companyId) return [];

    const { data, error } = await supabase
      .from('targets')
      .select('id, label, target_value, current_value, type')
      .eq('company_id', companyId);

    if (error) throw error;

    return (data ?? []).map((r) => ({
      id: r.id,
      label: r.label,
      // NULLable in the schema, so a missing number reads as zero progress
      // rather than as NaN in the ring.
      targetValue: Number(r.target_value ?? 0),
      currentValue: Number(r.current_value ?? 0),
      type: r.type ?? 'custom',
    }));
  },

  /**
   * Documents this agent uploaded.
   *
   * Scoped to `uploaded_by`, not the whole company. R2 has no row-level
   * security and tenant isolation for files is the application's job, so this
   * does not widen what a telecaller can see beyond their own uploads.
   */
  async documents(companyId: string, userId: string): Promise<DocumentRow[]> {
    if (!companyId || !userId) return [];

    const { data, error } = await supabase
      .from('documents')
      .select('id, file_name, category, size_bytes, status, uploaded_at, created_at, deleted_at')
      .eq('company_id', companyId)
      .eq('uploaded_by', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return (data ?? []).map((r) => ({
      id: r.id,
      fileName: r.file_name,
      category: r.category ?? 'General',
      sizeBytes: Number(r.size_bytes ?? 0),
      status: r.status ?? 'uploaded',
      uploadedAt: r.uploaded_at ?? r.created_at,
    }));
  },

  /**
   * Help articles.
   *
   * company_id is NULLable: a NULL row is a CallMind-wide article and a set one
   * belongs to a single workspace. Both are shown, which is why this cannot use
   * a plain equality filter.
   */
  async faqs(companyId: string): Promise<FaqRow[]> {
    const { data, error } = await supabase
      .from('help_faqs')
      .select('id, category, question, answer, order_num, company_id')
      .or(companyId ? `company_id.is.null,company_id.eq.${companyId}` : 'company_id.is.null')
      .order('order_num', { ascending: true })
      .limit(100);

    if (error) throw error;

    return (data ?? []).map((r) => ({
      id: r.id,
      category: r.category,
      question: r.question,
      answer: r.answer,
    }));
  },
};

/** "1.4 MB", "812 KB" — for a file list, not a spreadsheet. */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
