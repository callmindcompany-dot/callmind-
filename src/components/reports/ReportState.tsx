import React from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';

/**
 * The three answers a report can give, kept apart.
 *
 * ReportsPage used the word isError exactly zero times. Every hook throws
 * correctly, the page dropped the error, and the chart rendered with an empty
 * array -- so a query that could not run looked exactly like a quiet week. Four
 * reports were reading off views that did not exist, and three off functions
 * that raised on every call, and none of it was visible: the screens all said
 * the same thing an honest empty report says.
 *
 * Anything that reads a query goes through here. "No leads yet" shown after a
 * failure is the bug, not the empty state.
 */

interface ReportStateProps {
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  /** True when the query succeeded and genuinely returned nothing. */
  isEmpty: boolean;
  /** What the reader should understand from an empty result, in their terms. */
  emptyMessage?: string;
  /** Retries the query. Without one, a failed report is a dead end. */
  onRetry?: () => void;
  /** Keeps the panel from collapsing as it swaps between states. */
  minHeight?: number;
  children: React.ReactNode;
}

function messageOf(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return null;
}

export const ReportState = React.memo(({
  isLoading,
  isError,
  error,
  isEmpty,
  emptyMessage = 'Nothing recorded for this period.',
  onRetry,
  minHeight = 160,
  children,
}: ReportStateProps) => {
  // Error is checked before loading. React Query keeps isLoading false while a
  // failed query sits in its error state, but a refetch flips loading back on
  // and would otherwise hide a failure behind a spinner that never resolves.
  if (isError) {
    const detail = messageOf(error);
    return (
      <div
        style={{ minHeight }}
        role="alert"
        className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-rose-100 bg-rose-50/60 p-6 text-center"
      >
        <AlertCircle size={20} className="text-rose-500" />
        <p className="text-[11px] font-black uppercase tracking-widest text-rose-700">
          This report could not load
        </p>
        {/* The reason is shown rather than swallowed. A support call that
            starts with the actual message is a much shorter call. */}
        {detail && (
          <p className="max-w-md break-words text-[10px] font-medium text-rose-600/90">{detail}</p>
        )}
        <p className="text-[10px] font-bold text-rose-500/80">
          The figures below are not zero — they are unknown.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-1 flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white transition-colors hover:bg-rose-700"
          >
            <RefreshCw size={11} /> Try again
          </button>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        style={{ minHeight }}
        aria-busy="true"
        className="flex items-center justify-center rounded-3xl border border-gray-100 bg-slate-50/60"
      >
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500" />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div
        style={{ minHeight }}
        className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-gray-200 bg-slate-50/40 p-6 text-center"
      >
        <Inbox size={18} className="text-slate-300" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return <>{children}</>;
});

ReportState.displayName = 'ReportState';

/**
 * Narrows a React Query result to what ReportState needs, so a call site
 * cannot pass one query's isError next to another query's data. That mismatch
 * is invisible on screen -- the panel renders happily while reporting on the
 * wrong query's health.
 */
export function stateOf<T>(
  query: { isLoading: boolean; isError: boolean; error?: unknown; data?: T; refetch?: () => unknown },
  isEmpty: (data: T | undefined) => boolean,
) {
  return {
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isEmpty: !query.isError && !query.isLoading && isEmpty(query.data),
    onRetry: query.refetch ? () => { void query.refetch!(); } : undefined,
  };
}

/** The common case: an array query is empty when it has no rows. */
export const emptyArray = (data: unknown[] | undefined) => !data || data.length === 0;
