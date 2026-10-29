import { Types } from 'mongoose';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createSalonDetailsService } from '../src/domain/salonDetails/salonDetails.service';
import { cheapestSums, representativeBranch } from '../src/domain/search/branchPlaces';
import { createSearchService } from '../src/domain/search/search.service';
import type { BranchRaw } from '../src/models/branch.model';
import { FakeStorageProvider } from '../src/providers/storage';
import { BranchesRepository } from '../src/repositories/branches.repository';
import { CatalogServicesRepository } from '../src/repositories/catalog.repository';
import { ClosuresRepository } from '../src/repositories/closures.repository';
import { GalleryRepository } from '../src/repositories/gallery.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { LeavesRepository } from '../src/repositories/leaves.repository';
import { SalonServicesRepository } from '../src/repositories/salonServices.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import type { Entity } from '../src/utils/database/plain';
import { createFakeModel } from './helpers/fakeModel';

// Monday 2026-10-12 11:00 in Amman.
const NOW = new Date('2026-10-12T08:00:00Z');
const settings = { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) };
const week = (open: string): object[] =>
  ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'].map((day) => ({
    day,
    isOff: false,
    open,
    close: '20:00',
  }));
// Amman places: Abdoun (south-west), Sweifieh, and Irbid (far outside the radius).
const ABDOUN: [number, number] = [35.879, 31.946];
const SWEIFIEH: [number, number] = [35.862, 31.957];
const IRBID: [number, number] = [35.85, 32.556];
const HERE = { lat: 31.958, lng: 35.861 };

const m = {
  salons: createFakeModel(),
  branches: createFakeModel(),
  services: createFakeModel(),
  closures: createFakeModel(),
  members: createFakeModel(),
  catalog: createFakeModel(),
  gallery: createFakeModel(),
  leaves: createFakeModel(),
};
const storage = new FakeStorageProvider();
const search = createSearchService({
  salons: new SalonsRepository(m.salons.model as never),
  salonServices: new SalonServicesRepository(m.services.model as never),
  closures: new ClosuresRepository(m.closures.model as never),
  branches: new BranchesRepository(m.branches.model as never),
  storage,
  settings,
  now: () => NOW,
});
const details = createSalonDetailsService({
  salons: new SalonsRepository(m.salons.model as never),
  members: new MembersRepository(m.members.model as never),
  salonServices: new SalonServicesRepository(m.services.model as never),
  catalog: new CatalogServicesRepository(m.catalog.model as never),
  gallery: new GalleryRepository(m.gallery.model as never),
  closures: new ClosuresRepository(m.closures.model as never),
  leaves: new LeavesRepository(m.leaves.model as never),
  branches: new BranchesRepository(m.branches.model as never),
  storage,
  settings,
  now: () => NOW,
});

const hifa = new Types.ObjectId();
const glow = new Types.ObjectId();
const ids = {
  hifaAbdoun: new Types.ObjectId(),
  hifaSweifieh: new Types.ObjectId(),
  hifaIrbid: new Types.ObjectId(),
  hifaClosed: new Types.ObjectId(),
  glowMain: new Types.ObjectId(),
};
const catalogA = new Types.ObjectId();
const catalogB = new Types.ObjectId();
const page = { page: 1, pageSize: 10 };

const salon = (_id: Types.ObjectId, name: string): Record<string, unknown> => ({
  _id,
  name,
  searchText: `${name} Amman`,
  businessType: 'SALON',
  audience: 'FEMALE',
  state: 'LIVE',
  completeness: { missing: [], isComplete: true },
  rating: { avg: 4.5, count: 12 },
  weeklySchedule: week('09:00'),
  locationText: 'Legacy text',
  location: { type: 'Point', coordinates: ABDOUN },
});
const branch = (
  _id: Types.ObjectId,
  salonId: Types.ObjectId,
  en: string,
  at: [number, number],
  over: Record<string, unknown> = {},
): Record<string, unknown> => ({
  _id,
  salonId,
  isMain: false,
  status: 'ACTIVE',
  name: { ar: `فرع ${en}`, en },
  locationText: `${en}, Amman`,
  location: { type: 'Point', coordinates: at },
  phone: '+962791111111',
  weeklySchedule: week('10:00'),
  completeness: { missing: [], isComplete: true },
  ...over,
});
const offer = (
  salonId: Types.ObjectId,
  branchId: Types.ObjectId,
  catalogServiceId: Types.ObjectId,
  price: number,
): Types.ObjectId => {
  const _id = new Types.ObjectId();
  m.services.docs.push({
    _id,
    salonId,
    branchId,
    catalogServiceId,
    price,
    durationMinutes: 30,
    mediaKeys: [],
    active: true,
  });
  return _id;
};

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  m.salons.docs.push(salon(hifa, 'Hifa'), salon(glow, 'Glow'));
  m.branches.docs.push(
    branch(ids.hifaAbdoun, hifa, 'Abdoun', ABDOUN, { isMain: true }),
    branch(ids.hifaSweifieh, hifa, 'Sweifieh', SWEIFIEH),
    branch(ids.hifaIrbid, hifa, 'Irbid', IRBID),
    branch(ids.hifaClosed, hifa, 'Old', SWEIFIEH, { status: 'CLOSED' }),
    branch(ids.glowMain, glow, 'Main', ABDOUN, { isMain: true }),
  );
});

