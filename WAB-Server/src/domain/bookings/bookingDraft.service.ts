import type { BranchesRepository } from '../../repositories/branches.repository';
import type { MainBranches } from '../branches/mainBranch';
import type { Redis } from 'ioredis';
import { DRAFT_LOCK_SEGMENT, DRAFT_LOCK_TTL_MS } from '../../constants/bookingDrafts';
import type { Language } from '../../constants/enums';
import { ERROR_CODES } from '../../constants/errorCodes';
import { MS_PER_MINUTE } from '../../constants/time';
import type { BookingDraftRaw, DraftHold } from '../../models/bookingDraft.model';
import type { BookingPersonRaw } from '../../models/bookingPerson';
import type { SalonPolicy } from '../../models/salon.model';
import type { PAYMENT_OPTIONS } from '../../constants/salon';
import type { BookingDraftsRepository } from '../../repositories/bookingDrafts.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import type { CatalogServicesRepository } from '../../repositories/catalog.repository';
import type {
  CustomersRepository,
  MembersRepository,
} from '../../repositories/identity.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import { BusinessRuleError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { formatJod } from '../../utils/money';
import { lockKey } from '../../utils/redis/keys';
import { withLocks } from '../../utils/redis/lock';
import { localDateOf } from '../../utils/time';
import type { PhoneVerifier } from '../auth/phoneVerifier';
import type { OtpGate } from '../otp/otpGate.service';
import type { AvailabilityService, PlanPersonInput } from '../availability/availability.service';
import type { HoldsStore } from '../availability/holds';
import { calculateAmounts } from '../pricing/pricing';
import type { SettingsService } from '../settings';

type PaymentMethod = (typeof PAYMENT_OPTIONS)[number];

export interface DraftView {
  readonly id: string;
  readonly salon: { id: string; name: string };
  /** The branch of the appointment (SRV-128b), `null` before branches. */
  readonly branch: { id: string; name: string; locationText: string | null } | null;
  readonly expiresAt: Date;
  readonly paymentMethod: PaymentMethod;
  readonly persons: {
    name: string;
    isMain: boolean;
    isBride: boolean;
    services: { salonServiceId: string; name: string; price: string; durationMinutes: number }[];
    staff: { id: string; firstName: string };
    staffSelection: 'SPECIFIC' | 'ANY';
    start: Date;
    end: Date;
    subtotal: string;
  }[];
  /** JOD decimal strings. */
  readonly money: { total: string; deposit: string; dueOnline: string; remaining: string };
  /** The salon's rules as they apply to this booking (snapshotted). */
  readonly policy: SalonPolicy;
}

export interface BookingDraftService {
  /** Validates, prices and holds a booking; replaces the customer's earlier draft. */
  create(input: {
    customerId: string;
    salonId: string;
    /** The picked branch (§5.18): required when the salon has several bookable branches. */
    branchId?: string | undefined;
    paymentMethod: PaymentMethod;
    persons: readonly PlanPersonInput[];
    language: Language;
  }): Promise<DraftView>;
  get(input: { customerId: string; id: string; language: Language }): Promise<DraftView>;
  /**
   * Confirmation step (S13, purpose BOOKING_CONFIRMATION): the Firebase proof must belong to the
   * customer's own number. Needed before the booking is created.
   */
  verifyOtp(input: {
    customerId: string;
    id: string;
    idToken: string;
  }): Promise<{ otpVerifiedAt: Date }>;
  /** Frees the holds and forgets the draft (back from the summary). */
  discard(input: { customerId: string; id: string }): Promise<void>;
}

export interface BookingDraftDeps {
  /** The draft's branch for its view (SRV-128b); without it the view has no branch. */
  readonly branches?: Pick<BranchesRepository, 'findById'>;
  readonly redis: Redis;
  readonly drafts: BookingDraftsRepository;
  readonly availability: Pick<AvailabilityService, 'plan'>;
  readonly holds: Pick<HoldsStore, 'place' | 'release'>;
  readonly catalog: Pick<CatalogServicesRepository, 'findMany'>;
  readonly members: Pick<MembersRepository, 'findMany'>;
  readonly customers: Pick<CustomersRepository, 'findById'>;
  readonly salons: Pick<SalonsRepository, 'findById'>;
  readonly phones: Pick<PhoneVerifier, 'verify'>;
  readonly otpGate: Pick<OtpGate, 'reset'>;
  readonly settings: Pick<SettingsService, 'get'>;
  readonly now?: () => Date;
  /** Until the branch step exists (SRV-142) a draft is for the salon's main branch. */
  readonly mainBranches?: Pick<MainBranches, 'idOf'>;
}

