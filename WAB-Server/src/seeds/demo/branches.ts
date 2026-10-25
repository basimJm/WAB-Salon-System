import type { Types } from 'mongoose';
import {
  DEMO_BRANCH_MEMBER_PHONE_PREFIX,
  DEMO_BRANCHES,
  DEMO_FIRST_NAMES,
  DEMO_LAST_NAMES,
  DEMO_PHONE_INDEX_DIGITS,
  DEMO_STAFF_BIOS,
  type DemoBranchSpec,
} from '../../constants/demoSeed';
import type { Gender } from '../../constants/enums';
import { SCHEDULE_DAY_ORDER } from '../../constants/salon';
import { computeBranchMissing } from '../../domain/branches/completeness';
import { defaultPermissionsFor } from '../../domain/permissions/permissions';
import { mulDivRound } from '../../utils/money';
import { demoId } from './random';
import { emptyDataset, type DemoContext, type DemoDataset } from './types';

const FULL_PERCENT = 100;
/** Branch staff names start further down the name lists than the salon staff. */
const NAME_OFFSET = 5;
const LAST_NAME_STEP = 3;
const BRANCH_STAFF_YEARS = 4;

/** What the builder needs to know about a demo salon that gets extra branches. */
export interface DemoBranchSource {
  readonly salonId: Types.ObjectId;
  readonly gender: Gender;
  /** Active services of the main branch; each extra branch offers them at its own prices. */
  readonly services: readonly {
    readonly catalogServiceId: Types.ObjectId;
    readonly price: number;
    readonly durationMinutes: number;
    readonly brideOnly: boolean;
  }[];
}

const phoneOf = (dialCode: string, index: number): string =>
  `${dialCode}${DEMO_BRANCH_MEMBER_PHONE_PREFIX}${String(index).padStart(DEMO_PHONE_INDEX_DIGITS, '0')}`;

/**
 * Extra branches for the demo (§3.3a, §5.16): each with its own place, hours, services and prices,
 * and its own staff (a branch manager and employees). Ids are deterministic, so running the seed
 * again adds nothing. Salons that are not in `sources` (not seeded, or not live) are skipped.
 */
export const buildDemoBranches = (
  ctx: Pick<DemoContext, 'now' | 'dialCode' | 'cityId' | 'areaIds'>,
  sources: ReadonlyMap<string, DemoBranchSource>,
  specs: readonly DemoBranchSpec[] = DEMO_BRANCHES,
): DemoDataset => {
  const data = emptyDataset();
  let memberIndex = 0;
  for (const spec of specs) {
    const source = sources.get(spec.salon);
    if (source === undefined || source.services.length === 0) continue;
    const branchId = demoId(`branch:${spec.salon}:${spec.key}`);
    const schedule = SCHEDULE_DAY_ORDER.map((day) => ({
      day,
      isOff: spec.offDays.includes(day),
      open: spec.open,
      close: spec.close,
    }));
    const services = source.services.map((service) => ({
      id: demoId(`salonService:${spec.salon}:${spec.key}:${service.catalogServiceId.toString()}`),
      ...service,
    }));
    for (const service of services) {
      data.SalonService.push({
        _id: service.id,
        salonId: source.salonId,
        branchId,
        catalogServiceId: service.catalogServiceId,
        price: mulDivRound(service.price, spec.pricePercent, FULL_PERCENT),
        durationMinutes: service.durationMinutes,
        brideOnly: service.brideOnly,
        mediaKeys: [],
        active: true,
        createdAt: ctx.now,
      });
    }
    const workingDays = SCHEDULE_DAY_ORDER.filter((day) => !spec.offDays.includes(day)).map(
      (day) => ({ day }),
    );
    for (let index = 0; index < spec.staff; index += 1) {
      memberIndex += 1;
      const role = index === 0 ? 'MANAGER' : 'EMPLOYEE';
      // The manager of a women's branch also does brides, so bride bookings work there.
      const brideQualified = source.gender === 'FEMALE' && index === 0;
      const names = DEMO_FIRST_NAMES[source.gender];
      data.Member.push({
        _id: demoId(`member:${spec.salon}:${spec.key}:staff${String(index)}`),
        salonId: source.salonId,
        branchId,
        firstName: names[(memberIndex + NAME_OFFSET) % names.length],
        lastName: DEMO_LAST_NAMES[(memberIndex * LAST_NAME_STEP) % DEMO_LAST_NAMES.length],
        phone: phoneOf(ctx.dialCode, memberIndex),
        role,
        permissions: defaultPermissionsFor(role),
        active: true,
        providesServices: true,
        staff: {
          bio: DEMO_STAFF_BIOS[memberIndex % DEMO_STAFF_BIOS.length],
          yearsOfExperience: BRANCH_STAFF_YEARS + index,
          serviceIds: services
            .filter((service) => brideQualified || !service.brideOnly)
            .map((service) => service.id),
          brideQualified,
          workingDays,
          rating: { avg: 0, count: 0 },
          customersCount: 0,
        },
        createdAt: ctx.now,
      });
    }
    const location = { type: 'Point' as const, coordinates: [spec.place.lng, spec.place.lat] };
    const missing = computeBranchMissing({
      location,
      phone: spec.phone,
      weeklySchedule: schedule,
      activeServices: services.length,
      qualifiedStaff: spec.staff,
    });
    const areaId = ctx.areaIds.get(spec.place.area);
    data.Branch.push({
      _id: branchId,
      salonId: source.salonId,
      name: spec.name,
      isMain: false,
      status: 'ACTIVE',
      location,
      locationText: spec.locationText,
      cityId: ctx.cityId,
      ...(areaId === undefined ? {} : { areaId }),
      phone: spec.phone,
      weeklySchedule: schedule,
      completeness: { missing, isComplete: missing.length === 0 },
      createdAt: ctx.now,
    });
  }
  return data;
};