describe('search: one card per salon (§5.17)', () => {
  it('never duplicates a salon with several branches and shows its nearest bookable branch', async () => {
    const { items } = await search.search({
      query: { gender: 'FEMALE', lat: HERE.lat, lng: HERE.lng, sort: 'NEAREST' },
      params: page,
      language: 'en',
    });
    expect(items.map((c) => c.name).sort()).toEqual(['Glow', 'Hifa']);
    const card = items.find((c) => c.name === 'Hifa');
    expect(card?.branchCount).toBe(3);
    expect(card?.branch).toEqual({ id: ids.hifaSweifieh.toHexString(), name: 'Sweifieh' });
    expect(card?.locationText).toBe('Sweifieh, Amman');
    expect(card?.distanceKm).toBeLessThan(1);
    // Hifa's Sweifieh branch is nearer than Glow's only branch, so Hifa comes first.
    expect(items[0]?.name).toBe('Hifa');
  });

  it('shows the main branch without a position, in the requested language', async () => {
    const { items } = await search.search({
      query: { gender: 'FEMALE', sort: 'RATING' },
      params: page,
      language: 'ar',
    });
    const card = items.find((c) => c.name === 'Hifa');
    expect(card?.branch).toEqual({ id: ids.hifaAbdoun.toHexString(), name: 'فرع Abdoun' });
    expect(card?.distanceKm).toBeNull();
    // Today's hours come from that branch, not the legacy salon schedule.
    expect(card?.todayHours?.open).toBe('10:00');
  });

  it('a salon matches a price filter when ONE branch offers all services, at its cheapest sum', async () => {
    offer(hifa, ids.hifaAbdoun, catalogA, 10_000);
    offer(hifa, ids.hifaAbdoun, catalogB, 10_000);
    offer(hifa, ids.hifaSweifieh, catalogA, 5_000);
    // Glow offers A and B, but in two different places (never bookable together).
    offer(glow, ids.glowMain, catalogA, 1_000);
    offer(glow, new Types.ObjectId(), catalogB, 1_000);
    const { items } = await search.search({
      query: {
        gender: 'FEMALE',
        serviceIds: [catalogA.toHexString(), catalogB.toHexString()],
        maxPrice: 20_000,
        sort: 'RATING',
      },
      params: page,
    });
    expect(items.map((c) => c.name)).toEqual(['Hifa']);
    const bounds = await search.priceBounds({
      gender: 'FEMALE',
      serviceIds: [catalogA.toHexString(), catalogB.toHexString()],
    });
    expect(bounds).toEqual({ min: 20_000, max: 20_000 });
  });

  it('drops salons with no bookable branch inside the radius', async () => {
    const { items } = await search.search({
      query: { gender: 'FEMALE', lat: IRBID[1], lng: IRBID[0], sort: 'NEAREST' },
      params: page,
      language: 'en',
    });
    expect(items.map((c) => c.name)).toEqual(['Hifa']);
    expect(items[0]?.branch?.name).toBe('Irbid');
  });
});

describe('nearest list: one entry per branch (§5.17)', () => {
  it('lists every bookable branch in the radius by distance, titled "Salon - Branch"', async () => {
    const { items, meta } = await search.nearestBranches({
      gender: 'FEMALE',
      lat: HERE.lat,
      lng: HERE.lng,
      params: page,
      language: 'en',
    });
    expect(items.map((c) => c.title)).toEqual(['Hifa - Sweifieh', 'Hifa - Abdoun', 'Glow']);
    expect(meta.total).toBe(3);
    // Closed and far branches are never listed.
    expect(items.some((c) => c.branch?.name === 'Old' || c.branch?.name === 'Irbid')).toBe(false);
    const distances = items.map((c) => c.distanceKm ?? Number.NaN);
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
  });

  it('paginates the branch entries and hides salons of the other gender', async () => {
    m.salons.docs.push({ ...salon(new Types.ObjectId(), 'Barber'), gender: 'MALE' });
    const second = await search.nearestBranches({
      gender: 'FEMALE',
      lat: HERE.lat,
      lng: HERE.lng,
      params: { page: 2, pageSize: 2 },
      language: 'en',
    });
    expect(second.items.map((c) => c.title)).toEqual(['Glow']);
    expect(second.meta.total).toBe(3);
  });
});

