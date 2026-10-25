import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createSalonServicesService } from '../src/domain/salonServices/salonServices.service';
import { createHoursService } from '../src/domain/salons/hoursService';
import { requireAuth } from '../src/middlewares/auth';
import { loadMember } from '../src/middlewares/permission';
import { BranchesRepository } from '../src/repositories/branches.repository';
import { CatalogServicesRepository } from '../src/repositories/catalog.repository';
import { ClosuresRepository } from '../src/repositories/closures.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { SalonServicesRepository } from '../src/repositories/salonServices.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const salonId = new Types.ObjectId();
const mainBranch = new Types.ObjectId();
const meccaBranch = new Types.ObjectId();
const foreignBranch = new Types.ObjectId();
const catalogId = new Types.ObjectId();
const week = (open: string): { day: string; isOff: boolean; open: string; close: string }[] =>
  ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'].map((day) => ({
    day,
    isOff: day === 'FRI',
    open,
    close: '20:00',
  }));

const m = {
  salons: createFakeModel(),
  branches: createFakeModel(),
  members: createFakeModel(),
  closures: createFakeModel(),
  services: createFakeModel(),
  catalog: createFakeModel(),
};
const branches = new BranchesRepository(m.branches.model as never);
const state = {
  recompute: () =>
    Promise.resolve({ salonId: '', state: 'LIVE' as const, missing: [], isComplete: true }),
};
const mainBranches = { idOf: () => Promise.resolve(mainBranch), mirror: () => Promise.resolve() };
const members = new MembersRepository(m.members.model as never);
const app = createApp({
  logger,
  services: {
    hours: createHoursService({
      salons: new SalonsRepository(m.salons.model as never),
      closures: new ClosuresRepository(m.closures.model as never),
      settings: {
        get: (key: string) => Promise.resolve(key === 'timezone' ? 'Asia/Amman' : 15),
      } as never,
      state,
      branches,
      mainBranches,
      now: () => new Date('2026-10-30T08:00:00.000Z'),
    }),
    salonServices: createSalonServicesService({
      salons: new SalonsRepository(m.salons.model as never),
      catalog: new CatalogServicesRepository(m.catalog.model as never),
      services: new SalonServicesRepository(m.services.model as never),
      storage: { getPublicUrl: (k: string) => k },
      uploads: { assertConfirmed: () => Promise.resolve() },
      state,
      mainBranches,
      branches,
    }),
    salonProfile: {
      service: undefined as never,
      guard: [requireAuth('merchant', SECRET), loadMember(members)],
    },
  },
});

const headers = (
  role: string,
  branchId?: Types.ObjectId,
  permissions: string[] = [],
): Record<string, string> => {
  const _id = new Types.ObjectId();
  m.members.docs.push({
    _id,
    salonId,
    role,
    permissions,
    active: true,
    ...(branchId === undefined ? {} : { branchId }),
  });
  return {
    Authorization: `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'MEMBER', subjectId: _id.toHexString(), ttlSec: 600 }).token}`,
  };
};
const url = (branch: Types.ObjectId | string, rest: string): string =>
  `/merchant/v1/branches/${typeof branch === 'string' ? branch : branch.toHexString()}/${rest}`;
const dataOf = (res: { body: unknown }): Record<string, unknown> =>
  (res.body as { data: Record<string, unknown> }).data;
const codeOf = (res: { body: unknown }): string =>
  (res.body as { error: { code: string } }).error.code;

beforeEach(() => {
  for (const model of Object.values(m)) model.docs.length = 0;
  m.salons.docs.push({
    _id: salonId,
    name: 'Hifa',
    gender: 'FEMALE',
    state: 'LIVE',
    weeklySchedule: week('10:00'),
    mainBranchId: mainBranch,
  });
  m.branches.docs.push(
    {
      _id: mainBranch,
      salonId,
      isMain: true,
      status: 'ACTIVE',
      name: { ar: 'ر', en: 'Main' },
      weeklySchedule: week('10:00'),
      completeness: { missing: [], isComplete: true },
    },
    {
      _id: meccaBranch,
      salonId,
      isMain: false,
      status: 'ACTIVE',
      name: { ar: 'م', en: 'Mecca Street' },
      weeklySchedule: week('12:00'),
      completeness: { missing: [], isComplete: true },
    },
    {
      _id: foreignBranch,
      salonId: new Types.ObjectId(),
      isMain: true,
      status: 'ACTIVE',
      name: { ar: 'غ', en: 'Elsewhere' },
      weeklySchedule: week('09:00'),
      completeness: { missing: [], isComplete: true },
    },
  );
  m.catalog.docs.push({
    _id: catalogId,
    gender: 'FEMALE',
    active: true,
    name: { ar: 'قص', en: 'Haircut' },
    description: { ar: 'و', en: 'd' },
    imageKey: 'c/a.jpg',
    sortOrder: 1,
  });
});

