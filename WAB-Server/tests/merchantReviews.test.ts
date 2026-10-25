import { Types } from 'mongoose';
import { createMerchantReviewsService } from '../src/domain/reviews/merchantReviews.service';
import { BranchesRepository } from '../src/repositories/branches.repository';
import { CustomersRepository, MembersRepository } from '../src/repositories/identity.repository';
import { ReviewsRepository } from '../src/repositories/reviews.repository';
import { merchantReviewsQuery } from '../src/modules/merchant/reviews/reviews.validation';
import { createFakeModel } from './helpers/fakeModel';

const m = {
  reviews: createFakeModel(),
  members: createFakeModel(),
  customers: createFakeModel(),
  branches: createFakeModel(),
};
const service = createMerchantReviewsService({
  reviews: new ReviewsRepository(m.reviews.model as never),
  members: new MembersRepository(m.members.model as never),
  customers: new CustomersRepository(m.customers.model as never),
  branches: new BranchesRepository(m.branches.model as never),
});
const salonId = new Types.ObjectId();
const abdoun = new Types.ObjectId();
const mecca = new Types.ObjectId();
const lina = new Types.ObjectId();
const rana = new Types.ObjectId();
const customer = new Types.ObjectId();
const s = (id: Types.ObjectId): string => id.toHexString();
const owner = { id: 'owner' };
const meccaManager = { id: 'manager', branchId: s(mecca) };
const page = { page: 1, pageSize: 10 };

const review = (over: Record<string, unknown>, at = '2026-10-01T00:00:00Z'): void => {
  m.reviews.docs.push({
    _id: new Types.ObjectId(),
    salonId,
    target: 'SALON',
    customerId: customer,
    rating: 5,
    status: 'APPROVED',
    createdAt: new Date(at),
    ...over,
  });
};

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  m.customers.docs.push({ _id: customer, firstName: 'Rana', lastName: 'Secret', status: 'ACTIVE' });
  m.branches.docs.push(
    { _id: abdoun, salonId, name: { ar: 'عبدون', en: 'Abdoun' }, isMain: true, status: 'ACTIVE' },
    {
      _id: mecca,
      salonId,
      name: { ar: 'مكة', en: 'Mecca Street' },
      isMain: false,
      status: 'ACTIVE',
    },
  );
  m.members.docs.push(
    { _id: lina, salonId, branchId: abdoun, firstName: 'Lina', lastName: 'X', role: 'EMPLOYEE' },
    { _id: rana, salonId, branchId: mecca, firstName: 'Rana', lastName: 'Y', role: 'EMPLOYEE' },
  );
  review({ branchId: abdoun, rating: 5 }, '2026-10-01T00:00:00Z');
  review({ branchId: mecca, rating: 2, comment: 'Late' }, '2026-10-02T00:00:00Z');
  review({ branchId: mecca, rating: 4 }, '2026-10-03T00:00:00Z');
  review({ branchId: mecca, rating: 1, status: 'PENDING' });
  review({ target: 'STAFF', staffId: lina, branchId: abdoun, rating: 3 });
});

describe('merchant reviews (M20, SRV-131)', () => {
  it('the owner sees every published salon review with average, count and distribution', async () => {
    const result = await service.list({
      salonId: s(salonId),
      member: owner,
      target: 'SALON',
      params: page,
      language: 'en',
    });
    expect(result.items.map((r) => [r.rating, r.branch?.name])).toEqual([
      [4, 'Mecca Street'],
      [2, 'Mecca Street'],
      [5, 'Abdoun'],
    ]);
    expect(result.items[1]).toMatchObject({ customerName: 'Rana', comment: 'Late', staff: null });
    expect(result.summary).toEqual({
      avg: 3.7,
      count: 3,
      distribution: { '1': 0, '2': 1, '3': 0, '4': 1, '5': 1 },
    });
  });

  it('the owner can narrow to one branch; a branch member always sees their own', async () => {
    const filtered = await service.list({
      salonId: s(salonId),
      member: owner,
      target: 'SALON',
      branchId: s(abdoun),
      params: page,
      language: 'ar',
    });
    expect(filtered.items.map((r) => r.branch?.name)).toEqual(['عبدون']);
    const manager = await service.list({
      salonId: s(salonId),
      member: meccaManager,
      target: 'SALON',
      params: page,
      language: 'en',
    });
    expect(manager.summary).toMatchObject({ avg: 3, count: 2 });
    await expect(
      service.list({
        salonId: s(salonId),
        member: meccaManager,
        target: 'SALON',
        branchId: s(abdoun),
        params: page,
        language: 'en',
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_SCOPE_DENIED' });
  });

  it('staff reviews: one member, of the caller’s branch only; unknown staff is 404', async () => {
    const own = await service.list({
      salonId: s(salonId),
      member: owner,
      target: 'STAFF',
      staffId: s(lina),
      params: page,
      language: 'en',
    });
    expect(own.items.map((r) => r.staff)).toEqual([{ id: s(lina), firstName: 'Lina' }]);
    expect(own.summary.count).toBe(1);
    await expect(
      service.list({
        salonId: s(salonId),
        member: meccaManager,
        target: 'STAFF',
        staffId: s(lina),
        params: page,
        language: 'en',
      }),
    ).rejects.toMatchObject({ code: 'BRANCH_SCOPE_DENIED' });
    const empty = await service.list({
      salonId: s(salonId),
      member: meccaManager,
      target: 'STAFF',
      staffId: s(rana),
      params: page,
      language: 'en',
    });
    expect(empty.summary).toEqual({
      avg: 0,
      count: 0,
      distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
    });
    await expect(
      service.list({
        salonId: s(salonId),
        member: owner,
        target: 'STAFF',
        staffId: s(new Types.ObjectId()),
        params: page,
        language: 'en',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('the query needs memberId for staff reviews and defaults to salon reviews', () => {
    expect(merchantReviewsQuery.safeParse({ target: 'STAFF' }).success).toBe(false);
    const parsed = merchantReviewsQuery.parse({});
    expect(parsed.target).toBe('SALON');
  });
});
