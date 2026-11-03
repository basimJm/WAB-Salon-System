import type { Types } from 'mongoose';
import {
  DEMO_BUSINESSES,
  DEMO_BUSINESS_APPLIED_DAYS,
  DEMO_BUSINESS_APPROVED_DAYS,
  DEMO_BUSINESS_MEMBER_PHONE_PREFIX,
  DEMO_BUSINESS_PERCENT,
  DEMO_BUSINESS_STAFF_YEARS,
  type DemoBusinessSpec,
} from '../../constants/demoBusinessTypes';
import {
  DEMO_CANCELLATION_WINDOW_HOURS,
  DEMO_FIRST_NAMES,
  DEMO_LAST_NAMES,
  DEMO_PHONE_INDEX_DIGITS,
  DEMO_PLACEMENT_FEE,
  DEMO_PLACEMENT_NOTE,
  DEMO_STAFF_BIOS,
  DEMO_TRIAL_DAYS,
} from '../../constants/demoSeed';
import { GENDERS, type Gender, type MemberRole } from '../../constants/enums';
import { SCHEDULE_DAY_ORDER } from '../../constants/salon';
import { MS_PER_DAY } from '../../constants/time';
import { computeBranchMissing } from '../../domain/branches/completeness';
import { brideAllowed, catalogFits } from '../../domain/businessTypes/rules';
import { defaultPermissionsFor } from '../../domain/permissions/permissions';
import { computeMissing } from '../../domain/salons/completeness';
import type { SalonPolicy } from '../../models/salon.model';
import { mulDivRound } from '../../utils/money';
import { demoId } from './random';
import { addUpload, demoFileKey } from './salons';
import { emptyDataset, type DemoContext, type DemoDataset } from './types';

const daysAgo = (now: Date, days: number): Date => new Date(now.getTime() - days * MS_PER_DAY);
const phoneOf = (dialCode: string, index: number): string =>
  `${dialCode}${DEMO_BUSINESS_MEMBER_PHONE_PREFIX}${String(index).padStart(DEMO_PHONE_INDEX_DIGITS, '0')}`;
/** Recommended placements run from approval for this many days. */
const PLACEMENT_DAYS = 60;

const POLICY: SalonPolicy = {
  cancellationWindowHours: DEMO_CANCELLATION_WINDOW_HOURS,
  paymentOptions: ['PAY_ON_ARRIVAL'],
  depositRefundableOnCustomerCancel: true,
  fullPaymentRefundOnCustomerCancel: 'MINUS_DEPOSIT',
  noShowDeposit: 'KEEP',
  noShowFullPayment: 'REFUND_MINUS_DEPOSIT',
};

/** The deterministic id of a demo business (the same on every run). */
export const demoBusinessId = (key: string): Types.ObjectId => demoId(`business:${key}`);

/** Staff gender: a business for everyone has men and women on the team; others follow it. */
const staffGender = (spec: DemoBusinessSpec, index: number): Gender =>
  spec.audience === 'BOTH'
    ? (GENDERS[index % GENDERS.length] as Gender)
    : spec.audience === 'MALE'
      ? 'MALE'
      : 'FEMALE';

/**
 * Clinics and a salon for men and women (§5.19), LIVE and complete: owner, branches with their own
 * hours, services (only catalog entries that fit the business, §3.2), prices and staff, a TRIAL
 * subscription and, when the spec says so, a running Recommended placement of its type. Ids are
 * deterministic so the writer adds nothing on a second run. Catalog entries that are missing are
 * skipped (the demo catalog seed creates them first).
 */
