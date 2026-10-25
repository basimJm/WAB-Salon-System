import { MAIN_BRANCH_DEFAULT_NAME } from '../../constants/branches';
import type { LocalizedName } from '../../constants/referenceData';
import type { ScheduleDay } from '../../models/salon.model';
import type { Logger } from '../../utils/logger';
import { computeBranchMissing } from './completeness';

/**
 * Collections whose rows gain the `branchId` of their salon's main branch (§5.16 migration).
 * Members: everyone but the owner (the owner covers every branch).
 */
export const BRANCH_BACKFILL_TARGETS = [
  'salonServices',
  'salonClosures',
  'members',
  'staffLeaves',
  'bookingDrafts',
  'bookings',
  'transactions',
  'refunds',
  'ledgerEntries',
  'reviews',
] as const;
export type BranchBackfillTarget = (typeof BRANCH_BACKFILL_TARGETS)[number];

/** The salon facts a main branch is built from (the fields that move to branches). */
export interface SalonForMigration {
  readonly id: string;
  readonly location?: { type: 'Point'; coordinates: [number, number] };
  readonly locationText?: string;
  readonly cityId?: string;
  readonly areaId?: string;
  readonly phone?: string;
  readonly whatsapp?: string;
  readonly weeklySchedule: readonly ScheduleDay[];
}

export interface MainBranchInput {
  readonly salonId: string;
  readonly name: LocalizedName;
  readonly location?: SalonForMigration['location'];
  readonly locationText?: string;
  readonly cityId?: string;
  readonly areaId?: string;
  readonly phone?: string;
  readonly whatsapp?: string;
  readonly weeklySchedule: readonly ScheduleDay[];
  readonly completeness: { missing: string[]; isComplete: boolean };
}

/** What the migration reads and writes; the Mongo store implements it, tests use memory. */
export interface BranchMigrationStore {
  /** Salons that have no main branch linked yet. */
  salonsWithoutBranch(): Promise<SalonForMigration[]>;
  /** A main branch left by an earlier run that stopped before linking it to the salon. */
  existingMainBranch(salonId: string): Promise<{ id: string; name: LocalizedName } | null>;
  areaName(areaId: string): Promise<LocalizedName | null>;
  activeServiceCount(salonId: string): Promise<number>;
  qualifiedStaffCount(salonId: string): Promise<number>;
  insertMainBranch(input: MainBranchInput): Promise<string>;
  linkSalon(salonId: string, branchId: string): Promise<void>;
  /** Rows of the salon in `target` that still have no branch. */
  countWithoutBranch(target: BranchBackfillTarget, salonId: string): Promise<number>;
  /** Sets the branch on those rows (bookings also get the branch snapshot); returns how many. */
  backfill(
    target: BranchBackfillTarget,
    salonId: string,
    branch: { id: string; name: LocalizedName; locationText?: string; phone?: string },
  ): Promise<number>;
}

export interface BranchMigrationReport {
  readonly dryRun: boolean;
  readonly salons: number;
  readonly branchesCreated: number;
  /** Per collection: rows that got (or, in a dry run, would get) a branch. */
  readonly rows: Readonly<Record<BranchBackfillTarget, number>>;
}

const zeroRows = (): Record<BranchBackfillTarget, number> =>
  Object.fromEntries(BRANCH_BACKFILL_TARGETS.map((target) => [target, 0])) as Record<
    BranchBackfillTarget,
    number
  >;

/**
 * Gives every salon without branches one main branch built from its current address, contacts,
 * hours, services and staff, and points all its rows at it. Idempotent: linked salons are skipped
 * and only rows without a branch are touched, so a stopped run can simply be started again.
 */
export const migrateSalonsToBranches = async (deps: {
  store: BranchMigrationStore;
  dryRun: boolean;
  logger?: Logger;
}): Promise<BranchMigrationReport> => {
  const { store, dryRun, logger } = deps;
  const salons = await store.salonsWithoutBranch();
  const rows = zeroRows();
  let branchesCreated = 0;
  for (const salon of salons) {
    if (dryRun) {
      for (const target of BRANCH_BACKFILL_TARGETS) {
        rows[target] += await store.countWithoutBranch(target, salon.id);
      }
      continue;
    }
    let branch = await store.existingMainBranch(salon.id);
    if (branch === null) {
      const area = salon.areaId === undefined ? null : await store.areaName(salon.areaId);
      const name = area ?? MAIN_BRANCH_DEFAULT_NAME;
      const [activeServices, qualifiedStaff] = await Promise.all([
        store.activeServiceCount(salon.id),
        store.qualifiedStaffCount(salon.id),
      ]);
      const missing = computeBranchMissing({ ...salon, activeServices, qualifiedStaff });
      const id = await store.insertMainBranch({
        salonId: salon.id,
        name,
        ...(salon.location === undefined ? {} : { location: salon.location }),
        ...(salon.locationText === undefined ? {} : { locationText: salon.locationText }),
        ...(salon.cityId === undefined ? {} : { cityId: salon.cityId }),
        ...(salon.areaId === undefined ? {} : { areaId: salon.areaId }),
        ...(salon.phone === undefined ? {} : { phone: salon.phone }),
        ...(salon.whatsapp === undefined ? {} : { whatsapp: salon.whatsapp }),
        weeklySchedule: salon.weeklySchedule,
        completeness: { missing, isComplete: missing.length === 0 },
      });
      branch = { id, name };
      branchesCreated += 1;
    }
    const facts = {
      id: branch.id,
      name: branch.name,
      ...(salon.locationText === undefined ? {} : { locationText: salon.locationText }),
      ...(salon.phone === undefined ? {} : { phone: salon.phone }),
    };
    for (const target of BRANCH_BACKFILL_TARGETS) {
      rows[target] += await store.backfill(target, salon.id, facts);
    }
    // Linked last: a salon without `mainBranchId` is picked up again by the next run.
    await store.linkSalon(salon.id, branch.id);
    logger?.info({ salonId: salon.id, branchId: branch.id }, 'salon migrated to its main branch');
  }
  return { dryRun, salons: salons.length, branchesCreated, rows };
};
