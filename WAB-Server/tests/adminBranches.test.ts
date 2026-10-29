import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createAdminSalonEditService } from '../src/domain/adminSalonEdit/adminSalonEdit.service';
import { createAdminBranchesService } from '../src/domain/branches/adminBranches.service';
import { createBranchesService } from '../src/domain/branches/branches.service';
import { createAdminSalonsService } from '../src/domain/salons/adminSalons.service';
import type { SalonStateNotifier } from '../src/domain/salons/salonState.service';
import { createBookingQueriesService } from '../src/domain/bookings/bookingQueries.service';
import { FakeStorageProvider } from '../src/providers/storage';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { BranchesRepository } from '../src/repositories/branches.repository';
import { CustomersRepository, MembersRepository } from '../src/repositories/identity.repository';
import { AreasRepository, CitiesRepository } from '../src/repositories/locations.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { SubscriptionsRepository } from '../src/repositories/subscriptions.repository';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const NOW = new Date('2026-10-26T09:00:00.000Z');
const adminId = new Types.ObjectId();
const actor = { adminId: adminId.toHexString(), ip: '127.0.0.1', userAgent: 'jest' };
const salonId = new Types.ObjectId();
const cityId = new Types.ObjectId();
const areaId = new Types.ObjectId();

const m = {
  salons: createFakeModel(),
  branches: createFakeModel(),
  members: createFakeModel(),
  cities: createFakeModel(),
  areas: createFakeModel(),
  subscriptions: createFakeModel(),
  bookings: createFakeModel(),
  customers: createFakeModel(),
};
const audits: Record<string, unknown>[] = [];
const notices: string[] = [];
const upcoming = new Map<string, { id: string; startsAt: Date }[]>();
const notifier: SalonStateNotifier = {
  changed: (input) => {
    notices.push(
      `${input.event}:${input.area ?? input.branch?.name.en ?? ''}:${input.reason ?? ''}`,
    );
    return Promise.resolve();
  },
};
const audit = {
  record: (entry: Record<string, unknown>) => {
    audits.push(entry);
    return Promise.resolve(entry as never);
  },
};
const branchesRepo = new BranchesRepository(m.branches.model as never);
const branches = createBranchesService({
  branches: branchesRepo,
  salons: new SalonsRepository(m.salons.model as never),
  cities: new CitiesRepository(m.cities.model as never),
  areas: new AreasRepository(m.areas.model as never),
  bookings: { upcomingForBranch: (id) => Promise.resolve(upcoming.get(id) ?? []) },
  settings: { get: () => Promise.resolve(5) } as never,
  state: {
    recompute: (id) =>
      Promise.resolve({ salonId: id, state: 'LIVE', missing: [], isComplete: true }),
  },
  notifier,
  logger,
  now: () => NOW,
});
const service = createAdminBranchesService({ branches, audit, notifier, logger });
const moves: { id: string; branchId: string | undefined }[] = [];
const edit = createAdminSalonEditService({
  profile: {} as never,
  gallery: {} as never,
  hours: {} as never,
  conflicts: {
    weekly: (_s: string, _d: unknown, branchId?: string) => {
      moves.push({ id: 'weekly', branchId });
      return Promise.resolve([]);
    },
    closure: (_s: string, _r: unknown, branchId?: string) => {
      moves.push({ id: 'closure', branchId });
      return Promise.resolve([]);
    },
  },
  salonServices: {} as never,
  staff: {} as never,
  policy: {} as never,
  audit,
  notifier,
  logger,
  branches: branchesRepo,
  team: {
    get: ({ id }) => Promise.resolve({ id, branchId: 'old' } as never),
    update: ({ id, patch }) => {
      moves.push({ id, branchId: patch.branchId });
      return Promise.resolve({ id, branchId: patch.branchId ?? null } as never);
    },
  },
});
const adminSalons = createAdminSalonsService({
  salons: new SalonsRepository(m.salons.model as never),
  members: new MembersRepository(m.members.model as never),
  subscriptions: new SubscriptionsRepository(m.subscriptions.model as never),
  salonServices: {
    deactivateAll: () => Promise.resolve(0),
    deactivateUnfitting: () => Promise.resolve(0),
  },
  state: { recompute: () => Promise.resolve({}) } as never,
  audit,
  notifier,
  logger,
  branches: branchesRepo,
});
const queries = createBookingQueriesService({
  bookings: new BookingsRepository(m.bookings.model as never),
  customers: new CustomersRepository(m.customers.model as never),
  members: new MembersRepository(m.members.model as never),
  salons: new SalonsRepository(m.salons.model as never),
  settings: { get: (k: string) => Promise.resolve(SETTING_DEFAULTS[k as never]) },
  storage: new FakeStorageProvider(),
  now: () => NOW,
});

const guard: RequestHandler = (req, _res, next) => {
  req.auth = {
    subjectType: 'ADMIN',
    subjectId: adminId.toHexString(),
    scope: 'admin',
    expiresAt: new Date(NOW.getTime() + 3_600_000),
  } as never;
  next();
};
const app = createApp({ logger, services: { adminGuard: guard, adminBranches: service } });

