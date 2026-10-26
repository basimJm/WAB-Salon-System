import type { Types } from 'mongoose';
import {
  DEMO_BRANCHES,
  DEMO_CANCELLATION_WINDOW_HOURS,
  DEMO_CATALOG_REQUESTS,
  DEMO_CLOSURE_REASON,
  DEMO_DEPOSIT_PERCENT,
  DEMO_FILE_PREFIX,
  DEMO_FIRST_NAMES,
  DEMO_GALLERY_IMAGES_PER_SALON,
  DEMO_IMAGE_CONTENT_TYPE,
  DEMO_IMAGE_EXTENSION,
  DEMO_LAST_NAMES,
  DEMO_LEAVE_NOTE,
  DEMO_MEMBER_PHONE_PREFIX,
  DEMO_PHONE_INDEX_DIGITS,
  DEMO_PLACEMENT_FEE,
  DEMO_SALONS,
  DEMO_SERVICE_SPECS,
  DEMO_STAFF_BIOS,
  DEMO_SUBSCRIPTION_FEE,
  DEMO_SUBSCRIPTION_METHOD,
  DEMO_SUBSCRIPTION_MONTHS_PAID,
  DEMO_SUBSCRIPTION_REFERENCE_PREFIX,
  DEMO_PLACEMENT_NOTE,
  DEMO_TRIAL_DAYS,
  DEMO_UPLOAD_MAX_BYTES,
  type DemoSalonSpec,
} from '../../constants/demoSeed';
import type { Gender, MemberRole } from '../../constants/enums';
import { FULL_PERCENT } from '../../constants/money';
import { SEED_AREAS, type LocalizedName } from '../../constants/referenceData';
import { MAIN_BRANCH_DEFAULT_NAME } from '../../constants/branches';
import { SCHEDULE_DAY_ORDER, type PAYMENT_OPTIONS } from '../../constants/salon';
import { MS_PER_DAY, type DayOfWeek } from '../../constants/time';
import { defaultPermissionsFor } from '../../domain/permissions/permissions';
import { computeBranchMissing } from '../../domain/branches/completeness';
import { salonTitle } from '../../domain/branches/salonTitle';
import { computeMissing } from '../../domain/salons/completeness';
import type { SalonPolicy, ScheduleDay } from '../../models/salon.model';
import { mulDivRound } from '../../utils/money';
import { addDays, localDateOf } from '../../utils/time';
import { demoId, type DemoRandom } from './random';
import type { DemoContext, DemoDataset } from './types';

export interface DemoService {
  readonly id: Types.ObjectId;
  readonly catalogServiceId: Types.ObjectId;
  readonly name: LocalizedName;
  readonly price: number;
  readonly durationMinutes: number;
  readonly brideOnly: boolean;
}
export interface DemoStaff {
  readonly id: Types.ObjectId;
  readonly name: string;
  readonly serviceIds: ReadonlySet<string>;
  readonly brideQualified: boolean;
  readonly days: ReadonlySet<DayOfWeek>;
}
/** What the booking builder needs to know about a salon that takes bookings. */
export interface DemoSalon {
  readonly spec: DemoSalonSpec;
  readonly id: Types.ObjectId;
  readonly gender: Gender;
  readonly policy: SalonPolicy;
  readonly schedule: readonly ScheduleDay[];
  readonly services: readonly DemoService[];
  readonly staff: readonly DemoStaff[];
  /** Members told about booking requests (owner + manager). */
  readonly responders: readonly Types.ObjectId[];
  readonly takesBookings: boolean;
  /**
   * How notifications name this place (§5.17 via `salonTitle`): "Salon - Branch" on every branch
   * of a salon with several branches (main included), the salon name alone otherwise.
   */
  readonly title: LocalizedName;
  /** Set for an extra branch: its bookings, money and reviews carry the branch (§3.5, §5.16). */
  readonly branch?: {
    readonly id: Types.ObjectId;
    readonly snapshot: {
      readonly name: LocalizedName;
      readonly locationText: string;
      readonly phone: string;
    };
  };
}

/**
 * The main branch is named after the salon's area (§5.16 migration), else the default name; the
 * salon has its main branch plus its `DEMO_BRANCHES` extras.
 */