const toHold = (hold: {
  staffId: unknown;
  date: string;
  start: Date;
  end: Date;
}): { staffId: string; date: string; start: Date; end: Date } => ({
  staffId: String(hold.staffId),
  date: hold.date,
  start: hold.start,
  end: hold.end,
});

export const createBookingDraftService = (deps: BookingDraftDeps): BookingDraftService => {
  const { redis, drafts, availability, holds, catalog, members, customers, salons, settings } =
    deps;
  const { phones, otpGate } = deps;
  const now = deps.now ?? ((): Date => new Date());

  const release = async (draft: Entity<BookingDraftRaw>): Promise<void> => {
    await holds.release({ draftId: draft.id, holds: draft.holds.map(toHold) });
    await drafts.remove(draft.id);
  };

  const view = async (
    draft: Entity<BookingDraftRaw>,
    salonName: string,
    language: Language,
  ): Promise<DraftView> => {
    const staff = await members.findMany({
      _id: { $in: [...new Set(draft.persons.map((p) => p.staffId))] },
    });
    const names = new Map(staff.map((m) => [m.id, m.firstName]));
    const branch =
      draft.branchId === undefined || deps.branches === undefined
        ? null
        : await deps.branches.findById(draft.branchId);
    const amounts = calculateAmounts({
      persons: draft.persons.map((p) => ({ services: p.services })),
      paymentOption: draft.paymentMethod,
      depositPercentage: draft.policySnapshot.depositPercentage,
    });
    return {
      id: draft.id,
      salon: { id: draft.salonId, name: salonName },
      branch:
        branch === null
          ? null
          : {
              id: branch.id,
              name: branch.name[language],
              locationText: branch.locationText ?? null,
            },
      expiresAt: draft.expiresAt,
      paymentMethod: draft.paymentMethod,
      persons: draft.persons.map((p) => ({
        name: p.name,
        isMain: p.isMain,
        isBride: p.isBride,
        services: p.services.map((s) => ({
          salonServiceId: s.salonServiceId,
          name: s.name[language],
          price: formatJod(s.price),
          durationMinutes: s.durationMinutes,
        })),
        staff: { id: p.staffId, firstName: names.get(p.staffId) ?? '' },
        staffSelection: p.staffSelection,
        start: p.start,
        end: p.end,
        subtotal: formatJod(p.subtotal),
      })),
      money: {
        total: formatJod(amounts.total),
        deposit: formatJod(amounts.deposit),
        dueOnline: formatJod(amounts.dueOnline),
        remaining: formatJod(amounts.remaining),
      },
      policy: draft.policySnapshot,
    };
  };

  const salonNameOf = async (salonId: string): Promise<string> =>
    (await salons.findById(salonId))?.name ?? '';

  const ownDraft = async (customerId: string, id: string): Promise<Entity<BookingDraftRaw>> => {
    const draft = await drafts.findById(id);
    if (draft === null || draft.customerId !== customerId) {
      throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    }
    return draft;
  };

  return {
    async create({ customerId, salonId, branchId, paymentMethod, persons, language }) {
      const customer = await customers.findById(customerId);
      if (customer?.status !== 'ACTIVE')
        throw new ForbiddenError({ code: ERROR_CODES.ACCOUNT_BLOCKED });
      const timeZone = await settings.get('timezone');
      const dates = persons.map((p) => localDateOf(p.start, timeZone));

      const keys = dates.map((date) => lockKey(DRAFT_LOCK_SEGMENT, salonId, date));
      return withLocks(
        redis,
        keys,
        async () => {
          const earlier = await drafts.latestOf(customerId);
          const plan = await availability.plan({
            salonId,
            branchId,
            persons,
            draftId: earlier?.id,
          });
          const policy = plan.salon.policy;
          if (policy === undefined)
            throw new BusinessRuleError({ code: ERROR_CODES.SALON_NOT_BOOKABLE });
          if (!policy.paymentOptions.includes(paymentMethod)) {
            throw new BusinessRuleError({ code: ERROR_CODES.PAYMENT_OPTION_NOT_ALLOWED });
          }
          const catalogIds = [
            ...new Set(plan.persons.flatMap((p) => p.services.map((s) => s.catalogServiceId))),
          ];
          const entries = await catalog.findMany({ _id: { $in: catalogIds } });
          const nameOf = new Map(entries.map((c) => [c.id, c.name]));

          const amounts = calculateAmounts({
            persons: plan.persons.map((p) => ({ services: p.services })),
            paymentOption: paymentMethod,
            depositPercentage: policy.depositPercentage,
          });
          const bookingPersons: BookingPersonRaw[] = plan.persons.map((p, index) => ({
            name: p.name,
            isMain: index === 0,
            isBride: p.isBride,
            services: p.services.map((s) => ({
              salonServiceId: toObjectId(s.id),
              catalogServiceId: toObjectId(s.catalogServiceId),
              name: nameOf.get(s.catalogServiceId) ?? { ar: '', en: '' },
              price: s.price,
              durationMinutes: s.durationMinutes,
            })),
            staffId: toObjectId(p.staffId),
            staffSelection: p.staffSelection,
            start: p.start,
            end: p.end,
            subtotal: amounts.persons[index]?.subtotal ?? 0,
          }));
          const holdMinutes = await settings.get('booking.paymentHoldMinutes');
          const at = now();
          const hold: DraftHold[] = plan.persons.map((p) => ({
            staffId: toObjectId(p.staffId),
            date: localDateOf(p.start, timeZone),
            start: p.start,
            end: p.end,
          }));
          // The planned branch; without branch wiring the salon's main branch, when it has one.
          const draftBranch =
            plan.branch === null
              ? await deps.mainBranches?.idOf(salonId)
              : toObjectId(plan.branch.id);
          const created = await drafts.create({
            customerId: toObjectId(customerId),
            salonId: toObjectId(salonId),
            ...(draftBranch === undefined ? {} : { branchId: draftBranch }),
            persons: bookingPersons,
            totals: { total: amounts.total, dueOnline: amounts.dueOnline },
            paymentMethod,
            policySnapshot: policy,
            holds: hold,
            expiresAt: new Date(at.getTime() + holdMinutes * MS_PER_MINUTE),
          });
          try {
            await holds.place({
              draftId: created.id,
              holds: hold.map(toHold),
              ttlMs: holdMinutes * MS_PER_MINUTE,
              nowMs: at.getTime(),
            });
          } catch (error) {
            await drafts.remove(created.id);
            throw error;
          }
          if (earlier !== null) await release(earlier);
          return view(created, plan.salon.name, language);
        },
        {
          ttlMs: DRAFT_LOCK_TTL_MS,
          busyError: () => new BusinessRuleError({ code: ERROR_CODES.SLOT_UNAVAILABLE }),
        },
      );
    },

    async get({ customerId, id, language }) {
      const draft = await ownDraft(customerId, id);
      if (draft.expiresAt <= now()) {
        await release(draft);
        throw new BusinessRuleError({ code: ERROR_CODES.DRAFT_EXPIRED });
      }
      return view(draft, await salonNameOf(draft.salonId), language);
    },

    async verifyOtp({ customerId, id, idToken }) {
      const draft = await ownDraft(customerId, id);
      if (draft.expiresAt <= now()) {
        await release(draft);
        throw new BusinessRuleError({ code: ERROR_CODES.DRAFT_EXPIRED });
      }
      const customer = await customers.findById(customerId);
      if (customer?.status !== 'ACTIVE')
        throw new ForbiddenError({ code: ERROR_CODES.ACCOUNT_BLOCKED });
      await phones.verify(customer.phone, idToken, 'BOOKING_CONFIRMATION');
      await otpGate.reset(customer.phone.e164);
      const otpVerifiedAt = now();
      await drafts.updateById(id, { otpVerifiedAt });
      return { otpVerifiedAt };
    },

    async discard({ customerId, id }) {
      const draft = await drafts.findById(id);
      if (draft === null || draft.customerId !== customerId) return;
      await release(draft);
    },
  };
};
