import { Types } from 'mongoose';
import { SCHEDULE_DAY_ORDER } from '../src/constants/salon';
import {
  createBranchStateService,
  type BranchFacts,
} from '../src/domain/branches/branchState.service';
import { createMainBranches } from '../src/domain/branches/mainBranch';
import { assertBranchBookable, isBranchBookable } from '../src/domain/salons/bookable';
import type { SalonStateNotifier } from '../src/domain/salons/salonState.service';
import { BranchesRepository } from '../src/repositories/branches.repository';
import { AreasRepository } from '../src/repositories/locations.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { createFakeModel } from './helpers/fakeModel';

const open = SCHEDULE_DAY_ORDER.map((day) => ({
  day,
  isOff: day === 'FRI',
  open: '10:00',
  close: '20:00',
}));
const salonId = new Types.ObjectId();
const areaId = new Types.ObjectId();

const setup = (): {
  branches: ReturnType<typeof createFakeModel>;
  salons: ReturnType<typeof createFakeModel>;
  repo: BranchesRepository;
  mains: ReturnType<typeof createMainBranches>;
} => {
  const branches = createFakeModel();
  const salons = createFakeModel();
  const areas = createFakeModel();
  areas.docs.push({
    _id: areaId,
    cityId: new Types.ObjectId(),
    name: { ar: 'عبدون', en: 'Abdoun' },
    active: true,
    sortOrder: 1,
  });
  salons.docs.push({
    _id: salonId,
    name: 'Lamar',
    gender: 'FEMALE',
    state: 'LIVE',
    location: { type: 'Point', coordinates: [35.88, 31.95] },
    locationText: 'Abdoun',
    areaId,
    phone: '+96265921001',
    weeklySchedule: open,
    branchCount: 0,
    completeness: { missing: [], isComplete: true },
  });
  const repo = new BranchesRepository(branches.model as never);
  const mains = createMainBranches({
    branches: repo,
    salons: new SalonsRepository(salons.model as never),
    areas: new AreasRepository(areas.model as never),
  });
  return { branches, salons, repo, mains };
};

describe('main branch for the salon-level endpoints (§5.16)', () => {
  it('creates it from the salon’s address, contacts and hours, named after its area, and links it', async () => {
    const { branches, salons, mains } = setup();
    const branch = await mains.ensure(salonId.toString());
    expect(branch).toMatchObject({
      isMain: true,
      status: 'ACTIVE',
      name: { en: 'Abdoun' },
      locationText: 'Abdoun',
      phone: '+96265921001',
    });
    expect(branches.docs).toHaveLength(1);
    expect(String(salons.docs[0]?.['mainBranchId'])).toBe(branch.id);
    expect(salons.docs[0]?.['branchCount']).toBe(1);
  });

  it('reuses the linked branch on later calls (idOf) and never creates a second one', async () => {
    const { branches, mains } = setup();
    const first = await mains.idOf(salonId.toString());
    const second = await mains.idOf(salonId.toString());
    expect(second.toString()).toBe(first.toString());
    expect(branches.docs).toHaveLength(1);
  });

  it('copies salon-level address/contact/hours edits onto the main branch, including clearing a field', async () => {
    const { branches, mains } = setup();
    await mains.ensure(salonId.toString());
    await mains.mirror(salonId.toString(), { phone: '+96265000000', weeklySchedule: open }, [
      'whatsapp',
      'location',
    ]);
    expect(branches.docs[0]).toMatchObject({ phone: '+96265000000' });
    expect(branches.docs[0]?.['location']).toBeUndefined();
  });
});

