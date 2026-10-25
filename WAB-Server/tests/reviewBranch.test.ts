import { Types } from 'mongoose';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { createAdminReviewsService } from '../src/domain/reviews/adminReviews.service';
import { createReviewsService } from '../src/domain/reviews/reviews.service';
import { BranchesRepository } from '../src/repositories/branches.repository';
import { CustomersRepository, MembersRepository } from '../src/repositories/identity.repository';
import { ReviewsRepository } from '../src/repositories/reviews.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const m = {
  reviews: createFakeModel(),
  salons: createFakeModel(),
  members: createFakeModel(),
  customers: createFakeModel(),
  branches: createFakeModel(),
};
const repos = {
  reviews: new ReviewsRepository(m.reviews.model as never),
  salons: new SalonsRepository(m.salons.model as never),
  members: new MembersRepository(m.members.model as never),
  customers: new CustomersRepository(m.customers.model as never),
  branches: new BranchesRepository(m.branches.model as never),
};
const service = createReviewsService({
  ...repos,
  settings: { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) },
});
const admin = createAdminReviewsService({
  ...repos,
  audit: createAuditWriter({ append: (data) => Promise.resolve({ id: 'a', ...data } as never) }),
  logger: createLogger({ level: 'silent' }),
});
const actor = { adminId: new Types.ObjectId().toHexString(), ip: '127.0.0.1', userAgent: 'jest' };

const salonId = new Types.ObjectId();
const otherSalon = new Types.ObjectId();
const abdoun = new Types.ObjectId();
const mecca = new Types.ObjectId();
const closed = new Types.ObjectId();
const foreign = new Types.ObjectId();
const staffId = new Types.ObjectId();
const customerId = new Types.ObjectId();
const s = (id: Types.ObjectId): string => id.toHexString();

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  m.salons.docs.push({
    _id: salonId,
    name: 'Hifa',
    gender: 'FEMALE',
    state: 'LIVE',
    completeness: { missing: [], isComplete: true },
    rating: { avg: 0, count: 0 },
  });
  const branch = (
    _id: Types.ObjectId,
    en: string,
    status = 'ACTIVE',
    salon = salonId,
  ): Record<string, unknown> => ({
    _id,
    salonId: salon,
    isMain: _id === abdoun,
    status,
    name: { ar: `فرع ${en}`, en },
    weeklySchedule: [],
    completeness: { missing: [], isComplete: true },
  });
  m.branches.docs.push(
    branch(abdoun, 'Abdoun'),
    branch(mecca, 'Mecca Street'),
    branch(closed, 'Old', 'CLOSED'),
    branch(foreign, 'Elsewhere', 'ACTIVE', otherSalon),
  );
  m.members.docs.push({
    _id: staffId,
    salonId,
    branchId: mecca,
    firstName: 'Lina',
    lastName: 'X',
    role: 'EMPLOYEE',
    active: true,
    providesServices: true,
    staff: { rating: { avg: 0, count: 0 }, serviceIds: [], workingDays: [] },
  });
  m.customers.docs.push({
    _id: customerId,
    firstName: 'Rana',
    lastName: 'K',
    status: 'ACTIVE',
    phone: '+962790000001',
  });
});

const branchOfReview = (id: string): unknown =>
  m.reviews.docs.find((r) => String(r['_id']) === id)?.['branchId'];

describe('submitting a review with a branch (§5.11)', () => {
  it('keeps the branch the customer picked', async () => {
    const { id } = await service.submit({
      customerId: s(customerId),
      salonId: s(salonId),
      branchId: s(abdoun),
      rating: 5,
    });
    expect(String(branchOfReview(id))).toBe(s(abdoun));
  });

  it('a staff review takes the staff member’s branch; a different pick is refused', async () => {
    const { id } = await service.submit({
      customerId: s(customerId),
      salonId: s(salonId),
      staffId: s(staffId),
      rating: 4,
    });
    expect(String(branchOfReview(id))).toBe(s(mecca));
    await expect(
      service.submit({
        customerId: s(customerId),
        salonId: s(salonId),
        staffId: s(staffId),
        branchId: s(abdoun),
        rating: 4,
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_NOT_FOUND' });
  });

  it('refuses a closed branch or another salon’s branch; no pick means no label', async () => {
    for (const branchId of [closed, foreign]) {
      await expect(
        service.submit({
          customerId: s(customerId),
          salonId: s(salonId),
          branchId: s(branchId),
          rating: 3,
        }),
      ).rejects.toMatchObject({ code: 'BRANCH_NOT_FOUND' });
    }
    const { id } = await service.submit({
      customerId: s(customerId),
      salonId: s(salonId),
      rating: 3,
    });
    expect(branchOfReview(id)).toBeUndefined();
  });
});

describe('labels, rating and the admin filter', () => {
  const approved = (branchId: Types.ObjectId | undefined, rating: number, at: string): string => {
    const _id = new Types.ObjectId();
    m.reviews.docs.push({
      _id,
      target: 'SALON',
      salonId,
      ...(branchId === undefined ? {} : { branchId }),
      customerId,
      rating,
      status: 'PENDING',
      createdAt: new Date(at),
    });
    return s(_id);
  };

  it('the salon rating averages the approved reviews of ALL branches; each keeps its label', async () => {
    const a = approved(abdoun, 5, '2026-10-01T00:00:00Z');
    const b = approved(mecca, 2, '2026-10-02T00:00:00Z');
    const c = approved(undefined, 4, '2026-10-03T00:00:00Z');
    for (const id of [a, b, c]) await admin.decide({ id, decision: 'approve', actor });
    const salon = m.salons.docs.find((x) => x['_id'] === salonId);
    expect(salon?.['rating']).toEqual({ avg: 3.7, count: 3 });

    const list = await service.list({
      salonId: s(salonId),
      params: { page: 1, pageSize: 10 },
      language: 'en',
    });
    expect(list.summary).toEqual({ avg: 3.7, count: 3 });
    expect(list.items.map((r) => r.branch?.name ?? null)).toEqual([null, 'Mecca Street', 'Abdoun']);
    const latest = await service.latest({ salonId: s(salonId), limit: 1, language: 'ar' });
    expect(latest[0]?.branch).toBeNull();
    const second = await service.latest({ salonId: s(salonId), limit: 2, language: 'ar' });
    expect(second[1]?.branch).toEqual({ id: s(mecca), name: 'فرع Mecca Street' });
  });

  it('the admin list filters by branch and shows the label in both languages', async () => {
    approved(abdoun, 5, '2026-10-01T00:00:00Z');
    approved(mecca, 2, '2026-10-02T00:00:00Z');
    const { items, total } = await admin.list({
      branchId: s(mecca),
      params: { page: 1, pageSize: 10 },
    });
    expect(total).toBe(1);
    expect(items[0]?.branch).toEqual({
      id: s(mecca),
      name: { ar: 'فرع Mecca Street', en: 'Mecca Street' },
    });
  });
});
