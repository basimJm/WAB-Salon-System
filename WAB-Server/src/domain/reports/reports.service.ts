import { BOOKING_STATUSES, type BookingStatus } from '../../constants/enums';
import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import {
  REPORT_MONTHS_PER_YEAR,
  REPORT_TOP_SALONS,
  REPORT_WEEK_DAYS,
} from '../../constants/reports';
import type { ReportsRepository } from '../../repositories/reports.repository';
import { ValidationError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import { addDays, localDateOf, localDayRange } from '../../utils/time';
import type { SettingsService } from '../settings';
import type { DailyFacts, ReportSnapshot, ReportSource, TopSalon } from './reportSource';

export interface DailyReport {
  readonly date: string;
  readonly facts: DailyFacts;
  readonly snapshot: ReportSnapshot;
}
export interface WeeklyReport {
  readonly from: string;
  readonly to: string;
  readonly facts: DailyFacts;
  readonly topSalons: TopSalon[];
}
export interface MonthlyReport {
  readonly month: string;
  readonly from: string;
  readonly to: string;
  readonly facts: DailyFacts;
  readonly topSalons: TopSalon[];
  readonly payouts: { count: number; amount: number };
  readonly snapshot: ReportSnapshot;
  /** Change against the previous month in percent (one decimal); `null` when that month had none. */
  readonly growth: { bookingsPct: number | null; collectedPct: number | null };
}

export interface ReportsService {
  daily(date: string): Promise<DailyReport>;
  weekly(from: string): Promise<WeeklyReport>;
  monthly(month: string): Promise<MonthlyReport>;
  /** The `reports:aggregate` run: stores yesterday's numbers; resolves to that date. */
  aggregateYesterday(now: Date): Promise<string>;
}

const emptyStatuses = (): Record<BookingStatus, number> =>
  Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0])) as Record<BookingStatus, number>;

export const emptyFacts = (): DailyFacts => ({
  bookings: { total: 0, byStatus: emptyStatuses(), bride: 0 },
  payments: { attempts: 0, succeeded: 0, failed: 0, cancelled: 0, collected: 0, gatewayFees: 0 },
  refunds: { created: 0, completed: 0, failed: 0, amount: 0 },
  registrations: { customers: 0, applications: 0 },
  reviews: { submitted: 0 },
});

export const sumFacts = (list: readonly DailyFacts[]): DailyFacts =>
  list.reduce<DailyFacts>((acc, f) => {
    const byStatus = emptyStatuses();
    for (const s of BOOKING_STATUSES)
      byStatus[s] = acc.bookings.byStatus[s] + f.bookings.byStatus[s];
    return {
      bookings: {
        total: acc.bookings.total + f.bookings.total,
        byStatus,
        bride: acc.bookings.bride + f.bookings.bride,
      },
      payments: {
        attempts: acc.payments.attempts + f.payments.attempts,
        succeeded: acc.payments.succeeded + f.payments.succeeded,
        failed: acc.payments.failed + f.payments.failed,
        cancelled: acc.payments.cancelled + f.payments.cancelled,
        collected: acc.payments.collected + f.payments.collected,
        gatewayFees: acc.payments.gatewayFees + f.payments.gatewayFees,
      },
      refunds: {
        created: acc.refunds.created + f.refunds.created,
        completed: acc.refunds.completed + f.refunds.completed,
        failed: acc.refunds.failed + f.refunds.failed,
        amount: acc.refunds.amount + f.refunds.amount,
      },
      registrations: {
        customers: acc.registrations.customers + f.registrations.customers,
        applications: acc.registrations.applications + f.registrations.applications,
      },
      reviews: { submitted: acc.reviews.submitted + f.reviews.submitted },
    };
  }, emptyFacts());

const growthPct = (current: number, previous: number): number | null =>
  previous === 0 ? null : Math.round(((current - previous) * 1000) / previous) / 10;

/** First day of the month after `month` (`YYYY-MM`). */
const nextMonthStart = (month: string): string => {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return m === REPORT_MONTHS_PER_YEAR
    ? `${String(y + 1).padStart(4, '0')}-01-01`
    : `${String(y).padStart(4, '0')}-${String(m + 1).padStart(2, '0')}-01`;
};
const previousMonth = (month: string): string => {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return m === 1
    ? `${String(y - 1).padStart(4, '0')}-${String(REPORT_MONTHS_PER_YEAR)}`
    : `${String(y).padStart(4, '0')}-${String(m - 1).padStart(2, '0')}`;
};