const body = (en: string): Record<string, unknown> => ({
  name: { ar: `فرع ${en}`, en },
  location: { latitude: 31.95, longitude: 35.86 },
  locationText: `${en} Street, Amman`,
  cityId: cityId.toHexString(),
  areaId: areaId.toHexString(),
  phone: '+96265921001',
});
const create = (en: string): ReturnType<typeof service.create> =>
  service.create({
    salonId: salonId.toHexString(),
    reason: 'Owner asked by phone',
    actor,
    branch: body(en) as never,
  });

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  audits.length = 0;
  notices.length = 0;
  moves.length = 0;
  upcoming.clear();
  m.salons.docs.push({
    _id: salonId,
    name: 'Hifa',
    businessType: 'SALON',
    audience: 'FEMALE',
    state: 'LIVE',
    branchCount: 0,
    rating: { avg: 0, count: 0 },
    completeness: { missing: [], isComplete: true },
    createdAt: NOW,
  });
  m.cities.docs.push({
    _id: cityId,
    countryCode: 'JO',
    name: { ar: 'ع', en: 'Amman' },
    active: true,
  });
  m.areas.docs.push({
    _id: areaId,
    cityId: cityId.toHexString(),
    name: { ar: 'ع', en: 'Abdoun' },
    active: true,
  });
});

describe('admin branch management (§5.16, CLAUDE.md §4.12)', () => {
  it('creates and edits with the owner’s rules, an audit record and an owner notice', async () => {
    const first = await create('Abdoun');
    expect(first.isMain).toBe(true);
    const edited = await service.update({
      salonId: salonId.toHexString(),
      branchId: first.id,
      reason: 'Wrong phone',
      actor,
      patch: { phone: '+96265921002' },
    });
    expect(edited.phone).toBe('+96265921002');
    expect(audits.map((a) => [a['action'], a['entityType'], a['entityId'], a['reason']])).toEqual([
      ['BRANCH_CREATE', 'branch', first.id, 'Owner asked by phone'],
      ['BRANCH_UPDATE', 'branch', first.id, 'Wrong phone'],
    ]);
    expect(audits[1]?.['before']).toMatchObject({ phone: '+96265921001' });
    expect(notices).toEqual([
      'salon.edited_by_admin:branches:Owner asked by phone',
      'salon.edited_by_admin:branches:Wrong phone',
    ]);
  });

  it('main, offline, online and close: one notice each, the owner rules still refuse', async () => {
    const main = await create('Abdoun');
    const second = await create('Mecca');
    const on = { salonId: salonId.toHexString(), actor };
    await service.setMain({ ...on, branchId: second.id, reason: 'Bigger branch' });
    await service.setOffline({ ...on, branchId: main.id, reason: 'Renovation' });
    await service.setOnline({ ...on, branchId: main.id, reason: 'Done' });
    upcoming.set(main.id, [{ id: 'b1', startsAt: NOW }]);
    await expect(
      service.close({ ...on, branchId: main.id, reason: 'Closing' }),
    ).rejects.toMatchObject({ code: 'BRANCH_HAS_UPCOMING_BOOKINGS' });
    upcoming.clear();
    const closed = await service.close({ ...on, branchId: main.id, reason: 'Closing' });
    expect(closed.status).toBe('CLOSED');
    await expect(
      service.close({ ...on, branchId: second.id, reason: 'Last one' }),
    ).rejects.toMatchObject({ code: 'LAST_BRANCH' });
    expect(audits.slice(2).map((a) => a['action'])).toEqual([
      'BRANCH_SET_MAIN',
      'BRANCH_OFFLINE',
      'BRANCH_ONLINE',
      'BRANCH_CLOSE',
    ]);
    // Offline/online already tell the owner (branch events), so no second notice for them.
    expect(notices.slice(2)).toEqual([
      'salon.edited_by_admin:branches:Bigger branch',
      'branch.offline:Abdoun:Renovation',
      'branch.online:Abdoun:',
      'salon.edited_by_admin:branches:Closing',
    ]);
  });

  it('the salon detail lists every branch (closed too) and members show their branch', async () => {
    const main = await create('Abdoun');
    const second = await create('Mecca');
    await service.close({
      salonId: salonId.toHexString(),
      branchId: second.id,
      reason: 'Closing',
      actor,
    });
    const owner = new Types.ObjectId();
    const manager = new Types.ObjectId();
    m.members.docs.push(
      {
        _id: owner,
        salonId,
        role: 'OWNER',
        firstName: 'O',
        lastName: 'O',
        phone: '+962790000000',
        active: true,
        providesServices: false,
        permissions: [],
        createdAt: NOW,
      },
      {
        _id: manager,
        salonId,
        branchId: new Types.ObjectId(main.id),
        role: 'MANAGER',
        firstName: 'M',
        lastName: 'M',
        phone: '+962790000001',
        active: true,
        providesServices: true,
        permissions: [],
        createdAt: NOW,
      },
    );
    const detail = await adminSalons.detail(salonId.toHexString());
    expect(detail.branches.map((b) => [b.name.en, b.status])).toEqual([
      ['Abdoun', 'ACTIVE'],
      ['Mecca', 'CLOSED'],
    ]);
    const all = await adminSalons.members(salonId.toHexString());
    expect(all.map((x) => x.branchId)).toEqual([null, main.id]);
    const ofMain = await adminSalons.members(salonId.toHexString(), main.id);
    expect(ofMain.map((x) => x.id)).toEqual([manager.toHexString()]);
  });
});

