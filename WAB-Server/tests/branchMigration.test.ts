import { MAIN_BRANCH_DEFAULT_NAME } from '../src/constants/branches';
import type { LocalizedName } from '../src/constants/referenceData';
import { SCHEDULE_DAY_ORDER } from '../src/constants/salon';
import { computeBranchMissing } from '../src/domain/branches/completeness';
import {
  BRANCH_BACKFILL_TARGETS,
  migrateSalonsToBranches,
  type BranchBackfillTarget,
  type BranchMigrationStore,
  type MainBranchInput,
  type SalonForMigration,
} from '../src/domain/branches/migration';
import { SalonServiceModel } from '../src/models/salonService.model';

const open = SCHEDULE_DAY_ORDER.map((day) => ({
  day,
  isOff: day === 'FRI',
  open: '10:00',
  close: '20:00',
}));
const closed = SCHEDULE_DAY_ORDER.map((day) => ({
  day,
  isOff: true,
  open: '09:00',
  close: '18:00',
}));
const ABDOUN: LocalizedName = { ar: 'عبدون', en: 'Abdoun' };

interface MemoryState {
  salons: SalonForMigration[];
  linked: Map<string, string>;
  branches: (MainBranchInput & { id: string })[];
  /** Rows without a branch, per salon and collection. */
  pending: Map<string, number>;
  snapshots: { salonId: string; name: LocalizedName; locationText?: string; phone?: string }[];
  facts: { services: number; staff: number };
}

const memoryStore = (state: MemoryState): BranchMigrationStore => ({
  salonsWithoutBranch: () => Promise.resolve(state.salons.filter((s) => !state.linked.has(s.id))),
  existingMainBranch: (salonId) => {
    const found = state.branches.find((b) => b.salonId === salonId);
    return Promise.resolve(found === undefined ? null : { id: found.id, name: found.name });
  },
  areaName: (areaId) => Promise.resolve(areaId === 'abdoun' ? ABDOUN : null),
  activeServiceCount: () => Promise.resolve(state.facts.services),
  qualifiedStaffCount: () => Promise.resolve(state.facts.staff),
  insertMainBranch: (input) => {
    const id = `branch-${String(state.branches.length + 1)}`;
    state.branches.push({ ...input, id });
    return Promise.resolve(id);
  },
  linkSalon: (salonId, branchId) => {
    state.linked.set(salonId, branchId);
    return Promise.resolve();
  },
  countWithoutBranch: (target, salonId) =>
    Promise.resolve(state.pending.get(`${salonId}:${target}`) ?? 0),
  backfill: (target, salonId, branch) => {
    const key = `${salonId}:${target}`;
    const count = state.pending.get(key) ?? 0;
    state.pending.set(key, 0);
    if (target === 'bookings' && count > 0)
      state.snapshots.push({
        salonId,
        name: branch.name,
        ...(branch.locationText === undefined ? {} : { locationText: branch.locationText }),
        ...(branch.phone === undefined ? {} : { phone: branch.phone }),
      });
    return Promise.resolve(count);
  },
});

const salon = (
  id: string,
  extra: { [K in keyof SalonForMigration]?: SalonForMigration[K] | undefined } = {},
): SalonForMigration => {
  const merged: Record<string, unknown> = {
    id,
    location: { type: 'Point', coordinates: [35.88, 31.95] },
    locationText: 'Abdoun, Cairo Street',
    areaId: 'abdoun',
    cityId: 'amman',
    phone: '+96265921001',
    weeklySchedule: open,
    ...extra,
  };
  // Drop explicit `undefined`s: a missing field means the salon never had it.
  return Object.fromEntries(
    Object.entries(merged).filter(([, v]) => v !== undefined),
  ) as unknown as SalonForMigration;
};

const fresh = (salons: SalonForMigration[], rowsPerTarget = 2): MemoryState => ({
  salons,
  linked: new Map(),
  branches: [],
  pending: new Map(
    salons.flatMap((s) =>
      BRANCH_BACKFILL_TARGETS.map((t): [string, number] => [`${s.id}:${t}`, rowsPerTarget]),
    ),
  ),
  snapshots: [],
  facts: { services: 3, staff: 2 },
});

