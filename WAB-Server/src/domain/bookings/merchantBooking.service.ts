import type { Redis } from 'ioredis';
import { STAFF_LOCK_SEGMENT, STAFF_LOCK_TTL_MS } from '../../constants/bookings';
import type { Gender } from '../../constants/enums';
import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import { MS_PER_MINUTE } from '../../constants/time';
import type { BookingRaw } from '../../models/booking.model';
import type { BranchesRepository } from '../../repositories/branches.repository';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import type { CatalogServicesRepository } from '../../repositories/catalog.repository';
import type {
  CustomersRepository,
  MembersRepository,
} from '../../repositories/identity.repository';
import { newId, toObjectId } from '../../utils/database/ids';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  ValidationError,
} from '../../utils/errors';
import { lockKey } from '../../utils/redis/keys';
import { withLocks } from '../../utils/redis/lock';
import { withUniqueReference } from '../../utils/reference';
import { localDateOf } from '../../utils/time';
import type { PhoneInput, PhoneVerifier, ResolvedPhone } from '../auth/phoneVerifier';
import type { CustomerRaw } from '../../models/customer.model';
import type { Entity } from '../../utils/database/plain';
import type { AvailabilityService } from '../availability/availability.service';
import { calculateAmounts } from '../pricing/pricing';
import type { SettingsService } from '../settings';
import type { BookingClaims } from '../auth/customerAuth.service';
import type { Logger } from '../../utils/logger';
import type { UploadVerifier } from '../uploads/uploads.service';
import type { BookingCreatedHook } from './bookingCreation.service';
import { toSummary, type BookingSummary } from './bookingCreation.service';
import type { DraftPersonInput } from './bookingDraft.service';
import { toBookingPersons } from './bookingPersons';
import {
  assertReferenceImages,
  referenceImageOwner,
  type ReferenceImageMover,
} from './referenceImages';

/** The payment of a business-made booking: always at the business (§5.20). */
const MERCHANT_PAYMENT = 'PAY_ON_ARRIVAL';
const CUSTOMER_FIELD = 'body.customer';

/** What the business sees for a phone number before booking (§5.20). */
export interface CustomerLookup {
  readonly registered: boolean;
  /** Only for a registered, active customer; never the last name or other details. */
  readonly firstName: string | null;
  readonly gender: Gender | null;
}

export interface MerchantBookingInput {
  readonly salonId: string;
  readonly member: { readonly id: string; readonly branchId?: string | undefined };
  /** Required when the business has several bookable branches; a branch member books their own. */
  readonly branchId?: string | undefined;
  readonly customer: {
    readonly phone: PhoneInput;
    /** Required when the number has no WAB account; ignored otherwise (the account's name). */
    readonly name?: string | undefined;
    readonly gender?: Gender | undefined;
  };
  readonly persons: readonly DraftPersonInput[];
}

export interface MerchantBookingService {
  lookup(input: { phone: PhoneInput }): Promise<CustomerLookup>;
  /** Creates an APPROVED, pay-at-the-business booking (§5.20) under the same locks as the app. */
  create(input: MerchantBookingInput): Promise<BookingSummary & { customerRegistered: boolean }>;
}

export interface MerchantBookingDeps {
  readonly redis: Redis;
  readonly bookings: Pick<BookingsRepository, 'create' | 'overlapping'>;
  readonly availability: Pick<AvailabilityService, 'plan'>;
  readonly catalog: Pick<CatalogServicesRepository, 'findMany'>;
  readonly customers: Pick<CustomersRepository, 'findByPhone'>;
  readonly members: Pick<MembersRepository, 'findById'>;
  readonly phones: Pick<PhoneVerifier, 'resolve'>;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly branches?: Pick<BranchesRepository, 'findById'>;
  readonly uploads?: Pick<UploadVerifier, 'assertConfirmed'>;
  readonly referenceImages?: ReferenceImageMover;
  /** Customer notification ("Booked by"), socket update and reminder jobs. */
  readonly hook?: BookingCreatedHook;
  readonly now?: () => Date;
}

const missing = (field: string): ValidationError =>
  new ValidationError({
    details: [
      {
        field,
        code: ERROR_CODES.VALIDATION_ERROR,
        messageKey: errorMessageKey(ERROR_CODES.VALIDATION_ERROR),
      },
    ],
  });

const slotTaken = (): ConflictError => new ConflictError({ code: ERROR_CODES.SLOT_TAKEN });

