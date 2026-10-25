import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createBranchesService } from '../src/domain/branches/branches.service';
import type { SalonStateNotifier } from '../src/domain/salons/salonState.service';
import { requireAuth } from '../src/middlewares/auth';
import { loadMember } from '../src/middlewares/permission';
import { BranchesRepository } from '../src/repositories/branches.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { AreasRepository, CitiesRepository } from '../src/repositories/locations.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const salonId = new Types.ObjectId();
const cityId = new Types.ObjectId();
const areaId = new Types.ObjectId();
const otherCityArea = new Types.ObjectId();
const NOW = new Date('2026-10-26T09:00:00.000Z');

const salonsM = createFakeModel();
const branchesM = createFakeModel();
const membersM = createFakeModel();
const citiesM = createFakeModel();
const areasM = createFakeModel();
const upcoming = new Map<string, { id: string; startsAt: Date }[]>();
const recomputes: string[] = [];
const events: string[] = [];
let maxBranches = 3;

const notifier: SalonStateNotifier = {
  changed: (input) => {
    events.push(`${input.event}:${input.branch?.name.en ?? ''}:${input.reason ?? ''}`);
    return Promise.resolve();
  },
};
const service = createBranchesService({
  branches: new BranchesRepository(branchesM.model as never),
  salons: new SalonsRepository(salonsM.model as never),
  cities: new CitiesRepository(citiesM.model as never),
  areas: new AreasRepository(areasM.model as never),
  bookings: { upcomingForBranch: (id) => Promise.resolve(upcoming.get(id) ?? []) },
  settings: { get: () => Promise.resolve(maxBranches) } as never,
  state: {
    recompute: (id) => {
      recomputes.push(id);
      return Promise.resolve({ salonId: id, state: 'LIVE', missing: [], isComplete: true });
    },
  },
  notifier,
  logger,
  now: () => NOW,
});
const owner = { type: 'MEMBER' as const, id: new Types.ObjectId().toHexString() };
const input = (en: string): Parameters<typeof service.create>[1] => ({
  name: { ar: `فرع ${en}`, en },
  location: { latitude: 31.95, longitude: 35.86 },
  locationText: `${en} Street, Amman`,
  cityId: cityId.toHexString(),
  areaId: areaId.toHexString(),
  phone: '+96265921001',
});
const salonDoc = (): Record<string, unknown> | undefined =>
  salonsM.docs.find((s) => String(s._id) === salonId.toHexString());
const branchDoc = (id: string): Record<string, unknown> | undefined =>
  branchesM.docs.find((b) => String(b._id) === id);

beforeEach(() => {
  for (const m of [salonsM, branchesM, membersM, citiesM, areasM]) m.docs.length = 0;
  upcoming.clear();
  recomputes.length = 0;
  events.length = 0;
  maxBranches = 3;
  salonsM.docs.push({
    _id: salonId,
    name: 'Hifa',
    gender: 'FEMALE',
    state: 'LIVE',
    branchCount: 0,
  });
  citiesM.docs.push({
    _id: cityId,
    countryCode: 'JO',
    name: { ar: 'عمان', en: 'Amman' },
    active: true,
  });
  areasM.docs.push(
    {
      _id: areaId,
      cityId: cityId.toHexString(),
      name: { ar: 'عبدون', en: 'Abdoun' },
      active: true,
    },
    {
      _id: otherCityArea,
      cityId: new Types.ObjectId().toHexString(),
      name: { ar: 'س', en: 'Elsewhere' },
      active: true,
    },
  );
});