describe('computeBranchMissing (§5.2, branch level)', () => {
  const complete = {
    location: { coordinates: [35.9, 31.9] },
    phone: '+96265921001',
    weeklySchedule: open,
    activeServices: 1,
    qualifiedStaff: 1,
  };

  it('is empty for a branch customers can book', () => {
    expect(computeBranchMissing(complete)).toEqual([]);
  });

  it('lists every missing item in the domain order', () => {
    expect(
      computeBranchMissing({ weeklySchedule: closed, activeServices: 0, qualifiedStaff: 0 }),
    ).toEqual(['LOCATION', 'PHONE', 'WORKING_HOURS', 'SERVICE', 'STAFF']);
    expect(computeBranchMissing({ ...complete, phone: '  ' })).toEqual(['PHONE']);
    expect(computeBranchMissing({ ...complete, location: { coordinates: [35.9] } })).toEqual([
      'LOCATION',
    ]);
  });
});

describe('migrateSalonsToBranches (§5.16)', () => {
  it('builds one main branch per salon from its address, contacts and hours, named after its area', async () => {
    const state = fresh([
      salon('s1'),
      salon('s2', { areaId: undefined, phone: undefined, weeklySchedule: closed }),
    ]);
    const report = await migrateSalonsToBranches({ store: memoryStore(state), dryRun: false });
    expect(report).toMatchObject({ dryRun: false, salons: 2, branchesCreated: 2 });
    const [first, second] = state.branches;
    expect(first).toMatchObject({
      salonId: 's1',
      name: ABDOUN,
      locationText: 'Abdoun, Cairo Street',
      phone: '+96265921001',
      completeness: { missing: [], isComplete: true },
    });
    expect(second).toMatchObject({
      salonId: 's2',
      name: MAIN_BRANCH_DEFAULT_NAME,
      completeness: { missing: ['PHONE', 'WORKING_HOURS'], isComplete: false },
    });
    expect(second?.phone).toBeUndefined();
  });

  it('points every row of the salon at its branch and gives bookings the branch snapshot', async () => {
    const state = fresh([salon('s1')], 3);
    const report = await migrateSalonsToBranches({ store: memoryStore(state), dryRun: false });
    for (const target of BRANCH_BACKFILL_TARGETS) expect(report.rows[target]).toBe(3);
    expect([...state.pending.values()].every((n) => n === 0)).toBe(true);
    expect(state.snapshots).toEqual([
      { salonId: 's1', name: ABDOUN, locationText: 'Abdoun, Cairo Street', phone: '+96265921001' },
    ]);
    expect(state.linked.get('s1')).toBe('branch-1');
  });

  it('is idempotent: a second run finds nothing to do', async () => {
    const state = fresh([salon('s1')]);
    await migrateSalonsToBranches({ store: memoryStore(state), dryRun: false });
    const again = await migrateSalonsToBranches({ store: memoryStore(state), dryRun: false });
    expect(again).toMatchObject({ salons: 0, branchesCreated: 0 });
    expect(state.branches).toHaveLength(1);
  });

  it('resumes a stopped run: reuses the branch it already created and finishes the backfill', async () => {
    const state = fresh([salon('s1')]);
    state.branches.push({
      id: 'branch-old',
      salonId: 's1',
      name: ABDOUN,
      weeklySchedule: open,
      completeness: { missing: [], isComplete: true },
    });
    const report = await migrateSalonsToBranches({ store: memoryStore(state), dryRun: false });
    expect(report.branchesCreated).toBe(0);
    expect(state.linked.get('s1')).toBe('branch-old');
    expect(report.rows.bookings).toBe(2);
  });

  it('dry run reports what would change and writes nothing', async () => {
    const state = fresh([salon('s1'), salon('s2')], 4);
    const report = await migrateSalonsToBranches({ store: memoryStore(state), dryRun: true });
    expect(report).toMatchObject({ dryRun: true, salons: 2, branchesCreated: 0 });
    const expected = Object.fromEntries(
      BRANCH_BACKFILL_TARGETS.map((t): [BranchBackfillTarget, number] => [t, 8]),
    );
    expect(report.rows).toEqual(expected);
    expect(state.branches).toHaveLength(0);
    expect(state.linked.size).toBe(0);
  });

  it('keeps one service per catalog entry per branch, ignoring rows not migrated yet', () => {
    expect(SalonServiceModel.schema.indexes()).toContainEqual([
      { branchId: 1, catalogServiceId: 1 },
      expect.objectContaining({
        unique: true,
        partialFilterExpression: { branchId: { $exists: true } },
      }),
    ]);
  });
});
