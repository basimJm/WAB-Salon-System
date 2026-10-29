import { Types } from 'mongoose';
import { BRANCH_NAME_MAX_LENGTH, MAIN_BRANCH_DEFAULT_NAME } from '../src/constants/branches';
import { SCHEDULE_DAY_ORDER } from '../src/constants/salon';
import { BookingModel } from '../src/models/booking.model';
import { BranchModel } from '../src/models/branch.model';
import { ALL_MODELS } from '../src/models';
import { MemberModel } from '../src/models/member.model';
import { SalonModel } from '../src/models/salon.model';
import { SalonServiceModel } from '../src/models/salonService.model';
import { BranchesRepository } from '../src/repositories/branches.repository';
import { createFakeModel } from './helpers/fakeModel';

const salonId = new Types.ObjectId();
const schedule = SCHEDULE_DAY_ORDER.map((day) => ({
  day,
  isOff: day === 'FRI',
  open: '10:00',
  close: '20:00',
}));
const branch = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  salonId,
  name: { ar: 'شارع مكة', en: 'Mecca Street' },
  isMain: true,
  status: 'ACTIVE',
  location: { type: 'Point', coordinates: [35.86, 31.95] },
  locationText: 'Mecca Street, Amman',
  phone: '+96265921001',
  weeklySchedule: schedule,
  ...extra,
});
/** Field paths Mongoose rejects (`validate()` runs the same rules the database write would). */
const validationErrors = async (doc: { validate(): Promise<void> }): Promise<string[]> => {
  try {
    await doc.validate();
    return [];
  } catch (error) {
    return Object.keys((error as { errors?: Record<string, unknown> }).errors ?? {});
  }
};
const errorsOf = (doc: Record<string, unknown>): Promise<string[]> =>
  validationErrors(new BranchModel(doc));

describe('branch model (§3.3a)', () => {
  it('accepts a complete branch and is registered for index creation', async () => {
    expect(await errorsOf(branch())).toEqual([]);
    expect(ALL_MODELS).toContain(BranchModel);
  });

  it('defaults to ACTIVE, not main, every day off and an empty completeness', () => {
    const doc = new BranchModel({ salonId, name: { ar: 'فرع', en: 'Branch' } });
    expect(doc.status).toBe('ACTIVE');
    expect(doc.isMain).toBe(false);
    expect(doc.weeklySchedule).toHaveLength(7);
    expect(doc.weeklySchedule.every((day) => day.isOff)).toBe(true);
    expect(doc.completeness.isComplete).toBe(false);
  });

  it.each([
    ['a name in one language only', { name: { ar: 'فرع' } }, 'name.en'],
    [
      'a name that is too long',
      { name: { ar: 'ف', en: 'x'.repeat(BRANCH_NAME_MAX_LENGTH + 1) } },
      'name.en',
    ],
    ['an unknown status', { status: 'DELETED' }, 'status'],
    ['a phone that is not E.164', { phone: '0791234567' }, 'phone'],
    ['six schedule days', { weeklySchedule: schedule.slice(1) }, 'weeklySchedule'],
    [
      'an offline actor that is not admin or member',
      { offline: { reason: 'x', at: new Date(), actorType: 'SYSTEM', by: new Types.ObjectId() } },
      'offline.actorType',
    ],
  ])('refuses %s', async (_label, change, path) => {
    expect(await errorsOf(branch(change))).toContain(path);
  });

  it('allows one main branch per salon only (partial unique index)', () => {
    const indexes = BranchModel.schema.indexes();
    expect(indexes).toContainEqual([
      { salonId: 1 },
      expect.objectContaining({ unique: true, partialFilterExpression: { isMain: true } }),
    ]);
    expect(indexes).toContainEqual([{ location: '2dsphere' }, expect.anything()]);
  });

  it('has a default name for migrated salons without an area', () => {
    expect(MAIN_BRANCH_DEFAULT_NAME).toEqual({ ar: 'الفرع الرئيسي', en: 'Main branch' });
  });
});

describe('branch fields on existing collections', () => {
  it('salons count their branches (0 until the first one exists)', () => {
    const salon = new SalonModel({
      name: 'Lamar',
      businessType: 'SALON',
      audience: 'FEMALE',
      state: 'LIVE',
      application: { submittedAt: new Date() },
      searchText: 'Lamar',
    });
    expect(salon.branchCount).toBe(0);
    expect(salon.mainBranchId).toBeUndefined();
  });

  it('branchId stays optional until the migration backfills it', async () => {
    const service = new SalonServiceModel({
      salonId,
      catalogServiceId: new Types.ObjectId(),
      price: 5000,
      durationMinutes: 30,
    });
    expect(await validationErrors(service)).toEqual([]);
    const withBranch = new SalonServiceModel({
      salonId,
      branchId: new Types.ObjectId(),
      catalogServiceId: new Types.ObjectId(),
      price: 5000,
      durationMinutes: 30,
    });
    expect(await validationErrors(withBranch)).toEqual([]);
    expect(SalonServiceModel.schema.indexes()).toContainEqual([
      { branchId: 1, active: 1 },
      expect.anything(),
    ]);
    expect(MemberModel.schema.path('branchId')).toBeDefined();
  });

  it('a booking keeps a snapshot of its branch, and the snapshot needs both names', async () => {
    const snapshot = BookingModel.schema.path('branchSnapshot');
    expect(snapshot).toBeDefined();
    const booking = new BookingModel({ branchSnapshot: { name: { ar: 'شارع مكة' } } });
    expect(await validationErrors(booking)).toContain('branchSnapshot.name.en');
  });
});

describe('BranchesRepository', () => {
  const setup = (): {
    repo: BranchesRepository;
    ids: {
      main: Types.ObjectId;
      second: Types.ObjectId;
      closed: Types.ObjectId;
      other: Types.ObjectId;
    };
  } => {
    const fake = createFakeModel();
    const ids = {
      main: new Types.ObjectId(),
      second: new Types.ObjectId(),
      closed: new Types.ObjectId(),
      other: new Types.ObjectId(),
    };
    fake.docs.push(
      { _id: ids.second, ...branch({ isMain: false, name: { ar: 'ب', en: 'Zarqa Road' } }) },
      { _id: ids.main, ...branch() },
      {
        _id: ids.closed,
        ...branch({ isMain: false, status: 'CLOSED', name: { ar: 'ج', en: 'Old' } }),
      },
      { _id: ids.other, ...branch({ salonId: new Types.ObjectId() }) },
    );
    return { repo: new BranchesRepository(fake.model as never), ids };
  };

  it('lists a salon’s open branches, main first; closed ones only when asked', async () => {
    const { repo, ids } = setup();
    expect((await repo.forSalon(salonId.toString())).map((b) => b.id)).toEqual([
      ids.main.toString(),
      ids.second.toString(),
    ]);
    expect(await repo.forSalon(salonId.toString(), { includeClosed: true })).toHaveLength(3);
  });

  it('counts open branches and finds the main one', async () => {
    const { repo, ids } = setup();
    expect(await repo.countOpen(salonId.toString())).toBe(2);
    expect((await repo.main(salonId.toString()))?.id).toBe(ids.main.toString());
  });

  it('finds a branch only inside its own salon', async () => {
    const { repo, ids } = setup();
    expect((await repo.findInSalon(salonId.toString(), ids.second.toString()))?.id).toBe(
      ids.second.toString(),
    );
    expect(await repo.findInSalon(salonId.toString(), ids.other.toString())).toBeNull();
    expect(await repo.findInSalon('not-an-id', ids.second.toString())).toBeNull();
  });
});
