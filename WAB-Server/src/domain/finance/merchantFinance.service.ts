import type { QueryFilter } from 'mongoose';
import type { PayoutStatus, RefundSource, TransactionType } from '../../constants/enums';
import type { RefundStatus } from '../../constants/providers';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import type { PayoutsRepository } from '../../repositories/payouts.repository';
import type { RefundsRepository } from '../../repositories/refunds.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import type { TransactionsRepository } from '../../repositories/transactions.repository';
import type { PaginationParams } from '../../utils/pagination';
import { localDayRange } from '../../utils/time';
import type { PayoutsService, SalonBalance } from '../payouts/payouts.service';
import type { SettingsService } from '../settings';
import type {
  SubscriptionsService,
  SubscriptionView,
} from '../subscriptions/subscriptions.service';
import type { PayoutRaw } from '../../models/payout.model';
import type { RefundRaw } from '../../models/refund.model';
import type { TransactionRaw } from '../../models/transaction.model';
import type { SalonRaw } from '../../models/salon.model';

/** Civil dates (Asia/Amman), both inclusive. */
export interface DateRange {
  readonly from?: string | undefined;
  readonly to?: string | undefined;
}

export interface FinanceTransactionRow {
  readonly id: string;
  readonly bookingId: string | null;
  readonly referenceNumber: string | null;
  readonly type: TransactionType;
  readonly amount: number;
  readonly gatewayFee: number;
  /** amount − gateway fee: what the payment is worth to the salon before refunds. */
  readonly net: number;
  /** The branch the booking was made at (§5.14). */
  readonly branchId: string | null;
  readonly createdAt: Date;
}
export interface FinanceRefundRow {
  readonly id: string;
  readonly bookingId: string | null;
  readonly referenceNumber: string | null;
  readonly amount: number;
  readonly source: RefundSource;
  readonly reason: string | null;
  readonly status: RefundStatus;
  readonly branchId: string | null;
  readonly createdAt: Date;
  readonly completedAt: Date | null;
}
export interface FinancePayoutRow {
  readonly id: string;
  readonly periodFrom: Date;
  readonly periodTo: Date;
  readonly gross: number;
  readonly fees: number;
  readonly refunds: number;
  readonly adjustments: number;
  readonly net: number;
  readonly status: PayoutStatus;
  readonly transferredAt: Date | null;
  readonly transferReference: string | null;
}

export interface MerchantSubscriptionView {
  readonly status: SubscriptionView['status'];
  readonly salonState: SalonRaw['state'];
  readonly trialEndsAt: Date;
  readonly currentPeriodEnd: Date | null;
  readonly endsAt: Date;
  readonly daysRemaining: number;
  /** True while a TRIAL/ACTIVE subscription ends within `subscription.warnDaysBefore` days. */
  readonly endingSoon: boolean;
  readonly lastPaymentAt: Date | null;
}

export interface MerchantFinanceService {
  balance(salonId: string): Promise<SalonBalance>;
  /** Payments; `branchId` narrows to one branch (payouts stay salon-wide, §5.14). */
  transactions(input: {
    salonId: string;
    params: PaginationParams;
    range: DateRange;
    branchId?: string | undefined;
  }): Promise<{ items: FinanceTransactionRow[]; total: number }>;
  refunds(input: {
    salonId: string;
    params: PaginationParams;
    range: DateRange;
    branchId?: string | undefined;
  }): Promise<{ items: FinanceRefundRow[]; total: number }>;
  payouts(input: {
    salonId: string;
    params: PaginationParams;
    range: DateRange;
  }): Promise<{ items: FinancePayoutRow[]; total: number }>;
  /** Salon state and subscription (M23); the payments' bank references stay with the admin. */
  subscription(salonId: string): Promise<MerchantSubscriptionView>;
}