export const buildDemoBusinesses = (
  ctx: Pick<DemoContext, 'now' | 'dialCode' | 'cityId' | 'areaIds' | 'catalog' | 'adminId'>,
  specs: readonly DemoBusinessSpec[] = DEMO_BUSINESSES,
): DemoDataset => {
  const data = emptyDataset();
  let memberIndex = 0;
  for (const spec of specs) {
    const salonId = demoBusinessId(spec.key);
    const ownerId = demoId(`member:business:${spec.key}:owner`);
    const appliedAt = daysAgo(ctx.now, DEMO_BUSINESS_APPLIED_DAYS);
    const approvedAt = daysAgo(ctx.now, DEMO_BUSINESS_APPROVED_DAYS);
    const kind = { businessType: spec.businessType, audience: spec.audience };
    const catalog = spec.services.flatMap((service) => {
      const entry = ctx.catalog.find(
        (c) =>
          c.businessType === spec.businessType &&
          c.audience === service.audience &&
          c.name.en === service.catalog &&
          catalogFits(c, kind),
      );
      return entry === undefined ? [] : [{ service, entry }];
    });
    const member = (
      label: string,
      role: MemberRole,
      gender: Gender,
      extra: Record<string, unknown>,
    ): Types.ObjectId => {
      memberIndex += 1;
      const id = demoId(`member:business:${spec.key}:${label}`);
      const names = DEMO_FIRST_NAMES[gender];
      // Labels hold ':' (branch:staffN), which no storage key may contain (SRV-179).
      const photoKey = demoFileKey('members', `business-${spec.key}-${label.replaceAll(':', '-')}`);
      data.Member.push({
        _id: id,
        salonId,
        firstName: names[memberIndex % names.length],
        lastName: DEMO_LAST_NAMES[memberIndex % DEMO_LAST_NAMES.length],
        phone: phoneOf(ctx.dialCode, memberIndex),
        photoKey,
        role,
        permissions: defaultPermissionsFor(role),
        active: true,
        ...extra,
        createdAt: appliedAt,
      });
      addUpload(data, {
        key: photoKey,
        purpose: 'MEMBER_PHOTO',
        ownerType: 'MEMBER',
        ownerId,
        salonId,
        at: appliedAt,
      });
      return id;
    };
    member('owner', 'OWNER', staffGender(spec, 0), { providesServices: false });

    const branchIds: Types.ObjectId[] = [];
    let mainMissing: ReturnType<typeof computeBranchMissing> = [];
    spec.branches.forEach((branch, branchIndex) => {
      const branchId = demoId(`branch:business:${spec.key}:${branch.key}`);
      branchIds.push(branchId);
      const schedule = SCHEDULE_DAY_ORDER.map((day) => ({
        day,
        isOff: branch.offDays.includes(day),
        open: branch.open,
        close: branch.close,
      }));
      const services = catalog.map(({ service, entry }) => ({
        id: demoId(`salonService:business:${spec.key}:${branch.key}:${entry.id.toString()}`),
        catalogServiceId: entry.id,
        price: mulDivRound(service.price, branch.pricePercent, DEMO_BUSINESS_PERCENT),
        durationMinutes: service.durationMinutes,
      }));
      for (const service of services) {
        data.SalonService.push({
          _id: service.id,
          salonId,
          branchId,
          catalogServiceId: service.catalogServiceId,
          price: service.price,
          durationMinutes: service.durationMinutes,
          brideOnly: false,
          mediaKeys: [],
          active: true,
          createdAt: approvedAt,
        });
      }
      const workingDays = SCHEDULE_DAY_ORDER.filter((day) => !branch.offDays.includes(day)).map(
        (day) => ({ day }),
      );
      for (let index = 0; index < spec.staffPerBranch; index += 1) {
        const role: MemberRole = index === 0 ? 'MANAGER' : 'EMPLOYEE';
        member(`${branch.key}:staff${String(index)}`, role, staffGender(spec, index), {
          branchId,
          providesServices: true,
          staff: {
            bio: DEMO_STAFF_BIOS[memberIndex % DEMO_STAFF_BIOS.length],
            yearsOfExperience: DEMO_BUSINESS_STAFF_YEARS + index,
            serviceIds: services.map((service) => service.id),
            // Bride-qualified staff exist only where brides may book (§5.19).
            brideQualified: brideAllowed(kind) && index === 0,
            workingDays,
            rating: { avg: 0, count: 0 },
            customersCount: 0,
          },
        });
      }
      const location = {
        type: 'Point' as const,
        coordinates: [branch.place.lng, branch.place.lat],
      };
      const missing = computeBranchMissing({
        location,
        phone: branch.phone,
        weeklySchedule: schedule,
        activeServices: services.length,
        qualifiedStaff: spec.staffPerBranch,
      });
      if (branchIndex === 0) mainMissing = missing;
      const areaId = ctx.areaIds.get(branch.place.area);
      data.Branch.push({
        _id: branchId,
        salonId,
        name: branch.name,
        isMain: branchIndex === 0,
        status: 'ACTIVE',
        location,
        locationText: branch.locationText,
        cityId: ctx.cityId,
        ...(areaId === undefined ? {} : { areaId }),
        phone: branch.phone,
        weeklySchedule: schedule,
        completeness: { missing, isComplete: missing.length === 0 },
        createdAt: approvedAt,
      });
    });

    const coverKey = demoFileKey('salons', spec.key, 'cover');
    const profileKey = demoFileKey('salons', spec.key, 'profile');
    const licenseKey = demoFileKey('salons', spec.key, 'license');
    const missing = computeMissing({
      coverKey,
      profileKey,
      name: spec.name,
      description: spec.description,
      policy: POLICY,
      branches: { bookable: mainMissing.length === 0, mainMissing },
    });
    for (const [key, purpose] of [
      [coverKey, 'SALON_COVER'],
      [profileKey, 'SALON_PROFILE'],
      [licenseKey, 'LICENSE_DOCUMENT'],
    ] as const) {
      addUpload(data, { key, purpose, ownerType: 'MEMBER', ownerId, salonId, at: appliedAt });
    }
    const main = spec.branches[0];
    data.Salon.push({
      _id: salonId,
      name: spec.name,
      businessType: spec.businessType,
      audience: spec.audience,
      state: missing.length === 0 ? 'LIVE' : 'APPROVED_INCOMPLETE',
      description: spec.description,
      coverKey,
      profileKey,
      ...(branchIds[0] === undefined ? {} : { mainBranchId: branchIds[0] }),
      branchCount: branchIds.length,
      policy: POLICY,
      application: {
        submittedAt: appliedAt,
        reviewedAt: approvedAt,
        reviewedBy: ctx.adminId,
        resubmissionCount: 0,
        documentKeys: [licenseKey],
      },
      completeness: { missing, isComplete: missing.length === 0 },
      rating: { avg: 0, count: 0 },
      searchText: [spec.name, ...spec.branches.map((b) => `${b.name.en} ${b.name.ar}`)]
        .join(' ')
        .trim(),
      ...(main === undefined ? {} : { cityId: ctx.cityId }),
      createdAt: appliedAt,
    });
    data.Subscription.push({
      _id: demoId(`subscription:business:${spec.key}`),
      salonId,
      status: 'TRIAL',
      trialEndsAt: new Date(approvedAt.getTime() + DEMO_TRIAL_DAYS * MS_PER_DAY),
      payments: [],
      createdAt: approvedAt,
    });
    if (spec.recommended) {
      data.RecommendedPlacement.push({
        _id: demoId(`placement:business:${spec.key}`),
        salonId,
        businessType: spec.businessType,
        audience: spec.audience,
        startAt: approvedAt,
        endAt: new Date(approvedAt.getTime() + PLACEMENT_DAYS * MS_PER_DAY),
        order: 1,
        amountPaid: DEMO_PLACEMENT_FEE,
        note: DEMO_PLACEMENT_NOTE,
        createdAt: approvedAt,
      });
    }
  }
  return data;
};
