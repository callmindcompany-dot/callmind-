/**
 * Money, in rupees, written the way an Indian reader groups digits.
 *
 * Reports printed `${value.toLocaleString()}` -- a dollar sign, in a product
 * sold in rupees to Indian businesses, with Western thousands grouping. The
 * currency was wrong and the grouping was wrong, and both were wrong
 * consistently enough to look deliberate.
 *
 * en-IN groups by the lakh/crore system: 13,55,000, not 1,355,000.
 */
export function formatRupees(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Compact form for axis labels, where the full figure will not fit. */
export function formatRupeesShort(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  // Lakh and crore, not K and M -- a figure a customer here reads at a glance.
  if (abs >= 10_000_000) return `₹${(value / 10_000_000).toFixed(abs >= 100_000_000 ? 0 : 1)}Cr`;
  if (abs >= 100_000) return `₹${(value / 100_000).toFixed(abs >= 1_000_000 ? 0 : 1)}L`;
  if (abs >= 1_000) return `₹${(value / 1_000).toFixed(0)}K`;
  return `₹${Math.round(value)}`;
}
