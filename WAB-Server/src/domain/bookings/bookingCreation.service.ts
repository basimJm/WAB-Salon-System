import type { BranchesRepository } from '../../repositories/branches.repository';
import type { Redis } from 'ioredis';
import { STAFF_LOCK_SEGMENT, STAFF_LOCK_TTL_MS } from '../../constants/bookings';
import { ERROR_CODES } from '../../constants/errorCodes';
import { MS_PER_MINUTE } from '../../constants/time';
import type { BookingRaw } from '../../models/booking.model';
import type { BookingDraftRaw } from '../../models/bookingDraft.model';
import type { TransactionRaw } from '../../models/transaction.model';
import type { TransactionsRepository } from '../../repositories/transactions.repository';
import type { FullRefundPort } from '../refunds/directRefunds';
import type { BookingDraftsRepository } from '../../repositories/bookingDrafts.repository';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import type { CustomersRepository } from '../../repositories/identity.repository';
import { newId, toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../utils/errors';
import { formatJod } from '../../utils/money';
import { lockKey } from '../../utils/redis/keys';
import { withLocks } from '../../utils/redis/lock';
import { withUniqueReference } from '../../utils/reference';
import { localDateOf } from '../../utils/time';
import type { AvailabilityService, BookingPlan } from '../availability/availability.service';
import type { HoldsStore } from '../availability/holds';
import { calculateAmounts } from '../pricing/pricing';
import { outstandingAtSalon } from './bookingMoney';
import type { SettingsService } from '../settings';
import type { ReferenceImageMover } from './referenceImages';

export interface BookingSummary {
  readonly id: string;
  readonly referenceNumber: string;
  readonly status: BookingRaw['status'];
  readonly paymentMethod: BookingRaw['paymentMethod'];
  readonly paymentStatus: BookingRaw['paymentStatus'];
  readonly appointmentStart: Date;
  readonly appointmentEnd: Date;
  readonly respondBy: Date;
  /** JOD decimal strings. */
  readonly money: { total: string; dueOnline: string; paidOnline: string; remaining: string };
}

export interface BookingCreationService {
  /**
   * Turns a confirmed draft into a PENDING booking (BUSINESS_DOMAIN.md §5.6 step 4). Needs the OTP
   * confirmation of the draft. A draft with an online payment needs its payment verified (SUCCEEDED,
   * the exact amount, not used before, not refunded); if the slot went away meanwhile the payment is
   * refunded in full at once and the answer is 409 `SLOT_TAKEN`.
   */
  create(input: { customerId: string; draftId: string }): Promise<BookingSummary>;
}

/** Called after a booking exists; notifications, sockets and jobs hook in here (later tasks). */
export interface BookingCreatedHook {
  created(booking: Entity<BookingRaw>): Promise<void>;
}
export const noBookingHook: BookingCreatedHook = { created: () => Promise.resolve() };

export interface BookingCreationDeps {
  readonly redis: Redis;
  readonly drafts: Pick<BookingDraftsRepository, 'findById' | 'remove'>;
  readonly bookings: BookingsRepository;
  readonly availability: Pick<AvailabilityService, 'plan'>;
  readonly holds: Pick<HoldsStore, 'release'>;
  readonly customers: Pick<CustomersRepository, 'findById'>;
  readonly transactions: Pick<
    TransactionsRepository,
    'findById' | 'claimForBooking' | 'releaseClaim'
  >;
  readonly refunds: FullRefundPort;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly hook?: BookingCreatedHook;
  readonly now?: () => Date;
  /** Reads the draft's branch for the booking's branch snapshot (§3.5). */
  readonly branches?: Pick<BranchesRepository, 'findById'>;
  /** Moves tattoo design images into their file slots once the booking exists (§5.23). */
  readonly referenceImages?: ReferenceImageMover;
}

export const toSummary = (booking: Entity<BookingRaw>): BookingSummary => ({
  id: booking.id,
  referenceNumber: booking.referenceNumber,
  status: booking.status,
  paymentMethod: booking.paymentMethod,
  paymentStatus: booking.paymentStatus,
  appointmentStart: booking.appointmentStart,
  appointmentEnd: booking.appointmentEnd,
  respondBy: booking.respondBy,
  money: {
    total: formatJod(booking.money.total),
    dueOnline: formatJod(booking.money.dueOnline),
    paidOnline: formatJod(booking.money.paidOnline),
    remaining: formatJod(outstandingAtSalon(booking)),
  },
});

const slotTaken = (): ConflictError => new ConflictError({ code: ERROR_CODES.SLOT_TAKEN });

export const createBookingCreationService = (deps: BookingCreationDeps): BookingCreationService => {
  const {
    redis,
    drafts,
    bookings,
    availability,
    holds,
    customers,
    settings,
    transactions,
    refunds,
  } = deps;
  const hook = deps.hook ?? noBookingHook;
  const now = deps.now ?? ((): Date => new Date());

  /** Re-validates every person against the current data; a slot that went away is `SLOT_TAKEN`. */
  const revalidate = async (draft: Entity<BookingDraftRaw>): Promise<BookingPlan> => {
    try {
      const plan = await availability.plan({
        salonId: draft.salonId,
        ...(draft.branchId === undefined ? {} : { branchId: draft.branchId }),
        draftId: draft.id,
        persons: draft.persons.map((p) => ({
          name: p.name,
          isBride: p.isBride,
          gender: p.gender,
          serviceIds: p.services.map((s) => s.salonServiceId),
          // "Any staff" may be re-picked; a named staff member must still be free.
          staffId: p.staffSelection === 'SPECIFIC' ? p.staffId : undefined,
          start: p.start,
        })),
      });
      return plan;
    } catch (error) {
      if (error instanceof BusinessRuleError && error.code === ERROR_CODES.SLOT_UNAVAILABLE) {
        throw slotTaken();
      }
      throw error;
    }
  };

  /** The draft's payment if it is a verified, exact, unused, not refunded one; otherwise nothing. */
  const usablePayment = async (
    draft: Entity<BookingDraftRaw>,
  ): Promise<Entity<TransactionRaw> | undefined> => {
    if (draft.transactionId === undefined) return undefined;
    const payment = await transactions.findById(draft.transactionId);
    const usable =
      payment?.status === 'SUCCEEDED' &&
      payment.customerId === draft.customerId &&
      payment.bookingDraftId === draft.id &&
      payment.amount === draft.totals.dueOnline &&
      payment.bookingId === undefined &&
      payment.refundedAt === undefined;
    return usable ? payment : undefined;
  };

  return {
    async create({ customerId, draftId }) {
      const customer = await customers.findById(customerId);
      if (customer?.status !== 'ACTIVE') {
        throw new ForbiddenError({ code: ERROR_CODES.ACCOUNT_BLOCKED });
      }
      const draft = await drafts.findById(draftId);
      if (draft === null || draft.customerId !== customerId) {
        throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      }
      const online = draft.paymentMethod !== 'PAY_ON_ARRIVAL';
      const payment = online ? await usablePayment(draft) : undefined;
      if (draft.expiresAt <= now()) {
        // A paid checkout that outlived its draft would hold the customer's money for nothing.
        if (payment !== undefined) {
          await refunds.refundPayment({ transactionId: payment.id, reason: 'NO_BOOKING' });
        }
        throw new BusinessRuleError({ code: ERROR_CODES.DRAFT_EXPIRED });
      }
      if (draft.otpVerifiedAt === undefined)
        throw new BusinessRuleError({ code: ERROR_CODES.OTP_INVALID });
      if (online && payment === undefined) {
        throw new BusinessRuleError({ code: ERROR_CODES.PAYMENT_NOT_VERIFIED });
      }
      const timeZone = await settings.get('timezone');
      const keys = draft.persons.map((p) =>
        lockKey(STAFF_LOCK_SEGMENT, p.staffId, localDateOf(p.start, timeZone)),
      );

      const bookingId = newId();
      const created = withLocks(
        redis,
        keys,
        async () => {
          const plan = await revalidate(draft);
          const persons = draft.persons.map((p, index) => ({
            ...p,
            staffId: toObjectId(plan.persons[index]?.staffId ?? p.staffId),
            services: p.services.map((s) => ({
              ...s,
              salonServiceId: toObjectId(s.salonServiceId),
              catalogServiceId: toObjectId(s.catalogServiceId),
            })),
          }));
          // The lock is held per staff member, so this check cannot race with another booking.
          for (const person of persons) {
            if (await bookings.overlapping(String(person.staffId), person.start, person.end)) {
              throw slotTaken();
            }
          }
          const amounts = calculateAmounts({
            persons: draft.persons.map((p) => ({ services: p.services })),
            paymentOption: draft.paymentMethod,
            depositPercentage: draft.policySnapshot.depositPercentage,
          });
          // The payment is reserved for this booking only once the slot is certain, and given back if
          // the booking cannot be saved, so it can never back two bookings.
          if (payment !== undefined) {
            const claimed = await transactions.claimForBooking(payment.id, bookingId);
            if (claimed === null)
              throw new BusinessRuleError({ code: ERROR_CODES.PAYMENT_NOT_VERIFIED });
          }
          const at = now();
          const starts = persons.map((p) => p.start.getTime());
          const appointmentStart = new Date(Math.min(...starts));
          const autoCancelMinutes = await settings.get('booking.autoCancelAfterStartMinutes');
          const paidOnline = payment === undefined ? 0 : amounts.dueOnline;
          const branch =
            draft.branchId === undefined
              ? null
              : ((await deps.branches?.findById(draft.branchId)) ?? null);
          return withUniqueReference((referenceNumber) =>
            bookings.create({
              _id: toObjectId(bookingId),
              referenceNumber,
              customerId: toObjectId(customerId),
              salonId: toObjectId(draft.salonId),
              ...(branch === null
                ? {}
                : {
                    branchId: toObjectId(branch.id),
                    branchSnapshot: {
                      name: branch.name,
                      ...(branch.locationText === undefined
                        ? {}
                        : { locationText: branch.locationText }),
                      ...(branch.phone === undefined ? {} : { phone: branch.phone }),
                    },
                  }),
              businessType: plan.salon.businessType,
              salonAudience: plan.salon.audience,
              persons,
              appointmentStart,
              appointmentEnd: new Date(Math.max(...persons.map((p) => p.end.getTime()))),
              hasBride: draft.persons.some((p) => p.isBride),
              status: 'PENDING',
              statusHistory: [
                { status: 'PENDING', actorType: 'CUSTOMER', actorId: toObjectId(customerId), at },
              ],
              paymentMethod: draft.paymentMethod,
              money: {
                total: amounts.total,
                dueOnline: amounts.dueOnline,
                paidOnline,
                remaining: amounts.total - paidOnline,
                refunded: 0,
              },
              paymentStatus:
                payment === undefined
                  ? 'PAY_ON_ARRIVAL'
                  : draft.paymentMethod === 'DEPOSIT'
                    ? 'DEPOSIT_PAID'
                    : 'FULLY_PAID',
              refundStatus: 'NONE',
              policySnapshot: draft.policySnapshot,
              respondBy: new Date(appointmentStart.getTime() + autoCancelMinutes * MS_PER_MINUTE),
              ratingPromptSent: false,
            } as Partial<BookingRaw>),
          ).catch(async (error: unknown) => {
            if (payment !== undefined) {
              await transactions.releaseClaim(payment.id, bookingId);
            }
            throw error;
          });
        },
        { ttlMs: STAFF_LOCK_TTL_MS, busyError: slotTaken },
      );
      const booking = await created.catch(async (error: unknown) => {
        // Paid, but the slot is gone: the customer gets everything back at once.
        if (
          payment !== undefined &&
          error instanceof ConflictError &&
          error.code === ERROR_CODES.SLOT_TAKEN
        ) {
          await refunds.refundPayment({ transactionId: payment.id, reason: 'SLOT_UNAVAILABLE' });
        }
        throw error;
      });

      await holds.release({
        draftId: draft.id,
        holds: draft.holds,
      });
      await drafts.remove(draft.id);
      await deps.referenceImages?.move(booking);
      await hook.created(booking);
      return toSummary(booking);
    },
  };
};