describe('branch completeness (§5.2)', () => {
  const notifier = (): { events: string[]; notifier: SalonStateNotifier } => {
    const events: string[] = [];
    return {
      events,
      notifier: {
        changed: (input) => {
          events.push(`${input.event}:${input.branch?.name.en ?? ''}`);
          return Promise.resolve();
        },
      },
    };
  };
  const counts = (map: Record<string, [number, number]>): BranchFacts => ({
    activeServiceCount: (id) => Promise.resolve(map[id]?.[0] ?? 0),
    qualifiedStaffCount: (id) => Promise.resolve(map[id]?.[1] ?? 0),
  });
  const addBranch = (
    branches: ReturnType<typeof createFakeModel>,
    extra: Record<string, unknown>,
  ): string => {
    const id = new Types.ObjectId();
    branches.docs.push({
      _id: id,
      salonId,
      isMain: false,
      status: 'ACTIVE',
      name: { ar: 'ف', en: 'Second' },
      location: { type: 'Point', coordinates: [35.9, 31.9] },
      phone: '+96265921002',
      weeklySchedule: open,
      completeness: { missing: ['SERVICE'], isComplete: false },
      ...extra,
    });
    return id.toString();
  };

  it('recomputes every open branch and reports the main branch’s gaps when none is bookable', async () => {
    const { branches, repo } = setup();
    const main = addBranch(branches, {
      isMain: true,
      name: { ar: 'ر', en: 'Main' },
      phone: undefined,
    });
    addBranch(branches, {});
    const service = createBranchStateService({ branches: repo, facts: counts({ [main]: [1, 1] }) });
    expect(await service.recompute(salonId.toString())).toEqual({
      bookable: false,
      mainMissing: ['PHONE'],
    });
  });

  it('a multi-branch salon tells the owner when a branch becomes bookable or stops being bookable', async () => {
    const { branches, repo } = setup();
    const main = addBranch(branches, {
      isMain: true,
      name: { ar: 'ر', en: 'Main' },
      completeness: { missing: [], isComplete: true },
    });
    const second = addBranch(branches, {});
    const { events, notifier: n } = notifier();
    const summary = await createBranchStateService({
      branches: repo,
      facts: counts({ [second]: [2, 1] }),
      notifier: n,
    }).recompute(salonId.toString());
    expect(summary).toEqual({ bookable: true, mainMissing: ['SERVICE', 'STAFF'] });
    expect(events.sort()).toEqual(['branch.live:Second', 'branch.not_bookable:Main']);
    expect(branches.docs.find((b) => String(b._id) === second)?.['completeness']).toEqual({
      missing: [],
      isComplete: true,
    });
    expect(main).toBeDefined();
  });

  it('stays quiet for a single-branch salon (the salon events cover it) and when nothing changed', async () => {
    const { branches, repo } = setup();
    const only = addBranch(branches, { isMain: true });
    const { events, notifier: n } = notifier();
    const service = createBranchStateService({
      branches: repo,
      facts: counts({ [only]: [1, 1] }),
      notifier: n,
    });
    await service.recompute(salonId.toString());
    await service.recompute(salonId.toString());
    expect(events).toEqual([]);
  });

  it('an offline or closed branch never counts as bookable', async () => {
    const { branches, repo } = setup();
    const offline = addBranch(branches, { isMain: true, status: 'OFFLINE' });
    addBranch(branches, { status: 'CLOSED' });
    const summary = await createBranchStateService({
      branches: repo,
      facts: counts({ [offline]: [1, 1] }),
    }).recompute(salonId.toString());
    expect(summary).toEqual({ bookable: false, mainMissing: [] });
  });
});

describe('bookable branch rule (§5.2)', () => {
  const visible = { state: 'LIVE', completeness: { missing: [], isComplete: true } } as const;
  const ready = { status: 'ACTIVE', completeness: { isComplete: true } };

  it('needs a visible salon and an ACTIVE, complete branch', () => {
    expect(isBranchBookable(visible as never, ready)).toBe(true);
    expect(isBranchBookable(visible as never, { ...ready, status: 'OFFLINE' })).toBe(false);
    expect(
      isBranchBookable(visible as never, { ...ready, completeness: { isComplete: false } }),
    ).toBe(false);
    expect(isBranchBookable({ ...visible, state: 'OFFLINE' } as never, ready)).toBe(false);
  });

  it('refuses with SALON_NOT_BOOKABLE first, then BRANCH_NOT_BOOKABLE', () => {
    expect(() => {
      assertBranchBookable({ ...visible, state: 'OFFLINE' } as never, ready);
    }).toThrow(expect.objectContaining({ code: 'SALON_NOT_BOOKABLE' }) as Error);
    expect(() => {
      assertBranchBookable(visible as never, { ...ready, status: 'OFFLINE' });
    }).toThrow(expect.objectContaining({ code: 'BRANCH_NOT_BOOKABLE', httpStatus: 422 }) as Error);
  });
});
