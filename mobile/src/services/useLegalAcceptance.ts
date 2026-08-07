import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { LEGAL_DOCUMENTS, LEGAL_SLUGS } from '../config/legal';

/**
 * Whether this user has accepted the current version of each legal document.
 *
 * The web app has useLegalCompliance doing the same job. The mobile app had
 * nothing: its legal screen showed an "I Accept" button that called onBack and
 * wrote no record at all, so there was no way to know whether a telecaller had
 * ever agreed to anything — and raising a document version changed nothing for
 * them.
 *
 * Fails open. If the check itself errors — offline, RLS, a bad session — the
 * user is let through rather than locked out of their work by a query about
 * paperwork. The error is surfaced so it is not invisible.
 */
export function useLegalAcceptance(userId: string | null | undefined) {
  const [needsAcceptance, setNeedsAcceptance] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!userId) {
      setChecking(false);
      setNeedsAcceptance(false);
      return;
    }

    setChecking(true);
    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from('user_acceptances')
        .select('page_slug, version')
        .eq('user_id', userId);

      if (queryError) throw queryError;

      const accepted = new Set((data ?? []).map((r) => `${r.page_slug}@${r.version}`));
      const outstanding = LEGAL_SLUGS.some(
        (slug) => !accepted.has(`${slug}@${LEGAL_DOCUMENTS[slug].version}`),
      );

      setNeedsAcceptance(outstanding);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not check legal acceptance.');
      setNeedsAcceptance(false);
    } finally {
      setChecking(false);
    }
  }, [userId]);

  useEffect(() => {
    void check();
  }, [check]);

  return { needsAcceptance, checking, error, recheck: check };
}
