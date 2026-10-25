import type { Language } from '../../constants/enums';
import { ERROR_CODES } from '../../constants/errorCodes';
import { RATING_DECIMAL_SCALE } from '../../constants/reviews';
import { SALON_VIEWED_EVENT } from '../../constants/statistics';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import type { MembersRepository } from '../../repositories/identity.repository';
import type { ReviewsRepository } from '../../repositories/reviews.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import type { ServerEventsRepository } from '../../repositories/serverEvents.repository';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { addDays, diffDays, localDayRange } from '../../utils/time';
import type { SettingsService } from '../settings';
import { bookingKpis, daySeries, rankings, type BookingKpis, type DaySeries } from './statistics';

export interface MerchantStatistics {
  readonly from: string;
  readonly to: string;
  /** The branch the numbers cover; `null` = the whole salon. */
  readonly branchId: string | null;
  readonly bookings: BookingKpis;
  /** Salon page opens in the period (the page is shared by every branch). */
  readonly profileViews: number;
  readonly reviews: { readonly new: number; readonly averageRating: number };
  readonly days: DaySeries[];
  readonly topServices: { id: string; name: string; bookings: number }[];
  readonly topStaff: { id: string; firstName: string; bookings: number; rating: number }[];
}

export interface MerchantStatisticsService {
  /** M21 for a period of civil days (Asia/Amman, both ends included), scoped to the caller's branch. */
  get(input: {
    salonId: string;
    member: { branchId?: string | undefined };
    from: string;
    to: string;
    /** Owner only: one branch; a branch member always gets their own branch. */
    branchId?: string | undefined;
    language: Language;
  }): Promise<MerchantStatistics>;
}

export interface MerchantStatisticsDeps {
  readonly bookings: Pick<BookingsRepository, 'findMany'>;
  readonly reviews: Pick<ReviewsRepository, 'count' | 'approvedTotals'>;
  readonly salons: Pick<SalonsRepository, 'findById'>;
  readonly members: Pick<MembersRepository, 'findMany'>;
  readonly events: Pick<ServerEventsRepository, 'countFor'>;
  readonly settings: Pick<SettingsService, 'get'>;
}

const oneDecimal = (value: number): number =>
  Math.round(value * RATING_DECIMAL_SCALE) / RATING_DECIMAL_SCALE;

export const createMerchantStatisticsService = (
  deps: MerchantStatisticsDeps,
): MerchantStatisticsService => ({
  async get({ salonId, member, from, to, branchId, language }) {
    if (member.branchId !== undefined && branchId !== undefined && branchId !== member.branchId) {
      throw new ForbiddenError({ code: ERROR_CODES.BRANCH_SCOPE_DENIED });
    }
    const branch = member.branchId ?? branchId;
    const salon = await deps.salons.findById(salonId);
    if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    const timeZone = await deps.settings.get('timezone');
    const start = localDayRange(from, timeZone).start;
    const end = localDayRange(to, timeZone).end;
    const inBranch = branch === undefined ? {} : { branchId: branch };
    const [bookings, newReviews, branchTotals, profileViews] = await Promise.all([
      deps.bookings.findMany({
        salonId,
        ...inBranch,
        appointmentStart: { $gte: start, $lt: end },
      }),
      deps.reviews.count({
        salonId,
        status: 'APPROVED',
        ...inBranch,
        createdAt: { $gte: start, $lt: end },
      }),
      branch === undefined
        ? Promise.resolve(null)
        : deps.reviews.approvedTotals({ salonId, target: 'SALON', branchId: branch }),
      deps.events.countFor({ name: SALON_VIEWED_EVENT, salonId, from: start, to: end }),
    ]);
    const days = Array.from({ length: diffDays(from, to) + 1 }, (_, i) => addDays(from, i));
    const ranked = rankings(bookings);
    // Names as the bookings recorded them (a later rename does not rewrite history).
    const serviceNames = new Map<string, string>();
    for (const b of bookings) {
      for (const person of b.persons) {
        for (const s of person.services) serviceNames.set(s.salonServiceId, s.name[language]);
      }
    }
    const staffIds = ranked.staff.map((s) => s.id);
    const staff =
      staffIds.length === 0 ? [] : await deps.members.findMany({ _id: { $in: staffIds } });
    const staffById = new Map(staff.map((m) => [m.id, m]));
    return {
      from,
      to,
      branchId: branch ?? null,
      bookings: bookingKpis(bookings),
      profileViews,
      reviews: {
        new: newReviews,
        // Salon rating = every branch together; a branch shows the average of its labelled reviews.
        averageRating:
          branchTotals === null
            ? salon.rating.avg
            : branchTotals.count === 0
              ? 0
              : oneDecimal(branchTotals.sum / branchTotals.count),
      },
      days: daySeries(bookings, days, timeZone),
      topServices: ranked.services.map((s) => ({
        id: s.id,
        name: serviceNames.get(s.id) ?? '',
        bookings: s.bookings,
      })),
      topStaff: ranked.staff.map((s) => {
        const found = staffById.get(s.id);
        return {
          id: s.id,
          firstName: found?.firstName ?? '',
          bookings: s.bookings,
          rating: found?.staff?.rating.avg ?? 0,
        };
      }),
    };
  },
});
