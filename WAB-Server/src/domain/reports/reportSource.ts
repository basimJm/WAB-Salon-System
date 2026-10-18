import { BOOKING_STATUSES, type BookingStatus } from '../../constants/enums';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import type { CustomersRepository } from '../../repositories/identity.repository';
import type { PayoutsRepository } from '../../repositories/payouts.repository';
import type { RefundsRepository } from '../../repositories/refunds.repository';
import type { ReviewsRepository } from '../../repositories/reviews.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import type { SubscriptionsRepository } from '../../repositories/subscriptions.repository';
import type { TransactionsRepository } from '../../repositories/transactions.repository';

/** One finished business day, in fils where money. Everything adds up across days. */
export interface DailyFacts {
  readonly bookings: {
    readonly total: number;
    readonly byStatus: Readonly<Record<BookingStatus, number>>;
    readonly bride: number;
  };
  readonly payments: {
    readonly attempts: number;
    readonly succeeded: number;
    readonly failed: number;
    readonly cancelled: number;
    readonly collected: number;
    readonly gatewayFees: number;
  };
  readonly refunds: {
    readonly created: number;
    readonly completed: number;
    readonly failed: number;
    readonly amount: number;
  };
  readonly registrations: { readonly customers: number; readonly applications: number };
  readonly reviews: { readonly submitted: number };
}

export interface TopSalon {
  readonly salonId: string;
  readonly bookings: number;
  readonly completed: number;
  readonly lost: number;
}

/** Numbers that exist only "now" (not per day). */
export interface ReportSnapshot {
  readonly reviewsPending: number;
  readonly refundsPending: number;
  readonly applicationsPending: number;
  readonly subscriptions: {
    readonly trial: number;
    readonly active: number;
    readonly expired: number;
  };
}

/** Where the report numbers come from (the Mongo adapter below; fakes in tests). */
export interface ReportSource {
  dayFacts(from: Date, to: Date): Promise<DailyFacts>;
  topSalons(from: Date, to: Date, limit: number): Promise<TopSalon[]>;
  payoutsTransferred(from: Date, to: Date): Promise<{ count: number; amount: number }>;
  snapshot(): Promise<ReportSnapshot>;
}

export const createMongoReportSource = (deps: {
  bookings: BookingsRepository;
  transactions: TransactionsRepository;
  refunds: RefundsRepository;
  customers: CustomersRepository;
  salons: SalonsRepository;
  reviews: ReviewsRepository;
  subscriptions: SubscriptionsRepository;
  payouts: PayoutsRepository;
}): ReportSource => {
  const { bookings, transactions, refunds, customers, salons, reviews, subscriptions, payouts } =
    deps;
  const within = (from: Date, to: Date): { $gte: Date; $lt: Date } => ({ $gte: from, $lt: to });

  return {
    async dayFacts(from, to) {
      const created = { createdAt: within(from, to) };
      const [
        byStatus,
        bride,
        tx,
        collected,
        fees,
        refundRows,
        refundAmount,
        customersNew,
        apps,
        rev,
      ] = await Promise.all([
        bookings.countBy(created, 'status'),
        bookings.count({ ...created, hasBride: true }),
        transactions.countBy(created, 'status'),
        transactions.sumField({ ...created, status: 'SUCCEEDED' }, 'amount'),
        transactions.sumField({ ...created, status: 'SUCCEEDED' }, 'gatewayFee'),
        refunds.countBy(created, 'status'),
        refunds.sumField({ ...created, status: 'REFUNDED' }, 'amount'),
        customers.count(created),
        salons.count({ 'application.submittedAt': within(from, to) }),
        reviews.count(created),
      ]);
      const statuses = Object.fromEntries(
        BOOKING_STATUSES.map((status) => [status, byStatus[status] ?? 0]),
      ) as Record<BookingStatus, number>;
      const succeeded = tx['SUCCEEDED'] ?? 0;
      const failed = tx['FAILED'] ?? 0;
      const cancelled = tx['CANCELLED'] ?? 0;
      return {
        bookings: {
          total: Object.values(statuses).reduce((a, b) => a + b, 0),
          byStatus: statuses,
          bride,
        },
        payments: {
          attempts: succeeded + failed + cancelled + (tx['PENDING'] ?? 0),
          succeeded,
          failed,
          cancelled,
          collected,
          gatewayFees: fees,
        },
        refunds: {
          created: Object.values(refundRows).reduce((a, b) => a + b, 0),
          completed: refundRows['REFUNDED'] ?? 0,
          failed: refundRows['REFUND_FAILED'] ?? 0,
          amount: refundAmount,
        },
        registrations: { customers: customersNew, applications: apps },
        reviews: { submitted: rev },
      };
    },

    topSalons: (from, to, limit) => bookings.topSalons(from, to, limit),

    async payoutsTransferred(from, to) {
      const filter = { status: 'TRANSFERRED' as const, transferredAt: within(from, to) };
      const [count, amount] = await Promise.all([
        payouts.count(filter),
        payouts.sumField(filter, 'net'),
      ]);
      return { count, amount };
    },

    async snapshot() {
      const [reviewsPending, refundsPending, applicationsPending, subs] = await Promise.all([
        reviews.count({ status: 'PENDING' }),
        refunds.count({ status: 'REFUND_PENDING' }),
        salons.count({ state: 'APPLICATION_PENDING' }),
        subscriptions.countBy({}, 'status'),
      ]);
      return {
        reviewsPending,
        refundsPending,
        applicationsPending,
        subscriptions: {
          trial: subs['TRIAL'] ?? 0,
          active: subs['ACTIVE'] ?? 0,
          expired: subs['EXPIRED'] ?? 0,
        },
      };
    },
  };
};