const invalid = (field: string): ValidationError =>
  new ValidationError({
    code: ERROR_CODES.VALIDATION_ERROR,
    details: [
      {
        field,
        code: ERROR_CODES.VALIDATION_ERROR,
        messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
      },
    ],
  });

export const createReportsService = (deps: {
  source: ReportSource;
  reports: ReportsRepository;
  settings: Pick<SettingsService, 'get'>;
  logger: Logger;
  now?: () => Date;
}): ReportsService => {
  const { source, reports, settings, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());

  const computeDay = async (date: string, tz: string): Promise<DailyFacts> => {
    const range = localDayRange(date, tz);
    return source.dayFacts(range.start, range.end);
  };

  /** A finished day comes from the stored aggregate (computed and stored once if missing). */
  const factsOfDay = async (date: string, today: string, tz: string): Promise<DailyFacts> => {
    if (date >= today) return computeDay(date, tz);
    const stored = await reports.findDaily(date);
    if (stored !== null) return stored.data as unknown as DailyFacts;
    const facts = await computeDay(date, tz);
    try {
      await reports.saveDaily(date, facts as unknown as Record<string, unknown>, now());
    } catch (error) {
      logger.warn({ err: error, date }, 'daily report could not be stored');
    }
    return facts;
  };

  const rangeFacts = async (
    dates: readonly string[],
    today: string,
    tz: string,
  ): Promise<DailyFacts> =>
    sumFacts(
      await Promise.all(dates.filter((d) => d <= today).map((d) => factsOfDay(d, today, tz))),
    );

  const datesBetween = (from: string, toExclusive: string): string[] => {
    const out: string[] = [];
    for (let d = from; d < toExclusive; d = addDays(d, 1)) out.push(d);
    return out;
  };

  const context = async (): Promise<{ tz: string; today: string }> => {
    const tz = await settings.get('timezone');
    return { tz, today: localDateOf(now(), tz) };
  };
  const bounds = (first: string, lastExclusive: string, tz: string): { from: Date; to: Date } => ({
    from: localDayRange(first, tz).start,
    to: localDayRange(addDays(lastExclusive, -1), tz).end,
  });

  return {
    async daily(date) {
      const { tz, today } = await context();
      if (date > today) throw invalid('date');
      const [facts, snapshot] = await Promise.all([factsOfDay(date, today, tz), source.snapshot()]);
      return { date, facts, snapshot };
    },

    async weekly(from) {
      const { tz, today } = await context();
      if (from > today) throw invalid('from');
      const end = addDays(from, REPORT_WEEK_DAYS);
      const range = bounds(from, end, tz);
      const [facts, topSalons] = await Promise.all([
        rangeFacts(datesBetween(from, end), today, tz),
        source.topSalons(range.from, range.to, REPORT_TOP_SALONS),
      ]);
      return { from, to: addDays(end, -1), facts, topSalons };
    },

    async monthly(month) {
      const { tz, today } = await context();
      const first = `${month}-01`;
      if (first > today) throw invalid('month');
      const end = nextMonthStart(month);
      const prevFirst = `${previousMonth(month)}-01`;
      const range = bounds(first, end, tz);
      const [facts, previous, topSalons, payouts, snapshot] = await Promise.all([
        rangeFacts(datesBetween(first, end), today, tz),
        rangeFacts(datesBetween(prevFirst, first), today, tz),
        source.topSalons(range.from, range.to, REPORT_TOP_SALONS),
        source.payoutsTransferred(range.from, range.to),
        source.snapshot(),
      ]);
      return {
        month,
        from: first,
        to: addDays(end, -1),
        facts,
        topSalons,
        payouts,
        snapshot,
        growth: {
          bookingsPct: growthPct(facts.bookings.total, previous.bookings.total),
          collectedPct: growthPct(facts.payments.collected, previous.payments.collected),
        },
      };
    },

    async aggregateYesterday(at) {
      const tz = await settings.get('timezone');
      const date = addDays(localDateOf(at, tz), -1);
      const facts = await computeDay(date, tz);
      await reports.saveDaily(date, facts as unknown as Record<string, unknown>, at);
      return date;
    },
  };
};
