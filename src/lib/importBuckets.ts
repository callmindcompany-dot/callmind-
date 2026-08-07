/**
 * Sorting import rows into inserts, updates and skips.
 *
 * Extracted from SmartImportModal so it can be tested. The bug that prompted
 * this was invisible from the outside: `inserts` is a filtered subset of the
 * rows being processed -- skipped duplicates and merged updates are not in it --
 * and the failure handler indexed back into the original array using the
 * position within `inserts`. On any file where a single row was skipped, the
 * downloadable error report named the wrong records, and Retry Failed Rows then
 * retried those.
 *
 * Nothing about the counts looked wrong, which is why it could sit there. Each
 * bucket now carries the index of the row it came from.
 */

export type DuplicatePolicy = 'skip' | 'overwrite' | 'merge';

export interface ExistingLead {
  id: string;
  custom_data: Record<string, unknown>;
  custom_fields: Record<string, unknown>;
}

export interface InsertOp {
  sourceIndex: number;
  payload: Record<string, unknown>;
}

export interface UpdateOp {
  sourceIndex: number;
  id: string;
  payload: Record<string, unknown>;
}

export interface BucketResult {
  inserts: InsertOp[];
  updates: UpdateOp[];
  skipped: number;
}

/**
 * @param rows            the rows to import, in the order the user sees them
 * @param existingByPhone leads already in this company, keyed by cleaned phone
 * @param policy          what to do when a row matches an existing lead
 * @param buildPayload    turns a row into the columns to write
 * @param now             injected so merge timestamps are deterministic in tests
 */
export function bucketImportRows<T extends { cleanedPhone: string }>(
  rows: T[],
  existingByPhone: Map<string, ExistingLead>,
  policy: DuplicatePolicy,
  buildPayload: (row: T) => Record<string, unknown>,
  now: () => string = () => new Date().toISOString(),
): BucketResult {
  const inserts: InsertOp[] = [];
  const updates: UpdateOp[] = [];
  let skipped = 0;

  rows.forEach((row, sourceIndex) => {
    const existing = existingByPhone.get(row.cleanedPhone);

    if (existing && policy === 'skip') {
      skipped++;
      return;
    }

    const payload = buildPayload(row);

    if (!existing) {
      inserts.push({ sourceIndex, payload });
      return;
    }

    if (policy === 'overwrite') {
      updates.push({
        sourceIndex,
        id: existing.id,
        payload: { ...payload, updated_at: now() },
      });
      return;
    }

    // merge: keep what is already on the lead, let the file win on conflicts
    updates.push({
      sourceIndex,
      id: existing.id,
      payload: {
        custom_data: {
          ...existing.custom_data,
          ...(payload.custom_data as Record<string, unknown>),
          mergedAt: now(),
        },
        custom_fields: {
          ...existing.custom_fields,
          ...(payload.custom_fields as Record<string, unknown>),
        },
        updated_at: now(),
      },
    });
  });

  return { inserts, updates, skipped };
}
