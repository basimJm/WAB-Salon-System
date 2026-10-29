import { salonIdFilter } from '../src/domain/businessTypes/salonFilter';

const salons = {
  findMany: (filter: object): Promise<never> =>
    Promise.resolve(
      ((filter as { businessType?: string }).businessType === 'CLINIC'
        ? [{ id: 'c1' }, { id: 'c2' }]
        : [{ id: 's1' }]) as never,
    ),
};

describe('salonIdFilter (§5.19 admin filters on salon-keyed lists)', () => {
  it('adds nothing without a salon or a type', async () => {
    expect(await salonIdFilter(salons, {})).toEqual({});
  });

  it('keeps an explicit salon when no type is asked', async () => {
    expect(await salonIdFilter(salons, { salonId: 's1' })).toEqual({ salonId: 's1' });
  });

  it('turns a type into the ids of its businesses', async () => {
    expect(await salonIdFilter(salons, { businessType: 'CLINIC' })).toEqual({
      salonId: { $in: ['c1', 'c2'] },
    });
  });

  it('a salon of another type matches nothing', async () => {
    expect(await salonIdFilter(salons, { salonId: 's1', businessType: 'CLINIC' })).toEqual({
      salonId: { $in: [] },
    });
    expect(await salonIdFilter(salons, { salonId: 'c2', businessType: 'CLINIC' })).toEqual({
      salonId: { $in: ['c2'] },
    });
  });
});