const demoMainTitle = (spec: DemoSalonSpec): LocalizedName => {
  const count = 1 + DEMO_BRANCHES.filter((branch) => branch.salon === spec.key).length;
  const main =
    SEED_AREAS.find((area) => area.name.en === spec.place.area)?.name ?? MAIN_BRANCH_DEFAULT_NAME;
  return {
    ar: salonTitle(spec.name, main.ar, count),
    en: salonTitle(spec.name, main.en, count),
  };
};

const APPROVED_STATES = new Set(['APPROVED_INCOMPLETE', 'LIVE', 'OFFLINE']);
const STAFFED_STATES = new Set(['LIVE', 'OFFLINE']);
/** Days between application and approval, and how long ago the first salons applied. */
const REVIEW_DAYS = 3;
const OLDEST_APPLICATION_DAYS = 200;
const APPLICATION_SPACING_DAYS = 19;
const PENDING_APPLICATION_DAYS = 2;
const SUBSCRIPTION_MONTH_DAYS = 30;

const file = (...parts: string[]): string =>
  `${[DEMO_FILE_PREFIX, ...parts].join('/')}.${DEMO_IMAGE_EXTENSION}`;
const daysAgo = (now: Date, days: number): Date => new Date(now.getTime() - days * MS_PER_DAY);
const phoneOf = (dialCode: string, prefix: string, index: number): string =>
  `${dialCode}${prefix}${String(index).padStart(DEMO_PHONE_INDEX_DIGITS, '0')}`;

export const policyOf = (spec: DemoSalonSpec): SalonPolicy => ({
  cancellationWindowHours: DEMO_CANCELLATION_WINDOW_HOURS,
  paymentOptions: [...spec.paymentOptions] as (typeof PAYMENT_OPTIONS)[number][],
  ...(spec.paymentOptions.includes('DEPOSIT') ? { depositPercentage: DEMO_DEPOSIT_PERCENT } : {}),
  depositRefundableOnCustomerCancel: true,
  fullPaymentRefundOnCustomerCancel: 'MINUS_DEPOSIT',
  noShowDeposit: 'KEEP',
  noShowFullPayment: 'REFUND_MINUS_DEPOSIT',
});

const scheduleOf = (spec: DemoSalonSpec): ScheduleDay[] =>
  SCHEDULE_DAY_ORDER.map((day) => ({
    day,
    isOff: spec.offDays.includes(day),
    open: spec.open,
    close: spec.close,
  }));

interface Upload {
  readonly key: string;
  readonly purpose: string;
  readonly ownerType: 'MEMBER' | 'ADMIN' | 'CUSTOMER';
  readonly ownerId: Types.ObjectId;
  readonly salonId?: Types.ObjectId;
  readonly at: Date;
}
/** Every demo file gets a confirmed upload record, as if it came through the presign flow. */
export const addUpload = (data: DemoDataset, upload: Upload): void => {
  // Two catalog entries may share a picture (haircut for men and women): one record per file.
  if (data.Upload.some((row) => row['key'] === upload.key)) return;
  data.Upload.push({
    _id: demoId(`upload:${upload.key}`),
    key: upload.key,
    purpose: upload.purpose,
    ownerType: upload.ownerType,
    ownerId: upload.ownerId.toString(),
    ...(upload.salonId === undefined ? {} : { salonId: upload.salonId }),
    contentType: DEMO_IMAGE_CONTENT_TYPE,
    maxBytes: DEMO_UPLOAD_MAX_BYTES,
    status: 'CONFIRMED',
    expiresAt: upload.at,
    createdAt: upload.at,
  });
};

interface MemberInput {
  readonly salonId: Types.ObjectId;
  readonly label: string;
  readonly role: MemberRole;
  readonly gender: Gender;
  readonly createdAt: Date;
}