describe('admin edits per branch', () => {
  it('previews check the named branch, else the main branch', async () => {
    const main = await create('Abdoun');
    const second = await create('Mecca');
    await edit.previewWeekly({ salonId: salonId.toHexString(), days: [] });
    await edit.previewClosure({
      salonId: salonId.toHexString(),
      from: '2026-11-01',
      to: '2026-11-02',
      branchId: second.id,
    });
    expect(moves).toEqual([
      { id: 'weekly', branchId: main.id },
      { id: 'closure', branchId: second.id },
    ]);
  });

  it('moves a member to another branch with reason, audit and notice', async () => {
    const target = new Types.ObjectId().toHexString();
    const moved = await edit.moveStaff({
      salonId: salonId.toHexString(),
      memberId: 'm1',
      toBranchId: target,
      reason: 'Needed at Mecca',
      actor,
    });
    expect(moved.branchId).toBe(target);
    expect(audits[0]).toMatchObject({
      action: 'SALON_STAFF_MOVE',
      before: { memberId: 'm1', branchId: 'old' },
      after: { memberId: 'm1', branchId: target },
      reason: 'Needed at Mecca',
    });
    expect(notices).toEqual(['salon.edited_by_admin:staff:Needed at Mecca']);
  });

  it('the admin bookings list filters by branch', async () => {
    const a = new Types.ObjectId();
    const b = new Types.ObjectId();
    const booking = (branchId: Types.ObjectId): Record<string, unknown> => ({
      _id: new Types.ObjectId(),
      salonId,
      branchId,
      customerId: new Types.ObjectId(),
      referenceNumber: `WAB-${branchId.toHexString().slice(-6).toUpperCase()}`,
      status: 'PENDING',
      appointmentStart: NOW,
      appointmentEnd: NOW,
      respondBy: NOW,
      persons: [],
      hasBride: false,
      paymentMethod: 'PAY_AT_SALON',
      paymentStatus: 'NOT_REQUIRED',
      refundStatus: 'NONE',
      money: { total: 0, dueOnline: 0, paidOnline: 0, remaining: 0, refunded: 0 },
      createdAt: NOW,
    });
    m.bookings.docs.push(booking(a), booking(b));
    const result = await queries.list({
      audience: { kind: 'ADMIN' },
      query: { branchId: b.toHexString() },
      params: { page: 1, pageSize: 10 },
      language: 'en',
    });
    expect(result.total).toBe(1);
  });
});

describe('admin branch routes', () => {
  it('every write needs a reason; the list answers under the salon', async () => {
    const missing = await request(app)
      .post(`/admin/v1/salons/${salonId.toHexString()}/branches`)
      .send(body('Abdoun'));
    expect(missing.status).toBe(400);
    const created = await request(app)
      .post(`/admin/v1/salons/${salonId.toHexString()}/branches`)
      .send({ ...body('Abdoun'), reason: 'Owner request' });
    expect(created.status).toBe(201);
    const list = await request(app).get(`/admin/v1/salons/${salonId.toHexString()}/branches`);
    expect((list.body as { data: unknown[] }).data).toHaveLength(1);
    const id = (created.body as { data: { id: string } }).data.id;
    const noReason = await request(app)
      .post(`/admin/v1/salons/${salonId.toHexString()}/branches/${id}/main`)
      .send({});
    expect(noReason.status).toBe(400);
  });

  it('SRV-171 S3: the list is paged with `meta`, main first, closed branches left out', async () => {
    const base = `/admin/v1/salons/${salonId.toHexString()}/branches`;
    await create('Abdoun');
    await create('Sweifieh');
    const third = await create('Khalda');
    await service.close({ salonId: salonId.toHexString(), branchId: third.id, reason: 'r', actor });
    const all = await request(app).get(base);
    expect(all.status).toBe(200);
    const page = all.body as { data: { name: { en: string } }[]; meta: unknown };
    expect(page.meta).toEqual({ page: 1, pageSize: 25, total: 2 });
    expect(page.data.map((b) => b.name.en)).toEqual(['Abdoun', 'Sweifieh']);
    const second = await request(app).get(`${base}?page=2&pageSize=1`);
    expect(second.body).toMatchObject({
      data: [{ name: { en: 'Sweifieh' } }],
      meta: { page: 2, pageSize: 1, total: 2 },
    });
    expect((await request(app).get(`${base}?pageSize=0`)).status).toBe(400);
  });
});