describe('branch management (§5.16)', () => {
  it('the first branch becomes the main one and is linked to the salon; later ones are not', async () => {
    const first = await service.create(salonId.toHexString(), input('Mecca Street'));
    const second = await service.create(salonId.toHexString(), input('Zarqa Road'));
    expect(first).toMatchObject({
      isMain: true,
      status: 'ACTIVE',
      name: { en: 'Mecca Street' },
      location: { latitude: 31.95, longitude: 35.86 },
    });
    expect(second.isMain).toBe(false);
    expect(String(salonDoc()?.['mainBranchId'])).toBe(first.id);
    expect(salonDoc()?.['branchCount']).toBe(2);
    expect(recomputes).toHaveLength(2);
    expect((await service.list(salonId.toHexString())).map((b) => b.name.en)).toEqual([
      'Mecca Street',
      'Zarqa Road',
    ]);
  });

  it('refuses a branch past salon.maxBranches (BRANCH_LIMIT_REACHED) and a city/area that do not match', async () => {
    maxBranches = 1;
    await service.create(salonId.toHexString(), input('One'));
    await expect(service.create(salonId.toHexString(), input('Two'))).rejects.toMatchObject({
      code: 'BRANCH_LIMIT_REACHED',
      httpStatus: 422,
    });
    maxBranches = 5;
    await expect(
      service.create(salonId.toHexString(), {
        ...input('Bad'),
        areaId: otherCityArea.toHexString(),
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('edits a branch; editing the main branch keeps the salon’s legacy address in step', async () => {
    const main = await service.create(salonId.toHexString(), input('Mecca Street'));
    await service.update(salonId.toHexString(), main.id, {
      phone: '+96265000000',
      locationText: 'New address',
      whatsapp: '+962790000001',
    });
    expect(salonDoc()).toMatchObject({
      phone: '+96265000000',
      locationText: 'New address',
      whatsapp: '+962790000001',
    });
    const cleared = await service.update(salonId.toHexString(), main.id, { whatsapp: null });
    expect(cleared.whatsapp).toBeNull();
    expect(salonDoc()?.['whatsapp']).toBeUndefined();
  });

  it('switches the main branch (one main at a time) and links the new one', async () => {
    const first = await service.create(salonId.toHexString(), input('Mecca Street'));
    const second = await service.create(salonId.toHexString(), input('Zarqa Road'));
    const promoted = await service.setMain(salonId.toHexString(), second.id);
    expect(promoted.isMain).toBe(true);
    expect(branchDoc(first.id)?.['isMain']).toBe(false);
    expect(String(salonDoc()?.['mainBranchId'])).toBe(second.id);
    expect(salonDoc()?.['locationText']).toBe('Zarqa Road Street, Amman');
  });

  it('takes a branch offline and back, telling the owner, and refuses the wrong transitions', async () => {
    await service.create(salonId.toHexString(), input('Mecca Street'));
    const second = await service.create(salonId.toHexString(), input('Zarqa Road'));
    const scope = { salonId: salonId.toHexString(), branchId: second.id };
    const off = await service.setOffline({ ...scope, reason: 'Renovation', actor: owner });
    expect(off).toMatchObject({ status: 'OFFLINE', offline: { reason: 'Renovation' } });
    await expect(
      service.setOffline({ ...scope, reason: 'again', actor: owner }),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
    const on = await service.setOnline({ ...scope, actor: owner });
    expect(on).toMatchObject({ status: 'ACTIVE', offline: null });
    expect(events).toEqual(['branch.offline:Zarqa Road:Renovation', 'branch.online:Zarqa Road:']);
  });

  it('closes a branch only when it is not the last, not the main, and has no upcoming bookings', async () => {
    const main = await service.create(salonId.toHexString(), input('Mecca Street'));
    const scopeMain = { salonId: salonId.toHexString(), branchId: main.id, actor: owner };
    await expect(service.close(scopeMain)).rejects.toMatchObject({
      code: 'LAST_BRANCH',
      httpStatus: 422,
    });
    const second = await service.create(salonId.toHexString(), input('Zarqa Road'));
    await expect(service.close(scopeMain)).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
      details: [expect.objectContaining({ field: 'isMain' })],
    });
    upcoming.set(second.id, [{ id: 'booking-1', startsAt: NOW }]);
    const scopeSecond = { salonId: salonId.toHexString(), branchId: second.id, actor: owner };
    await expect(service.close(scopeSecond)).rejects.toMatchObject({
      code: 'BRANCH_HAS_UPCOMING_BOOKINGS',
      httpStatus: 409,
      details: [expect.objectContaining({ field: 'booking-1' })],
    });
    upcoming.clear();
    const closed = await service.close(scopeSecond);
    expect(closed.status).toBe('CLOSED');
    expect(branchDoc(second.id)?.['closedAt']).toEqual(NOW);
    expect(salonDoc()?.['branchCount']).toBe(1);
    expect((await service.list(salonId.toHexString())).map((b) => b.id)).toEqual([main.id]);
    await expect(
      service.update(salonId.toHexString(), second.id, { phone: '+96265000000' }),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });

  it('never reaches another salon’s branch (BRANCH_NOT_FOUND)', async () => {
    const mine = await service.create(salonId.toHexString(), input('Mecca Street'));
    await expect(service.get(new Types.ObjectId().toHexString(), mine.id)).rejects.toMatchObject({
      code: 'BRANCH_NOT_FOUND',
      httpStatus: 404,
    });
  });
});

describe('merchant branch routes', () => {
  const app = createApp({
    logger,
    services: {
      branches: service,
      salonProfile: {
        service: undefined as never,
        guard: [
          requireAuth('merchant', SECRET),
          loadMember(new MembersRepository(membersM.model as never)),
        ],
      },
    },
  });
  const memberHeaders = (role: string, permissions: string[] = []): Record<string, string> => {
    const _id = new Types.ObjectId();
    membersM.docs.push({ _id, salonId, role, permissions, active: true });
    return {
      Authorization: `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'MEMBER', subjectId: _id.toHexString(), ttlSec: 600 }).token}`,
    };
  };

  it('lets the owner create and list branches', async () => {
    const headers = memberHeaders('OWNER');
    const created = await request(app)
      .post('/merchant/v1/branches')
      .set(headers)
      .send(input('Mecca Street'));
    expect(created.status).toBe(201);
    const list = await request(app).get('/merchant/v1/branches').set(headers);
    expect(list.status).toBe(200);
    expect((list.body as { data: unknown[] }).data).toHaveLength(1);
  });

  it('refuses managers (owner only) and validates bodies', async () => {
    const manager = memberHeaders('MANAGER', ['SALON_PROFILE_MANAGE', 'STAFF_MANAGE']);
    expect((await request(app).get('/merchant/v1/branches').set(manager)).status).toBe(403);
    const headers = memberHeaders('OWNER');
    const bad = await request(app)
      .post('/merchant/v1/branches')
      .set(headers)
      .send({ ...input('X'), name: { ar: 'ف' }, phone: '0791234567' });
    expect(bad.status).toBe(400);
    const empty = await request(app)
      .post(`/merchant/v1/branches/${new Types.ObjectId().toHexString()}/offline`)
      .set(headers)
      .send({});
    expect(empty.status).toBe(400);
  });
});