describe('per-branch hours and closures (§3.3a)', () => {
  it('the owner reads and changes any branch of the salon', async () => {
    const owner = headers('OWNER');
    const read = await request(app).get(url(meccaBranch, 'hours')).set(owner);
    expect(read.status).toBe(200);
    expect((dataOf(read)['weeklySchedule'] as { open: string }[])[0]?.open).toBe('12:00');
    const put = await request(app)
      .put(url(meccaBranch, 'hours/weekly'))
      .set(owner)
      .send({ days: week('13:00') });
    expect(put.status).toBe(200);
    expect((m.branches.docs[1]?.['weeklySchedule'] as { open: string }[])[0]?.open).toBe('13:00');
    const closure = await request(app)
      .post(url(meccaBranch, 'hours/closures'))
      .set(owner)
      .send({ from: '2026-11-10', to: '2026-11-10', reason: 'Training' });
    expect(closure.status).toBe(201);
    expect(String(m.closures.docs[0]?.['branchId'])).toBe(meccaBranch.toHexString());
  });

  it('a manager works on their own branch only (403 BRANCH_SCOPE_DENIED elsewhere)', async () => {
    const manager = headers('MANAGER', meccaBranch, ['WORKING_HOURS_MANAGE']);
    expect((await request(app).get(url(meccaBranch, 'hours')).set(manager)).status).toBe(200);
    const other = await request(app).get(url(mainBranch, 'hours')).set(manager);
    expect(other.status).toBe(403);
    expect(codeOf(other)).toBe('BRANCH_SCOPE_DENIED');
  });

  it('another salon’s branch or a malformed id is not found', async () => {
    const owner = headers('OWNER');
    const foreign = await request(app).get(url(foreignBranch, 'hours')).set(owner);
    expect(foreign.status).toBe(404);
    expect(codeOf(foreign)).toBe('BRANCH_NOT_FOUND');
    expect((await request(app).get(url('not-an-id', 'hours')).set(owner)).status).toBe(404);
  });
});

describe('per-branch services', () => {
  it('each branch offers its own services, and the same catalog service may be in both', async () => {
    const owner = headers('OWNER');
    const body = {
      catalogServiceId: catalogId.toHexString(),
      price: '15.000',
      durationMinutes: 45,
    };
    const inMecca = await request(app).post(url(meccaBranch, 'services')).set(owner).send(body);
    expect(inMecca.status).toBe(201);
    const inMain = await request(app)
      .post(url(mainBranch, 'services'))
      .set(owner)
      .send({ ...body, price: '18.000' });
    expect(inMain.status).toBe(201);
    expect(m.services.docs.map((s) => String(s['branchId'])).sort()).toEqual(
      [mainBranch.toHexString(), meccaBranch.toHexString()].sort(),
    );
    const again = await request(app).post(url(meccaBranch, 'services')).set(owner).send(body);
    expect(again.status).toBe(409);
    const list = await request(app).get(url(meccaBranch, 'services')).set(owner);
    expect((list.body as { data: { price: string }[] }).data.map((s) => s.price)).toEqual([
      '15.000',
    ]);
  });

  it('refuses a branch of another salon and a manager of another branch', async () => {
    const owner = headers('OWNER');
    const body = {
      catalogServiceId: catalogId.toHexString(),
      price: '15.000',
      durationMinutes: 45,
    };
    expect(
      (await request(app).post(url(foreignBranch, 'services')).set(owner).send(body)).status,
    ).toBe(404);
    const manager = headers('MANAGER', mainBranch, ['SERVICES_MANAGE']);
    expect(
      (await request(app).post(url(meccaBranch, 'services')).set(manager).send(body)).status,
    ).toBe(403);
  });
});