export const buildSalons = (
  ctx: DemoContext,
  random: DemoRandom,
  data: DemoDataset,
): DemoSalon[] => {
  const out: DemoSalon[] = [];
  let memberIndex = 0;
  let nameIndex = 0;
  DEMO_SALONS.forEach((spec, position) => {
    const id = demoId(`salon:${spec.key}`);
    const ownerId = demoId(`member:${spec.key}:owner`);
    const appliedDays =
      spec.state === 'APPLICATION_PENDING'
        ? PENDING_APPLICATION_DAYS
        : OLDEST_APPLICATION_DAYS - position * APPLICATION_SPACING_DAYS;
    const appliedAt = daysAgo(ctx.now, appliedDays);
    const reviewedAt = daysAgo(ctx.now, appliedDays - REVIEW_DAYS);
    const approved = APPROVED_STATES.has(spec.state);
    const staffed = STAFFED_STATES.has(spec.state);
    const licenseKey = file('salons', spec.key, 'license');

    const addMember = (input: MemberInput, staff?: Record<string, unknown>): Types.ObjectId => {
      memberIndex += 1;
      const memberId = demoId(`member:${input.label}`);
      const first =
        DEMO_FIRST_NAMES[input.gender][nameIndex % DEMO_FIRST_NAMES[input.gender].length];
      const last = DEMO_LAST_NAMES[(nameIndex * 7) % DEMO_LAST_NAMES.length];
      nameIndex += 1;
      const photoKey =
        staff === undefined ? undefined : file('members', input.label.replace(':', '-'));
      data.Member.push({
        _id: memberId,
        salonId: input.salonId,
        firstName: first,
        lastName: last,
        phone: phoneOf(ctx.dialCode, DEMO_MEMBER_PHONE_PREFIX, memberIndex),
        ...(photoKey === undefined ? {} : { photoKey }),
        role: input.role,
        permissions: defaultPermissionsFor(input.role),
        active: true,
        providesServices: staff !== undefined,
        ...(staff === undefined ? {} : { staff }),
        createdAt: input.createdAt,
      });
      if (photoKey !== undefined) {
        addUpload(data, {
          key: photoKey,
          purpose: 'MEMBER_PHOTO',
          ownerType: 'MEMBER',
          ownerId,
          salonId: id,
          at: input.createdAt,
        });
      }
      return memberId;
    };

    addMember({
      salonId: id,
      label: `${spec.key}:owner`,
      role: 'OWNER',
      gender: spec.gender,
      createdAt: appliedAt,
    });
    addUpload(data, {
      key: licenseKey,
      purpose: 'LICENSE_DOCUMENT',
      ownerType: 'MEMBER',
      ownerId,
      salonId: id,
      at: appliedAt,
    });

    // Services: the gender's specs priced by the salon's multiplier; only staffed salons offer them.
    const services: DemoService[] = staffed
      ? DEMO_SERVICE_SPECS[spec.gender].flatMap((service) => {
          const catalog = ctx.catalog.find(
            (entry) => entry.gender === spec.gender && entry.name.en === service.catalog,
          );
          if (catalog === undefined) return [];
          return [
            {
              id: demoId(`salonService:${spec.key}:${service.catalog}`),
              catalogServiceId: catalog.id,
              name: catalog.name,
              price: mulDivRound(service.price, spec.pricePercent, FULL_PERCENT),
              durationMinutes: service.durationMinutes,
              brideOnly: service.brideOnly === true,
            },
          ];
        })
      : [];
    for (const service of services) {
      data.SalonService.push({
        _id: service.id,
        salonId: id,
        catalogServiceId: service.catalogServiceId,
        price: service.price,
        durationMinutes: service.durationMinutes,
        brideOnly: service.brideOnly,
        mediaKeys: [],
        active: true,
        createdAt: reviewedAt,
      });
    }

    // Staff: a manager and employees; each covers most services, every service has someone.
    const openDays = SCHEDULE_DAY_ORDER.filter((day) => !spec.offDays.includes(day));
    const staff: DemoStaff[] = [];
    const responders: Types.ObjectId[] = [ownerId];
    for (let index = 0; index < (staffed ? spec.staff : 0); index += 1) {
      const role: MemberRole = index === 0 ? 'MANAGER' : 'EMPLOYEE';
      const regular = services.filter((service) => !service.brideOnly);
      const chosen = random.sample(regular, Math.max(1, regular.length - random.int(0, 2)));
      const guaranteed = regular[index % Math.max(1, regular.length)];
      if (guaranteed !== undefined && !chosen.includes(guaranteed)) chosen.push(guaranteed);
      const brideQualified = spec.gender === 'FEMALE' && index < 2;
      if (brideQualified) chosen.push(...services.filter((service) => service.brideOnly));
      const days = new Set(
        random.sample(openDays, Math.max(1, openDays.length - random.int(0, 1))),
      );
      const memberId = addMember(
        {
          salonId: id,
          label: `${spec.key}:staff${String(index)}`,
          role,
          gender: spec.gender,
          createdAt: reviewedAt,
        },
        {
          bio: random.pick(DEMO_STAFF_BIOS),
          yearsOfExperience: random.int(2, 15),
          serviceIds: chosen.map((service) => service.id),
          brideQualified,
          workingDays: SCHEDULE_DAY_ORDER.filter((day) => days.has(day)).map((day) => ({ day })),
          rating: { avg: 0, count: 0 },
          customersCount: 0,
        },
      );
      if (role === 'MANAGER') responders.push(memberId);
      const last = data.Member[data.Member.length - 1];
      staff.push({
        id: memberId,
        name: `${String(last?.['firstName'])} ${String(last?.['lastName'])}`,
        serviceIds: new Set(chosen.map((service) => service.id.toString())),
        brideQualified,
        days,
      });
    }

    const policy = policyOf(spec);
    const schedule = scheduleOf(spec);
    const coverKey = staffed ? file('salons', spec.key, 'cover') : undefined;
    const profileKey = staffed ? file('salons', spec.key, 'profile') : undefined;
    const location = approved
      ? {
          type: 'Point' as const,
          coordinates: [spec.place.lng, spec.place.lat] as [number, number],
        }
      : undefined;
    const mainMissing = computeBranchMissing({
      ...(location === undefined ? {} : { location }),
      phone: spec.phone,
      weeklySchedule: schedule,
      activeServices: services.length,
      qualifiedStaff: staff.length,
    });
    const missing = computeMissing({
      ...(coverKey === undefined ? {} : { coverKey }),
      ...(profileKey === undefined ? {} : { profileKey }),
      name: spec.name,
      ...(spec.description === '' ? {} : { description: spec.description }),
      ...(staffed ? { policy } : {}),
      branches: { bookable: mainMissing.length === 0, mainMissing },
    });
    for (const key of [coverKey, profileKey]) {
      if (key !== undefined) {
        addUpload(data, {
          key,
          purpose: key === coverKey ? 'SALON_COVER' : 'SALON_PROFILE',
          ownerType: 'MEMBER',
          ownerId,
          salonId: id,
          at: reviewedAt,
        });
      }
    }
    const areaId = ctx.areaIds.get(spec.place.area);
    data.Salon.push({
      _id: id,
      name: spec.name,
      gender: spec.gender,
      state: spec.state,
      ...(spec.description === '' ? {} : { description: spec.description }),
      ...(coverKey === undefined ? {} : { coverKey }),
      ...(profileKey === undefined ? {} : { profileKey }),
      ...(location === undefined ? {} : { location }),
      ...(spec.locationText === '' ? {} : { locationText: spec.locationText }),
      cityId: ctx.cityId,
      ...(areaId === undefined ? {} : { areaId }),
      phone: spec.phone,
      whatsapp: spec.whatsapp,
      weeklySchedule: schedule,
      ...(staffed ? { policy } : {}),
      application: {
        submittedAt: appliedAt,
        ...(spec.state === 'APPLICATION_PENDING' ? {} : { reviewedAt, reviewedBy: ctx.adminId }),
        ...(spec.rejectionReason === undefined ? {} : { rejectionReason: spec.rejectionReason }),
        resubmissionCount: 0,
        documentKeys: [licenseKey],
      },
      ...(spec.offlineReason === undefined
        ? {}
        : {
            offline: {
              reason: spec.offlineReason,
              at: daysAgo(ctx.now, REVIEW_DAYS),
              by: ctx.adminId,
            },
          }),
      completeness: { missing, isComplete: missing.length === 0 },
      rating: { avg: 0, count: 0 },
      searchText: [spec.name, spec.locationText].join(' ').trim(),
      createdAt: appliedAt,
    });

    if (approved) {
      const trialEndsAt = new Date(reviewedAt.getTime() + DEMO_TRIAL_DAYS * MS_PER_DAY);
      const trialOver = trialEndsAt < ctx.now;
      const status = spec.state === 'OFFLINE' ? 'EXPIRED' : trialOver ? 'ACTIVE' : 'TRIAL';
      const periodFrom = trialEndsAt;
      const periodTo = new Date(
        periodFrom.getTime() +
          SUBSCRIPTION_MONTH_DAYS * MS_PER_DAY * (trialOver ? DEMO_SUBSCRIPTION_MONTHS_PAID : 1),
      );
      data.Subscription.push({
        _id: demoId(`subscription:${spec.key}`),
        salonId: id,
        status,
        trialEndsAt,
        ...(status === 'ACTIVE'
          ? {
              currentPeriodEnd: periodTo,
              payments: [
                {
                  amount: DEMO_SUBSCRIPTION_FEE * DEMO_SUBSCRIPTION_MONTHS_PAID,
                  paidAt: periodFrom,
                  periodFrom,
                  periodTo,
                  method: DEMO_SUBSCRIPTION_METHOD,
                  reference: `${DEMO_SUBSCRIPTION_REFERENCE_PREFIX}${spec.key.toUpperCase()}`,
                  recordedBy: ctx.adminId,
                },
              ],
            }
          : { payments: [] }),
        createdAt: reviewedAt,
      });
    }

    if (staffed) {
      for (let n = 1; n <= DEMO_GALLERY_IMAGES_PER_SALON; n += 1) {
        const key = file('salons', spec.key, `gallery-${String(n)}`);
        data.GalleryItem.push({
          _id: demoId(`gallery:${spec.key}:${String(n)}`),
          salonId: id,
          type: 'IMAGE',
          key,
          order: n,
          createdAt: reviewedAt,
        });
        addUpload(data, {
          key,
          purpose: 'GALLERY_IMAGE',
          ownerType: 'MEMBER',
          ownerId,
          salonId: id,
          at: reviewedAt,
        });
      }
      const today = localDateOf(ctx.now, ctx.timeZone);
      const closureDay = addDays(today, random.int(12, 20));
      data.SalonClosure.push({
        _id: demoId(`closure:${spec.key}`),
        salonId: id,
        from: closureDay,
        to: closureDay,
        reason: DEMO_CLOSURE_REASON,
        createdAt: reviewedAt,
      });
      const onLeave = staff[staff.length - 1];
      if (onLeave !== undefined && staff.length > 1) {
        const from = addDays(today, random.int(15, 25));
        data.StaffLeave.push({
          _id: demoId(`leave:${spec.key}`),
          memberId: onLeave.id,
          salonId: id,
          from,
          to: addDays(from, 2),
          note: DEMO_LEAVE_NOTE,
          createdAt: reviewedAt,
        });
      }
    }

    out.push({
      spec,
      id,
      gender: spec.gender,
      policy,
      schedule,
      services,
      staff,
      responders,
      takesBookings: staffed,
      title: demoMainTitle(spec),
    });
  });

  // Paid "Recommended" placement for one live salon per gender, running now.
  const live = out.filter((salon) => salon.spec.state === 'LIVE');
  const featured = (['FEMALE', 'MALE'] as const).flatMap((gender) =>
    live.filter((salon) => salon.gender === gender).slice(0, 1),
  );
  for (const salon of featured) {
    data.RecommendedPlacement.push({
      _id: demoId(`placement:${salon.spec.key}`),
      salonId: salon.id,
      gender: salon.gender,
      startAt: daysAgo(ctx.now, REVIEW_DAYS * 2),
      endAt: new Date(ctx.now.getTime() + SUBSCRIPTION_MONTH_DAYS * MS_PER_DAY),
      order: 1,
      amountPaid: DEMO_PLACEMENT_FEE,
      note: DEMO_PLACEMENT_NOTE,
      createdAt: daysAgo(ctx.now, REVIEW_DAYS * 2),
    });
  }

  for (const [index, request] of DEMO_CATALOG_REQUESTS.entries()) {
    const salonId = demoId(`salon:${request.salon}`);
    const at = daysAgo(ctx.now, index + 1);
    data.CatalogRequest.push({
      _id: demoId(`catalogRequest:${request.salon}:${request.name}`),
      salonId,
      requestedByMemberId: demoId(`member:${request.salon}:owner`),
      name: request.name,
      description: request.description,
      status: request.status,
      ...(request.adminNote === undefined ? {} : { adminNote: request.adminNote }),
      ...(request.status === 'PENDING' ? {} : { decidedBy: ctx.adminId, decidedAt: at }),
      createdAt: at,
    });
  }
  return out;
};
