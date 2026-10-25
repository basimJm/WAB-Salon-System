import { Types } from 'mongoose';
import { DEMO_BRANCHES } from '../src/constants/demoSeed';
import { ALL_MODELS } from '../src/models';
import { toDemoModel } from '../src/seeds/demo/writer';
import { buildDemoBranches, type DemoBranchSource } from '../src/seeds/demo/branches';

const ctx = {
  now: new Date('2026-10-26T09:00:00.000Z'),
  dialCode: '+962',
  cityId: new Types.ObjectId(),
  areaIds: new Map([
    ['Khalda', new Types.ObjectId()],
    ['Dabouq', new Types.ObjectId()],
    ['Shmeisani', new Types.ObjectId()],
  ]),
};
const service = (price: number, brideOnly = false): DemoBranchSource['services'][number] => ({
  catalogServiceId: new Types.ObjectId(),
  price,
  durationMinutes: 30,
  brideOnly,
});
const lamar: DemoBranchSource = {
  salonId: new Types.ObjectId(),
  gender: 'FEMALE',
  services: [service(10_000), service(150_000, true)],
};
const ostaz: DemoBranchSource = {
  salonId: new Types.ObjectId(),
  gender: 'MALE',
  services: [service(5_000)],
};

describe('demo branches (§3.3a, SRV-148)', () => {
  it('adds every extra branch, complete, with its own place, hours, prices and staff', () => {
    const data = buildDemoBranches(
      ctx,
      new Map([
        ['lamar', lamar],
        ['ostaz', ostaz],
      ]),
    );
    expect(data.Branch.map((b) => (b['name'] as { en: string }).en)).toEqual(
      DEMO_BRANCHES.map((spec) => spec.name.en),
    );
    for (const branch of data.Branch) {
      expect(branch).toMatchObject({
        isMain: false,
        status: 'ACTIVE',
        completeness: { missing: [], isComplete: true },
      });
    }
    const khalda = data.Branch[0];
    expect(String(khalda?.['areaId'])).toBe(String(ctx.areaIds.get('Khalda')));
    const prices = data.SalonService.filter((s) => s['branchId'] === khalda?.['_id']).map(
      (s) => s['price'],
    );
    expect(prices).toEqual([9_000, 135_000]);
    const staff = data.Member.filter((m) => m['branchId'] === khalda?.['_id']);
    expect(staff.map((m) => m['role'])).toEqual(['MANAGER', 'EMPLOYEE']);
    // The manager of a women's branch does brides; the employee only regular services.
    const [manager, employee] = staff.map(
      (m) => m['staff'] as { serviceIds: unknown[]; brideQualified: boolean },
    );
    expect(manager?.brideQualified).toBe(true);
    expect(manager?.serviceIds).toHaveLength(2);
    expect(employee?.serviceIds).toHaveLength(1);
    const phones = data.Member.map((m) => m['phone']);
    expect(new Set(phones).size).toBe(phones.length);
  });

  it('every row passes its real Mongoose schema', () => {
    const data = buildDemoBranches(ctx, new Map([['lamar', lamar]]));
    const models = new Map(ALL_MODELS.map((model) => [model.modelName, toDemoModel(model)]));
    for (const collection of ['Branch', 'Member', 'SalonService'] as const) {
      for (const doc of data[collection]) {
        expect([collection, models.get(collection)?.validateDoc(doc)?.message ?? null]).toEqual([
          collection,
          null,
        ]);
      }
    }
  });

  it('is deterministic and skips salons that are not seeded or offer nothing', () => {
    const sources = new Map([['lamar', lamar]]);
    const once = buildDemoBranches(ctx, sources);
    const again = buildDemoBranches(ctx, sources);
    expect(once.Branch.map((b) => String(b._id))).toEqual(again.Branch.map((b) => String(b._id)));
    expect(once.Branch).toHaveLength(2);
    const empty = buildDemoBranches(ctx, new Map([['ostaz', { ...ostaz, services: [] }]]));
    expect(empty.Branch).toHaveLength(0);
  });
});