export const createMerchantFinanceService = (deps: {
  readonly payoutsService: Pick<PayoutsService, 'balanceOf'>;
  readonly transactions: TransactionsRepository;
  readonly refunds: RefundsRepository;
  readonly payouts: PayoutsRepository;
  readonly bookings: Pick<BookingsRepository, 'findMany'>;
  readonly subscriptions: Pick<SubscriptionsService, 'get'>;
  readonly salons: Pick<SalonsRepository, 'findById'>;
  readonly settings: Pick<SettingsService, 'get'>;
}): MerchantFinanceService => {
  const { transactions, refunds, payouts, bookings, settings } = deps;

  /** `createdAt` window from the civil dates: from the start of `from` to the end of `to`. */
  const window = async (range: DateRange): Promise<Record<string, Date> | undefined> => {
    if (range.from === undefined && range.to === undefined) return undefined;
    const timeZone = await settings.get('timezone');
    return {
      ...(range.from === undefined ? {} : { $gte: localDayRange(range.from, timeZone).start }),
      ...(range.to === undefined ? {} : { $lt: localDayRange(range.to, timeZone).end }),
    };
  };

  const references = async (
    rows: readonly { bookingId?: string }[],
  ): Promise<Map<string, string>> => {
    const ids = [...new Set(rows.flatMap((r) => (r.bookingId === undefined ? [] : [r.bookingId])))];
    if (ids.length === 0) return new Map();
    const found = await bookings.findMany({ _id: { $in: ids } });
    return new Map(found.map((b) => [b.id, b.referenceNumber]));
  };

  const scoped = <T extends object>(
    salonId: string,
    createdAt: Record<string, Date> | undefined,
    extra: object = {},
  ): QueryFilter<T> => ({ salonId, ...extra, ...(createdAt === undefined ? {} : { createdAt }) });

  return {
    balance: (salonId) => deps.payoutsService.balanceOf(salonId),

    async transactions({ salonId, params, range, branchId }) {
      // Only payments that became bookings are the salon's money.
      const page = await transactions.findPage(
        scoped<TransactionRaw>(salonId, await window(range), {
          status: 'SUCCEEDED',
          bookingId: { $exists: true },
          ...(branchId === undefined ? {} : { branchId }),
        }),
        params,
        { createdAt: -1 },
      );
      const refs = await references(page.items);
      return {
        items: page.items.map((t) => ({
          id: t.id,
          bookingId: t.bookingId ?? null,
          referenceNumber: t.bookingId === undefined ? null : (refs.get(t.bookingId) ?? null),
          type: t.type,
          amount: t.amount,
          gatewayFee: t.gatewayFee ?? 0,
          net: t.amount - (t.gatewayFee ?? 0),
          branchId: t.branchId ?? null,
          createdAt: t.createdAt,
        })),
        total: page.meta.total,
      };
    },

    async refunds({ salonId, params, range, branchId }) {
      const page = await refunds.findPage(
        scoped<RefundRaw>(salonId, await window(range), branchId === undefined ? {} : { branchId }),
        params,
        { createdAt: -1 },
      );
      const refs = await references(page.items);
      return {
        items: page.items.map((r) => ({
          id: r.id,
          bookingId: r.bookingId ?? null,
          referenceNumber: r.bookingId === undefined ? null : (refs.get(r.bookingId) ?? null),
          amount: r.amount,
          source: r.source,
          reason: r.reason ?? null,
          status: r.status,
          branchId: r.branchId ?? null,
          createdAt: r.createdAt,
          completedAt: r.completedAt ?? null,
        })),
        total: page.meta.total,
      };
    },

    async payouts({ salonId, params, range }) {
      const page = await payouts.findPage(scoped<PayoutRaw>(salonId, await window(range)), params, {
        createdAt: -1,
      });
      return {
        items: page.items.map((p) => ({
          id: p.id,
          periodFrom: p.periodFrom,
          periodTo: p.periodTo,
          gross: p.gross,
          fees: p.fees,
          refunds: p.refunds,
          adjustments: p.adjustments,
          net: p.net,
          status: p.status,
          transferredAt: p.transferredAt ?? null,
          transferReference: p.transferReference ?? null,
        })),
        total: page.meta.total,
      };
    },

    async subscription(salonId) {
      const [view, salon, warnDays] = await Promise.all([
        deps.subscriptions.get(salonId),
        deps.salons.findById(salonId),
        settings.get('subscription.warnDaysBefore'),
      ]);
      return {
        status: view.status,
        salonState: salon?.state ?? 'APPROVED_INCOMPLETE',
        trialEndsAt: view.trialEndsAt,
        currentPeriodEnd: view.currentPeriodEnd,
        endsAt: view.endsAt,
        daysRemaining: view.daysRemaining,
        endingSoon:
          view.status !== 'EXPIRED' && view.daysRemaining >= 0 && view.daysRemaining <= warnDays,
        lastPaymentAt: view.lastPayment?.paidAt ?? null,
      };
    },
  };
};
