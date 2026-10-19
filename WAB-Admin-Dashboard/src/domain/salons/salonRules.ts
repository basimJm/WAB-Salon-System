import type { SalonDetails, SalonSummary } from './salons';

/** The owner asked for deletion and no decision was made yet. */
export const hasOpenDeletionRequest = (
  s: Pick<SalonSummary, 'deletionRequestedAt'> & { deletionApprovedAt?: string | null },
): boolean => s.deletionRequestedAt !== null && !s.deletionApprovedAt;

export const canDecideDeletion = (
  s: Pick<SalonDetails, 'deletionRequestedAt' | 'deletionApprovedAt'>,
): boolean => hasOpenDeletionRequest(s);

/** Share of the 30-day bookings that were completed, 0 to 100 (0 when there were none). */
export function completionRatePct(byStatus30d: Readonly<Record<string, number>>): number {
  const total = Object.values(byStatus30d).reduce((sum, n) => sum + n, 0);
  if (total === 0) return 0;
  return Math.round(((byStatus30d['COMPLETED'] ?? 0) / total) * 100);
}
