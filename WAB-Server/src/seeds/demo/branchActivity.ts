import type { Types } from 'mongoose';
import {
  DEMO_BRANCH_BOOKINGS_PER_DAY,
  DEMO_BRANCH_CLOSURE_AFTER_DAYS,
  DEMO_BRANCH_LEAVE_AFTER_DAYS,
  DEMO_BRANCH_LEAVE_LENGTH_DAYS,
  DEMO_BRANCHES,
  DEMO_CLOSURE_REASON,
  DEMO_DAYS_AHEAD,
  DEMO_LEAVE_NOTE,
  DEMO_SALONS,
  DEMO_SEED_LABEL,
  type DemoBranchSpec,
} from '../../constants/demoSeed';
import type { DayOfWeek } from '../../constants/time';
import type { ScheduleDay } from '../../models/salon.model';
import { addDays, localDateOf } from '../../utils/time';
import { buildBookings } from './bookings';
import { buildDemoBranches, demoBranchId, type DemoBranchSource } from './branches';
import type { DemoCustomer } from './customers';
import { createDemoRandom, demoId } from './random';
import { storedIds, writeDemoDataset, type DemoModel } from './writer';
import { policyOf, type DemoSalon, type DemoService, type DemoStaff } from './salons';
import {
  DEMO_COLLECTIONS,
  emptyDataset,
  type DemoContext,
  type DemoDataset,
  type DemoDoc,
} from './types';

/** Text between the salon and the branch name in notifications ("Salon - Branch", §5.17). */
const NAME_SEPARATOR = ' - ';

/**
 * Everything one extra branch gets (SRV-160): its place, services, staff, bookings in every state
 * with their money, reviews and notifications, and a staff leave. `marker` (the branch closure) is
 * written after `data`: a stored marker means the branch is complete, so a later run skips it.
 */
export interface DemoBranchPlan {
  readonly salon: string;
  readonly key: string;
  readonly branchId: Types.ObjectId;
  readonly data: DemoDataset;
  readonly marker: DemoDoc;
}

const markerId = (salon: string, key: string): Types.ObjectId =>
  demoId(`closure:branch:${salon}:${key}`);

/** The rows of `all` that belong to one branch (the branch itself, its staff and services). */
const rowsOfBranch = (all: DemoDataset, branchId: Types.ObjectId): DemoDataset => {
  const data = emptyDataset();
  const mine = (doc: DemoDoc): boolean =>
    doc._id.equals(branchId) || String(doc['branchId']) === branchId.toString();
  for (const collection of DEMO_COLLECTIONS) data[collection] = all[collection].filter(mine);
  return data;
};

interface StaffRow {
  readonly firstName: string;
  readonly lastName: string;
  readonly role: string;
  readonly staff: {
    readonly serviceIds: Types.ObjectId[];
    readonly brideQualified: boolean;
    readonly workingDays: { readonly day: DayOfWeek }[];
  };
}

/** The branch seen as a bookable salon by the booking builder. */
const asBookable = (
  ctx: Pick<DemoContext, 'catalog'>,
  spec: DemoBranchSpec,
  source: DemoBranchSource,
  rows: DemoDataset,
): DemoSalon | undefined => {
  const salonSpec = DEMO_SALONS.find((salon) => salon.key === spec.salon);
  const branch = rows.Branch[0];
  if (salonSpec === undefined || branch === undefined) return undefined;
  const services: DemoService[] = rows.SalonService.flatMap((row) => {
    const catalogServiceId = row['catalogServiceId'] as Types.ObjectId;
    const entry = ctx.catalog.find((item) => item.id.equals(catalogServiceId));
    if (entry === undefined) return [];
    return [
      {
        id: row._id,
        catalogServiceId,
        name: entry.name,
        price: row['price'] as number,
        durationMinutes: row['durationMinutes'] as number,
        brideOnly: row['brideOnly'] === true,
      },
    ];
  });
  const staff: DemoStaff[] = rows.Member.map((row) => {
    const member = row as unknown as StaffRow & DemoDoc;
    return {
      id: row._id,
      name: `${member.firstName} ${member.lastName}`,
      serviceIds: new Set(member.staff.serviceIds.map((id) => id.toString())),
      brideQualified: member.staff.brideQualified,
      days: new Set(member.staff.workingDays.map((day) => day.day)),
    };
  });
  const managers = rows.Member.filter((row) => row['role'] === 'MANAGER').map((row) => row._id);
  const name = branch['name'] as DemoBranchSpec['name'];
  return {
    spec: {
      ...salonSpec,
      key: `${spec.salon}:${spec.key}`,
      name: `${salonSpec.name}${NAME_SEPARATOR}${name.en}`,
    },
    id: source.salonId,
    gender: source.gender,
    policy: policyOf(salonSpec),
    schedule: branch['weeklySchedule'] as ScheduleDay[],
    services,
    staff,
    // The owner sees every branch; the branch manager answers for theirs (§6 branch scopes).
    responders: [demoId(`member:${spec.salon}:owner`), ...managers],
    takesBookings: true,
    branch: {
      id: branch._id,
      snapshot: { name, locationText: spec.locationText, phone: spec.phone },
    },
  };
};

