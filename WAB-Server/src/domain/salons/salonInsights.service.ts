import { SALON_ANALYTICS_MAX_DAYS, SALON_RECENT_DAYS } from '../../constants/adminSalonInsights';
import { BOOKING_STATUSES, type BookingStatus } from '../../constants/enums';
import { ERROR_CODES } from '../../constants/errorCodes';
import { MS_PER_DAY } from '../../constants/time';
import type { AuditLogRaw } from '../../models/auditLog.model';
import type { SalonRaw } from '../../models/salon.model';
import type { AuditLogsRepository } from '../../repositories/auditLogs.repository';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import type { MembersRepository } from '../../repositories/identity.repository';
import type { SalonServicesRepository } from '../../repositories/salonServices.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import { NotFoundError, ValidationError } from '../../utils/errors';
import type { PaginationParams } from '../../utils/pagination';
import { addDays, diffDays, isLocalDate, zonedTimeToUtc } from '../../utils/time';
import type { SettingsService } from '../settings';

export type StatusCounts = Readonly<Record<BookingStatus, number>>;

export interface SalonKpis {
  readonly rating: { readonly avg: number; readonly count: number };
  readonly bookings: {
    readonly total: number;
    /** Created in the last `SALON_RECENT_DAYS` days. */
    readonly last30d: number;
    readonly byStatus: StatusCounts;
    readonly byStatus30d: StatusCounts;
  };
  readonly activeServices: number;
  readonly activeStaff: number;
}

export interface SalonAnalytics {
  readonly from: string;
  readonly to: string;
  readonly total: number;
  /** One entry per calendar day of the range, zero days included. */
  readonly days: readonly { readonly date: string; readonly bookings: number }[];
  readonly byStatus: StatusCounts;
}

export interface SalonActivityEntry {
  readonly id: string;
  readonly action: string;
  readonly adminId: string;
  readonly reason: string;
  readonly createdAt: Date;
}

export interface SalonInsightsService {
  kpis(salonId: string): Promise<SalonKpis>;
  /** Bookings created per local day in `[from, to]` (both inclusive, `YYYY-MM-DD`). */
  analytics(input: { salonId: string; from: string; to: string }): Promise<SalonAnalytics>;
  /** What admins did to the salon (approval, offline, edits, deletion decision), newest first. */
  activity(input: {
    salonId: string;
    params: PaginationParams;
  }): Promise<{ items: SalonActivityEntry[]; total: number }>;
}

export interface SalonInsightsDeps {
  readonly salons: Pick<SalonsRepository, 'findById'>;
  readonly bookings: Pick<BookingsRepository, 'countBy' | 'dailyCounts'>;
  readonly salonServices: Pick<SalonServicesRepository, 'countActive'>;
  readonly members: Pick<MembersRepository, 'findMany'>;
  readonly auditLogs: Pick<AuditLogsRepository, 'findPage'>;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly now?: () => Date;
}

const emptyCounts = (): Record<BookingStatus, number> =>
  Object.fromEntries(BOOKING_STATUSES.map((status) => [status, 0])) as Record<
    BookingStatus,
    number
  >;

const toCounts = (raw: Readonly<Record<string, number>>): StatusCounts => {
  const counts = emptyCounts();
  for (const status of BOOKING_STATUSES) counts[status] = raw[status] ?? 0;
  return counts;
};
const sum = (counts: StatusCounts): number =>
  BOOKING_STATUSES.reduce((total, status) => total + counts[status], 0);

const invalid = (field: string): ValidationError =>
  new ValidationError({
    code: ERROR_CODES.VALIDATION_ERROR,
    details: [
      {
        field,
        code: ERROR_CODES.VALIDATION_ERROR,
        messageKey: `errors.${ERROR_CODES.VALIDATION_ERROR}`,
      },
    ],
  });

/** Numbers behind the salon page of the admin panel (Admin PRD A13): KPIs, a daily series, an activity trail. */
export const createSalonInsightsService = (deps: SalonInsightsDeps): SalonInsightsService => {
  const { salons, bookings, salonServices, members, auditLogs, settings } = deps;
  const now = deps.now ?? ((): Date => new Date());

  const find = async (salonId: string): Promise<Entity<SalonRaw>> => {
    const salon = await salons.findById(salonId);
    if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    return salon;
  };

  return {
    async kpis(salonId) {
      const salon = await find(salonId);
      const since = new Date(now().getTime() - SALON_RECENT_DAYS * MS_PER_DAY);
      const id = toObjectId(salonId);
      const [all, recent, activeServices, staff] = await Promise.all([
        bookings.countBy({ salonId: id }, 'status'),
        bookings.countBy({ salonId: id, createdAt: { $gte: since } }, 'status'),
        salonServices.countActive(salonId),
        members.findMany({ salonId, active: true, providesServices: true }),
      ]);
      const byStatus = toCounts(all);
      const byStatus30d = toCounts(recent);
      return {
        rating: salon.rating,
        bookings: { total: sum(byStatus), last30d: sum(byStatus30d), byStatus, byStatus30d },
        activeServices,
        activeStaff: staff.length,
      };
    },

    async analytics({ salonId, from, to }) {
      await find(salonId);
      if (!isLocalDate(from)) throw invalid('query.from');
      if (!isLocalDate(to) || to < from) throw invalid('query.to');
      const length = diffDays(from, to) + 1;
      if (length > SALON_ANALYTICS_MAX_DAYS) throw invalid('query.to');
      const timeZone = await settings.get('timezone');
      // Local midnight of the first day up to local midnight after the last one.
      const start = zonedTimeToUtc(from, 0, timeZone);
      const end = zonedTimeToUtc(addDays(to, 1), 0, timeZone);
      const [perDay, perStatus] = await Promise.all([
        bookings.dailyCounts({ salonId, from: start, to: end, timeZone }),
        bookings.countBy(
          { salonId: toObjectId(salonId), createdAt: { $gte: start, $lt: end } },
          'status',
        ),
      ]);
      const days = Array.from({ length }, (_, index) => {
        const date = addDays(from, index);
        return { date, bookings: perDay[date] ?? 0 };
      });
      return {
        from,
        to,
        total: days.reduce((total, day) => total + day.bookings, 0),
        days,
        byStatus: toCounts(perStatus),
      };
    },

    async activity({ salonId, params }) {
      await find(salonId);
      const page = await auditLogs.findPage({ entityType: 'salon', entityId: salonId }, params, {
        createdAt: -1,
      });
      return {
        items: page.items.map((log: Entity<AuditLogRaw>) => ({
          id: log.id,
          action: log.action,
          adminId: log.adminId,
          reason: log.reason,
          createdAt: log.createdAt,
        })),
        total: page.meta.total,
      };
    },
  };
};
