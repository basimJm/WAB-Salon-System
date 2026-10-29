import { AppError } from '@/infrastructure/errors/AppError';

const SCHEDULE_CONFLICT = 'SCHEDULE_CONFLICT';

/**
 * The future bookings that block narrowing a salon's audience (§5.19 → §5.12): the server answers
 * 409 SCHEDULE_CONFLICT with one detail per booking whose `field` is the booking id. Any other error gives none.
 */
export function conflictBookingIds(error: unknown): string[] {
  if (!(error instanceof AppError) || error.code !== SCHEDULE_CONFLICT) return [];
  return [...new Set(error.details.map((d) => d.field).filter((id) => id.length > 0))];
}