/**
 * Builds the activity of every extra branch whose salon is seeded and live (see `sources`). The
 * branch structure comes from `buildDemoBranches` over the whole spec list, so staff phones stay the
 * same whichever branches a run still has to write. Each branch draws from its own random stream:
 * its rows do not change when other branches are added.
 */
export const buildDemoBranchPlans = (
  ctx: DemoContext,
  sources: ReadonlyMap<string, DemoBranchSource>,
  customers: readonly DemoCustomer[],
  specs: readonly DemoBranchSpec[] = DEMO_BRANCHES,
): DemoBranchPlan[] => {
  const structure = buildDemoBranches(ctx, sources, specs);
  const today = localDateOf(ctx.now, ctx.timeZone);
  const plans: DemoBranchPlan[] = [];
  for (const spec of specs) {
    const source = sources.get(spec.salon);
    if (source === undefined) continue;
    const branchId = demoBranchId(spec.salon, spec.key);
    const data = rowsOfBranch(structure, branchId);
    const bookable = asBookable(ctx, spec, source, data);
    if (bookable === undefined) continue;
    const random = createDemoRandom(`${DEMO_SEED_LABEL}:branch:${spec.salon}:${spec.key}`);
    buildBookings(ctx, random, data, [bookable], customers, {
      perDay: DEMO_BRANCH_BOOKINGS_PER_DAY,
      failedPayments: 0,
    });
    // A leave and a closure after the booked days, so no demo booking conflicts with them.
    const onLeave = bookable.staff[bookable.staff.length - 1];
    if (onLeave !== undefined && bookable.staff.length > 1) {
      const from = addDays(
        today,
        DEMO_DAYS_AHEAD +
          random.int(DEMO_BRANCH_LEAVE_AFTER_DAYS.min, DEMO_BRANCH_LEAVE_AFTER_DAYS.max),
      );
      data.StaffLeave.push({
        _id: demoId(`leave:branch:${spec.salon}:${spec.key}`),
        memberId: onLeave.id,
        salonId: source.salonId,
        branchId,
        from,
        to: addDays(from, DEMO_BRANCH_LEAVE_LENGTH_DAYS),
        note: DEMO_LEAVE_NOTE,
        createdAt: ctx.now,
      });
    }
    const closureDay = addDays(
      today,
      DEMO_DAYS_AHEAD +
        random.int(DEMO_BRANCH_CLOSURE_AFTER_DAYS.min, DEMO_BRANCH_CLOSURE_AFTER_DAYS.max),
    );
    plans.push({
      salon: spec.salon,
      key: spec.key,
      branchId,
      data,
      marker: {
        _id: markerId(spec.salon, spec.key),
        salonId: source.salonId,
        branchId,
        from: closureDay,
        to: closureDay,
        reason: DEMO_CLOSURE_REASON,
        createdAt: ctx.now,
      },
    });
  }
  return plans;
};

/** A data set holding only the plan's marker (written last). */
const markerDataset = (plan: DemoBranchPlan): DemoDataset => {
  const data = emptyDataset();
  data.SalonClosure.push(plan.marker);
  return data;
};

export interface DemoBranchWriteResult {
  /** `salon:branch` keys written by this run, and those an earlier run had finished. */
  readonly written: readonly string[];
  readonly skipped: readonly string[];
}

/**
 * Writes each unfinished branch (insert-only), then its marker. A branch that already has its
 * marker is skipped whole, so running the seed again (on any day) never adds overlapping bookings;
 * a branch an earlier version created without activity (SRV-148) gets its activity now.
 */
export const writeDemoBranchPlans = async (
  plans: readonly DemoBranchPlan[],
  models: ReadonlyMap<string, DemoModel>,
): Promise<DemoBranchWriteResult> => {
  const closures = models.get('SalonClosure');
  if (closures === undefined) throw new Error('SalonClosure: no model');
  const finished = await storedIds(
    closures,
    plans.map((plan) => plan.marker._id),
  );
  const written: string[] = [];
  const skipped: string[] = [];
  for (const plan of plans) {
    const name = `${plan.salon}:${plan.key}`;
    if (finished.has(plan.marker._id.toString())) {
      skipped.push(name);
      continue;
    }
    await writeDemoDataset(plan.data, models);
    await writeDemoDataset(markerDataset(plan), models);
    written.push(name);
  }
  return { written, skipped };
};