export const createMerchantBookingService = (deps: MerchantBookingDeps): MerchantBookingService => {
  const now = deps.now ?? ((): Date => new Date());

  /** The account behind a number (§5.20); a blocked or deleted account cannot be booked. */
  const accountOf = async (
    phone: PhoneInput,
    field: string,
  ): Promise<{ resolved: ResolvedPhone; account: Entity<CustomerRaw> | null }> => {
    const resolved = await deps.phones.resolve(phone, field);
    const account = await deps.customers.findByPhone(resolved.e164);
    return { resolved, account };
  };

  return {
    async lookup({ phone }) {
      const { account } = await accountOf(phone, 'query');
      if (account === null || account.status !== 'ACTIVE') {
        return { registered: account !== null, firstName: null, gender: null };
      }
      return { registered: true, firstName: account.firstName, gender: account.gender };
    },

    async create({ salonId, member, branchId, customer, persons }) {
      const { resolved, account } = await accountOf(customer.phone, `${CUSTOMER_FIELD}.phone`);
      if (account !== null && account.status !== 'ACTIVE') {
        throw new ForbiddenError({ code: ERROR_CODES.ACCOUNT_BLOCKED });
      }
      const name =
        account === null ? customer.name : `${account.firstName} ${account.lastName}`.trim();
      const gender = account === null ? customer.gender : account.gender;
      if (name === undefined || name === '') throw missing(`${CUSTOMER_FIELD}.name`);
      if (gender === undefined) throw missing(`${CUSTOMER_FIELD}.gender`);

      // A branch member books for their own branch only (§6 branch scope).
      if (member.branchId !== undefined && branchId !== undefined && branchId !== member.branchId) {
        throw new ForbiddenError({ code: ERROR_CODES.BRANCH_SCOPE_DENIED });
      }
      const branch = member.branchId ?? branchId;
      // The main person is the customer unless the member says otherwise (e.g. a bride's mother).
      const planned = persons.map((p, index) =>
        index === 0 && p.gender === undefined ? { ...p, gender } : p,
      );
      const plan = await deps.availability.plan({
        salonId,
        ...(branch === undefined ? {} : { branchId: branch }),
        persons: planned,
      });
      const policy = plan.salon.policy;
      if (policy === undefined)
        throw new BusinessRuleError({ code: ERROR_CODES.SALON_NOT_BOOKABLE });
      const owner = referenceImageOwner({ source: 'MERCHANT', salonId });
      await assertReferenceImages({
        businessType: plan.salon.businessType,
        keys: persons.map((p) => p.referenceImageKey),
        verifier: deps.uploads,
        accept: owner.accept,
      });
      const amounts = calculateAmounts({
        persons: plan.persons.map((p) => ({ services: p.services })),
        paymentOption: MERCHANT_PAYMENT,
        depositPercentage: policy.depositPercentage,
      });
      const bookingPersons = await toBookingPersons({
        plan,
        subtotals: amounts.persons.map((p) => p.subtotal),
        references: persons.map((p) => p.referenceImageKey),
        catalog: deps.catalog,
      });
      const creator = await deps.members.findById(member.id);
      const timeZone = await deps.settings.get('timezone');
      const autoCancelMinutes = await deps.settings.get('booking.autoCancelAfterStartMinutes');
      const keys = bookingPersons.map((p) =>
        lockKey(STAFF_LOCK_SEGMENT, String(p.staffId), localDateOf(p.start, timeZone)),
      );
      const bookingId = newId();
      const branchRow =
        plan.branch ??
        (branch === undefined ? null : ((await deps.branches?.findById(branch)) ?? null));
      const booking = await withLocks(
        deps.redis,
        keys,
        async () => {
          // Same guarantee as the app (§5.6 step 4): no double booking under the staff lock.
          for (const person of bookingPersons) {
            if (await deps.bookings.overlapping(String(person.staffId), person.start, person.end)) {
              throw slotTaken();
            }
          }
          const at = now();
          const appointmentStart = new Date(
            Math.min(...bookingPersons.map((p) => p.start.getTime())),
          );
          return withUniqueReference((referenceNumber) =>
            deps.bookings.create({
              _id: toObjectId(bookingId),
              referenceNumber,
              ...(account === null ? {} : { customerId: toObjectId(account.id) }),
              source: 'MERCHANT',
              createdBy: {
                memberId: toObjectId(member.id),
                name: `${creator?.firstName ?? ''} ${creator?.lastName ?? ''}`.trim(),
              },
              customerContact: {
                name,
                phone: {
                  dialCode: resolved.dialCode,
                  number: resolved.number,
                  e164: resolved.e164,
                },
                gender,
              },
              salonId: toObjectId(salonId),
              ...(branchRow === null
                ? {}
                : {
                    branchId: toObjectId(branchRow.id),
                    branchSnapshot: {
                      name: branchRow.name,
                      ...(branchRow.locationText === undefined
                        ? {}
                        : { locationText: branchRow.locationText }),
                      ...(branchRow.phone === undefined ? {} : { phone: branchRow.phone }),
                    },
                  }),
              businessType: plan.salon.businessType,
              salonAudience: plan.salon.audience,
              persons: bookingPersons,
              appointmentStart,
              appointmentEnd: new Date(Math.max(...bookingPersons.map((p) => p.end.getTime()))),
              hasBride: bookingPersons.some((p) => p.isBride),
              status: 'APPROVED',
              statusHistory: [
                { status: 'APPROVED', actorType: 'MEMBER', actorId: toObjectId(member.id), at },
              ],
              paymentMethod: MERCHANT_PAYMENT,
              money: {
                total: amounts.total,
                dueOnline: 0,
                paidOnline: 0,
                remaining: amounts.total,
                refunded: 0,
              },
              paymentStatus: MERCHANT_PAYMENT,
              refundStatus: 'NONE',
              policySnapshot: policy,
              respondBy: new Date(appointmentStart.getTime() + autoCancelMinutes * MS_PER_MINUTE),
              ratingPromptSent: false,
              closeReminders: { count: 0 },
            } as Partial<BookingRaw>),
          );
        },
        { ttlMs: STAFF_LOCK_TTL_MS, busyError: slotTaken },
      );
      await deps.referenceImages?.move(booking);
      await deps.hook?.created(booking);
      return { ...toSummary(booking), customerRegistered: account !== null };
    },
  };
};

/** The claim of business-made bookings (§5.20); never fails the sign-up or the phone change. */
export const createBookingClaims = (deps: {
  readonly bookings: Pick<BookingsRepository, 'claimByPhone'>;
  readonly logger: Logger;
}): BookingClaims => ({
  async claim(e164, customerId) {
    try {
      const claimed = await deps.bookings.claimByPhone(e164, customerId);
      if (claimed > 0) deps.logger.info({ customerId, claimed }, 'business-made bookings claimed');
    } catch (error) {
      deps.logger.error({ err: error, customerId }, 'business-made bookings not claimed');
    }
  },
});