describe('salon details: branches, staff and services per branch (§5.17)', () => {
  it('lists bookable branches main first, with their own place and hours', async () => {
    m.closures.docs.push({
      _id: new Types.ObjectId(),
      salonId: hifa,
      branchId: ids.hifaSweifieh,
      from: '2026-10-12',
      to: '2026-10-12',
      reason: 'Maintenance',
    });
    const view = await details.get({ salonId: hifa.toHexString(), language: 'en' });
    expect(view.branches.map((b) => b.name)).toEqual(['Abdoun', 'Irbid', 'Sweifieh']);
    expect(view.branches[0]?.isMain).toBe(true);
    const sweifieh = view.branches.find((b) => b.name === 'Sweifieh');
    expect(sweifieh?.isOpenNow).toBe(false);
    expect(sweifieh?.upcomingClosures).toEqual([
      { from: '2026-10-12', to: '2026-10-12', reason: 'Maintenance' },
    ]);
    expect(sweifieh?.location).toEqual({ lat: SWEIFIEH[1], lng: SWEIFIEH[0] });
    // Top-level place fields are the main branch's (backward compatible).
    expect(view.locationText).toBe('Abdoun, Amman');
    expect(view.todayHours?.open).toBe('10:00');
    expect(view.isOpenNow).toBe(true);
    expect(view.upcomingClosures).toEqual([]);
  });

  it('tags staff and services with their branch and hides those of unbookable branches', async () => {
    m.catalog.docs.push({
      _id: catalogA,
      name: { ar: 'قص', en: 'Haircut' },
      description: { ar: 'قص', en: 'Haircut' },
      businessType: 'SALON',
      audience: 'FEMALE',
      imageKey: 'catalog/a.jpg',
      active: true,
    });
    const abdounService = offer(hifa, ids.hifaAbdoun, catalogA, 10_000);
    offer(hifa, ids.hifaSweifieh, catalogA, 8_000);
    offer(hifa, ids.hifaClosed, catalogA, 1_000);
    const staffOf = (branchId: Types.ObjectId, firstName: string): void => {
      m.members.docs.push({
        _id: new Types.ObjectId(),
        salonId: hifa,
        branchId,
        firstName,
        lastName: 'X',
        role: 'EMPLOYEE',
        active: true,
        providesServices: true,
        staff: { serviceIds: [abdounService], workingDays: [{ day: 'MON' }] },
      });
    };
    staffOf(ids.hifaAbdoun, 'Lina');
    staffOf(ids.hifaSweifieh, 'Rana');
    staffOf(ids.hifaClosed, 'Gone');
    const view = await details.get({ salonId: hifa.toHexString(), language: 'en' });
    expect(view.staff.map((s) => [s.firstName, s.branchId]).sort()).toEqual([
      ['Lina', ids.hifaAbdoun.toHexString()],
      ['Rana', ids.hifaSweifieh.toHexString()],
    ]);
    expect(view.services.map((s) => [s.branchId, s.price]).sort()).toEqual([
      [ids.hifaAbdoun.toHexString(), '10.000'],
      [ids.hifaSweifieh.toHexString(), '8.000'],
    ]);
  });
});

