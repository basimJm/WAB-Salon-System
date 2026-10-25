import type { Language } from '../../constants/enums';
import { ERROR_CODES } from '../../constants/errorCodes';
import {
  DASHBOARD_PENDING_COUNT,
  DASHBOARD_STATS_DAYS,
  DASHBOARD_TODAY_MAX,
  SUBSCRIBED_SALON_STATES,
} from '../../constants/dashboard';
import type { SalonState } from '../../constants/salon';
import type { StorageProvider } from '../../providers/storage';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { NotFoundError } from '../../utils/errors';
import { formatJod } from '../../utils/money';
import type { JsonCache } from '../../utils/redis/jsonCache';
import { addDays, localDateOf } from '../../utils/time';
import type { BookingQueriesService, BookingRow } from '../bookings/bookingQueries.service';
import type { MerchantFinanceService } from '../finance/merchantFinance.service';
import type { InboxService } from '../notifications/inbox.service';
import type { SettingsService } from '../settings';
import type { MerchantStatisticsService } from '../statistics/merchantStatistics.service';

/** M07, JSON-ready (it is cached as is). Sections the member may not see are `null`. */
export interface MerchantDashboard {
  readonly salon: {
    id: string;
    name: string;
    profileImageUrl: string | null;
    state: SalonState;
    missing: readonly string[];
  };
  /** Set while the trial or subscription ends within the warning window. */
  readonly subscriptionWarning: { endsAt: string; daysRemaining: number } | null;
  readonly unreadNotifications: number;
  /** `BOOKINGS_RESPOND` only. */
  readonly pending: { count: number; items: BookingRow[] } | null;
  /** `BOOKINGS_VIEW_ALL` / `BOOKINGS_VIEW_OWN` (own bookings only) — otherwise `null`. */
  readonly today: {
    approved: number;
    completed: number;
    next: BookingRow | null;
    timeline: BookingRow[];
  } | null;
  /** `STATISTICS_VIEW` only: the last 7 days. */
  readonly quickStats: { bookings: number; revenue: string; rating: number } | null;
}

export interface MerchantDashboardService {
  get(input: {
    salonId: string;
    member: { id: string; permissions: readonly string[]; branchId?: string | undefined };
    language: Language;
  }): Promise<MerchantDashboard>;
}

export interface MerchantDashboardDeps {
  readonly salons: Pick<SalonsRepository, 'findById'>;
  readonly storage: Pick<StorageProvider, 'getPublicUrl'>;
  readonly bookings: Pick<BookingQueriesService, 'list'>;
  readonly finance: Pick<MerchantFinanceService, 'subscription'>;
  readonly inbox: Pick<InboxService, 'unreadCount'>;
  readonly statistics: Pick<MerchantStatisticsService, 'get'>;
  readonly settings: Pick<SettingsService, 'get'>;
  /** Short per-member cache; without it every call queries. */
  readonly cache?: JsonCache;
  readonly now?: () => Date;
}

const can = (member: { permissions: readonly string[] }, key: string): boolean =>
  member.permissions.includes(key);

/**
 * One call for the home screen (M07): salon state, the subscription warning, unread count,
 * pending requests, today and quick stats — each section only when the member's permissions
 * allow it, and scoped to the member's branch by the services it reuses (§6).
 */
export const createMerchantDashboardService = (
  deps: MerchantDashboardDeps,
): MerchantDashboardService => {
  const now = deps.now ?? ((): Date => new Date());

  const build = async ({
    salonId,
    member,
    language,
  }: Parameters<MerchantDashboardService['get']>[0]): Promise<MerchantDashboard> => {
    const salon = await deps.salons.findById(salonId);
    if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    const audience = { kind: 'MERCHANT' as const, salonId, member };
    const seesBookings = can(member, 'BOOKINGS_VIEW_ALL') || can(member, 'BOOKINGS_VIEW_OWN');
    const timeZone = await deps.settings.get('timezone');
    const today = localDateOf(now(), timeZone);
    const [subscription, unread, pending, todays, stats] = await Promise.all([
      SUBSCRIBED_SALON_STATES.includes(salon.state)
        ? deps.finance.subscription(salonId)
        : Promise.resolve(null),
      deps.inbox.unreadCount({ recipientType: 'MEMBER', id: member.id }),
      can(member, 'BOOKINGS_RESPOND')
        ? deps.bookings.list({
            audience,
            query: { tab: 'PENDING' },
            params: { page: 1, pageSize: DASHBOARD_PENDING_COUNT },
            language,
          })
        : Promise.resolve(null),
      seesBookings
        ? deps.bookings.list({
            audience,
            query: { tab: 'TODAY' },
            params: { page: 1, pageSize: DASHBOARD_TODAY_MAX },
            language,
          })
        : Promise.resolve(null),
      can(member, 'STATISTICS_VIEW')
        ? deps.statistics.get({
            salonId,
            member,
            from: addDays(today, 1 - DASHBOARD_STATS_DAYS),
            to: today,
            language,
          })
        : Promise.resolve(null),
    ]);
    const at = now().toISOString();
    const timeline = (todays?.items ?? []).filter(
      (b) => (b.status === 'APPROVED' || b.status === 'PENDING') && b.appointmentEnd >= at,
    );
    return {
      salon: {
        id: salon.id,
        name: salon.name,
        profileImageUrl:
          salon.profileKey === undefined ? null : deps.storage.getPublicUrl(salon.profileKey),
        state: salon.state,
        missing: salon.completeness.missing,
      },
      subscriptionWarning:
        subscription?.endingSoon === true
          ? { endsAt: subscription.endsAt.toISOString(), daysRemaining: subscription.daysRemaining }
          : null,
      unreadNotifications: unread,
      pending: pending === null ? null : { count: pending.total, items: pending.items },
      today:
        todays === null
          ? null
          : {
              approved: todays.items.filter((b) => b.status === 'APPROVED').length,
              completed: todays.items.filter((b) => b.status === 'COMPLETED').length,
              next: timeline.find((b) => b.status === 'APPROVED') ?? null,
              timeline,
            },
      quickStats:
        stats === null
          ? null
          : {
              bookings: stats.bookings.total,
              revenue: formatJod(stats.bookings.revenue.total),
              rating: stats.reviews.averageRating,
            },
    };
  };

  return {
    get: (input) =>
      deps.cache === undefined
        ? build(input)
        : deps.cache(`${input.member.id}:${input.language}`, () => build(input)),
  };
};