describe('salon details for a selected branch (SRV-172, §5.17/§5.18)', () => {
  const seedTeam = (): {
    abdoun: Types.ObjectId;
    sweifieh: Types.ObjectId;
    lina: Types.ObjectId;
    rana: Types.ObjectId;
  } => {
    m.catalog.docs.push(
      {
        _id: catalogA,
        name: { ar: 'قص', en: 'Haircut' },
        description: { ar: 'قص', en: 'Haircut' },
        businessType: 'SALON',
        audience: 'FEMALE',
        imageKey: 'catalog/a.jpg',
        active: true,
      },
      {
        _id: catalogB,
        name: { ar: 'صبغة', en: 'Color' },
        description: { ar: 'صبغة', en: 'Color' },
        businessType: 'SALON',
        audience: 'FEMALE',
        imageKey: 'catalog/b.jpg',
        active: true,
      },
    );
    const abdoun = offer(hifa, ids.hifaAbdoun, catalogA, 10_000);
    const sweifieh = offer(hifa, ids.hifaSweifieh, catalogB, 8_000);
    const member = (branchId: Types.ObjectId, firstName: string): Types.ObjectId => {
      const _id = new Types.ObjectId();
      m.members.docs.push({
        _id,
        salonId: hifa,
        branchId,
        firstName,
        lastName: 'X',
        role: 'EMPLOYEE',
        active: true,
        providesServices: true,
        // A stale pick of another branch's service must not leak onto the sheet.
        staff: {
          serviceIds: [abdoun, sweifieh],
          workingDays: [{ day: 'MON' }],
          rating: { avg: 0, count: 0 },
          customersCount: 0,
        },
      });
      return _id;
    };
    return {
      abdoun,
      sweifieh,
      lina: member(ids.hifaAbdoun, 'Lina'),
      rana: member(ids.hifaSweifieh, 'Rana'),
    };
  };

  it('lists only the selected branch staff and services, with its place and hours', async () => {
    const team = seedTeam();
    const view = await details.get({
      salonId: hifa.toHexString(),
      language: 'en',
      branchId: ids.hifaSweifieh.toHexString(),
    });
    expect(view.services.map((s) => [s.id, s.branchId])).toEqual([
      [team.sweifieh.toHexString(), ids.hifaSweifieh.toHexString()],
    ]);
    expect(view.staff.map((s) => s.firstName)).toEqual(['Rana']);
    expect(view.locationText).toBe('Sweifieh, Amman');
    expect(view.location).toEqual({ lat: SWEIFIEH[1], lng: SWEIFIEH[0] });
    // The selector still lists every bookable branch.
    expect(view.branches.map((b) => b.name)).toEqual(['Abdoun', 'Irbid', 'Sweifieh']);
  });

  it('without a branch keeps every bookable branch tagged (the app filters by its selector)', async () => {
    seedTeam();
    const view = await details.get({ salonId: hifa.toHexString(), language: 'en' });
    expect(view.services.map((s) => s.branchId).sort()).toEqual(
      [ids.hifaAbdoun.toHexString(), ids.hifaSweifieh.toHexString()].sort(),
    );
    expect(view.locationText).toBe('Abdoun, Amman');
  });

  it('404s BRANCH_NOT_FOUND for a closed branch, another salon branch or an unknown id', async () => {
    seedTeam();
    for (const branchId of [ids.hifaClosed, ids.glowMain, new Types.ObjectId()]) {
      await expect(
        details.get({
          salonId: hifa.toHexString(),
          language: 'en',
          branchId: branchId.toHexString(),
        }),
      ).rejects.toMatchObject({ code: 'BRANCH_NOT_FOUND' });
    }
  });

  it('staff sheet lists only services of the member branch; a member of a closed branch is 404', async () => {
    const team = seedTeam();
    const sheet = await details.staff({
      salonId: hifa.toHexString(),
      memberId: team.lina.toHexString(),
      language: 'en',
    });
    expect(sheet.services.map((s) => s.id)).toEqual([team.abdoun.toHexString()]);
    const gone = new Types.ObjectId();
    m.members.docs.push({
      _id: gone,
      salonId: hifa,
      branchId: ids.hifaClosed,
      firstName: 'Gone',
      lastName: 'X',
      role: 'EMPLOYEE',
      active: true,
      providesServices: true,
      staff: { serviceIds: [], workingDays: [], rating: { avg: 0, count: 0 }, customersCount: 0 },
    });
    await expect(
      details.staff({ salonId: hifa.toHexString(), memberId: gone.toHexString(), language: 'en' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('branch place helpers', () => {
  const asBranch = (id: string, isMain: boolean, at?: [number, number]): Entity<BranchRaw> =>
    ({
      id,
      isMain,
      ...(at === undefined ? {} : { location: { type: 'Point', coordinates: at } }),
    }) as unknown as Entity<BranchRaw>;

  it('picks the nearest pinned branch, else the main one', () => {
    const list = [
      asBranch('a', true, ABDOUN),
      asBranch('b', false, SWEIFIEH),
      asBranch('c', false),
    ];
    expect(representativeBranch(list, HERE, 6371)?.branch.id).toBe('b');
    expect(representativeBranch(list, null, 6371)).toEqual({ branch: list[0], distanceKm: null });
    expect(representativeBranch([], HERE, 6371)).toBeNull();
  });

  it('sums prices per branch and keeps the cheapest complete branch per salon', () => {
    const rows = [
      { salonId: 's', branchId: 'b1', catalogServiceId: 'x', price: 3 },
      { salonId: 's', branchId: 'b1', catalogServiceId: 'y', price: 3 },
      { salonId: 's', branchId: 'b2', catalogServiceId: 'x', price: 1 },
      { salonId: 's', branchId: 'b2', catalogServiceId: 'y', price: 2 },
      { salonId: 't', branchId: 'b3', catalogServiceId: 'x', price: 1 },
      { salonId: 'u', catalogServiceId: 'x', price: 4 },
      { salonId: 'u', catalogServiceId: 'y', price: 4 },
    ];
    expect(cheapestSums(rows, ['x', 'y'])).toEqual(
      new Map([
        ['s', 3],
        ['u', 8],
      ]),
    );
  });
});
