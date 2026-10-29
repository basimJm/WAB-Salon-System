import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createStaffFacts } from '../src/domain/salons/salonState.service';
import { createStaffService, type StaffConflicts } from '../src/domain/team/staff.service';
import { requireAuth } from '../src/middlewares/auth';
import { loadMember } from '../src/middlewares/permission';
import { MembersRepository } from '../src/repositories/identity.repository';
import { SalonServicesRepository } from '../src/repositories/salonServices.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const womenSalon = new Types.ObjectId();
const menSalon = new Types.ObjectId();
const salonsM = createFakeModel();
const membersM = createFakeModel();
const servicesM = createFakeModel();
const members = new MembersRepository(membersM.model as never);
const recomputes: string[] = [];
const conflict = { list: [] as { bookingId: string; startsAt: Date; status: string }[] };
const conflicts: StaffConflicts = { check: () => Promise.resolve(conflict.list) };
const app = createApp({
  logger,
  services: {
    staff: createStaffService({
      members,
      salons: new SalonsRepository(salonsM.model as never),
      salonServices: new SalonServicesRepository(servicesM.model as never),
      settings: { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) },
      state: {
        recompute: (id) => {
          recomputes.push(id);
          return Promise.resolve({ salonId: id, state: 'LIVE', missing: [], isComplete: true });
        },
      },
      conflicts,
    }),
    salonProfile: {
      service: undefined as never,
      guard: [requireAuth('merchant', SECRET), loadMember(members)],
    },
  },
});

interface Body {
  data: Record<string, unknown>;
  error: { code: string; details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const week = (off: string[] = []): object[] =>
  ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'].map((day) => ({
    day,
    isOff: off.includes(day),
    open: '09:00',
    close: '18:00',
  }));
const addMember = (
  salonId: Types.ObjectId,
  role: string,
  permissions: string[] = [],
  over: Record<string, unknown> = {},
): { id: string; headers: Record<string, string> } => {
  const _id = new Types.ObjectId();
  membersM.docs.push({
    _id,
    salonId,
    firstName: 'A',
    lastName: 'B',
    phone: `+9627900000${String(membersM.docs.length).padStart(2, '0')}`,
    role,
    permissions,
    active: true,
    providesServices: false,
    ...over,
  });
  return {
    id: _id.toHexString(),
    headers: {
      Authorization: `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'MEMBER', subjectId: _id.toHexString(), ttlSec: 600 }).token}`,
    },
  };
};
const addService = (salonId: Types.ObjectId, active = true): string => {
  const _id = new Types.ObjectId();
  servicesM.docs.push({
    _id,
    salonId,
    catalogServiceId: new Types.ObjectId(),
    price: 1000,
    durationMinutes: 30,
    active,
    mediaKeys: [],
  });
  return _id.toHexString();
};
const put = async (
  headers: Record<string, string>,
  id: string,
  body: object,
): Promise<{ status: number; body: unknown }> =>
  await request(app).put(`/merchant/v1/team/members/${id}/staff`).set(headers).send(body);
const PROFILE = {
  providesServices: true,
  serviceIds: [] as string[],
  brideQualified: false,
  workingDays: [{ day: 'SUN' }, { day: 'MON' }],
};

beforeEach(() => {
  for (const f of [salonsM, membersM, servicesM]) f.docs.length = 0;
  recomputes.length = 0;
  conflict.list = [];
  salonsM.docs.push(
    {
      _id: womenSalon,
      name: 'Glow',
      businessType: 'SALON',
      audience: 'FEMALE',
      weeklySchedule: week(['FRI']),
    },
    {
      _id: menSalon,
      name: 'Barber',
      businessType: 'SALON',
      audience: 'MALE',
      weeklySchedule: week(),
    },
  );
});

describe('staff profile', () => {
  it('needs STAFF_MANAGE', async () => {
    const employee = addMember(womenSalon, 'EMPLOYEE', ['REVIEWS_VIEW']);
    expect((await put(employee.headers, employee.id, PROFILE)).status).toBe(403);
    expect(
      (
        await request(app)
          .get(`/merchant/v1/team/members/${employee.id}/staff`)
          .set(employee.headers)
      ).status,
    ).toBe(403);
    const manager = addMember(womenSalon, 'MANAGER', ['STAFF_MANAGE']);
    expect((await put(manager.headers, employee.id, PROFILE)).status).toBe(200);
  });

  it('turns a member into a service provider with skills, bride qualification and working days', async () => {
    const owner = addMember(womenSalon, 'OWNER');
    const member = addMember(womenSalon, 'EMPLOYEE');
    const s1 = addService(womenSalon);
    const s2 = addService(womenSalon, false);
    const res = await put(owner.headers, member.id, {
      providesServices: true,
      bio: 'Colorist',
      yearsOfExperience: 7,
      serviceIds: [s1, s2],
      brideQualified: true,
      workingDays: [{ day: 'SUN', start: '10:00', end: '16:30' }, { day: 'MON' }],
    });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toMatchObject({
      providesServices: true,
      bio: 'Colorist',
      yearsOfExperience: 7,
      brideQualified: true,
      serviceIds: [s1, s2],
      rating: { avg: 0, count: 0 },
      customersCount: 0,
    });
    expect(bodyOf(res).data['workingDays']).toEqual([
      { day: 'SUN', start: '10:00', end: '16:30' },
      { day: 'MON', start: null, end: null },
    ]);
    expect(membersM.docs[1]).toMatchObject({ providesServices: true });
    expect(recomputes).toEqual([womenSalon.toHexString()]);
    const read = await request(app)
      .get(`/merchant/v1/team/members/${member.id}/staff`)
      .set(owner.headers);
    expect(bodyOf(read).data['serviceIds']).toEqual([s1, s2]);
  });

  it('makes the salon count the member as qualified staff only with a service and a working day', async () => {
    const owner = addMember(womenSalon, 'OWNER');
    const member = addMember(womenSalon, 'EMPLOYEE');
    const facts = createStaffFacts(members, () => Promise.resolve(1));
    expect(await facts.qualifiedStaffCount(womenSalon.toHexString())).toBe(0);
    await put(owner.headers, member.id, { ...PROFILE, serviceIds: [] });
    expect(await facts.qualifiedStaffCount(womenSalon.toHexString())).toBe(0);
    await put(owner.headers, member.id, { ...PROFILE, serviceIds: [addService(womenSalon)] });
    expect(await facts.qualifiedStaffCount(womenSalon.toHexString())).toBe(1);
    await put(owner.headers, member.id, {
      ...PROFILE,
      serviceIds: [addService(womenSalon)],
      providesServices: false,
    });
    expect(await facts.qualifiedStaffCount(womenSalon.toHexString())).toBe(0);
  });

  it('switching providesServices off keeps rating and customers count', async () => {
    const owner = addMember(womenSalon, 'OWNER');
    const member = addMember(womenSalon, 'EMPLOYEE', [], {
      providesServices: true,
      staff: {
        serviceIds: [],
        workingDays: [],
        brideQualified: false,
        rating: { avg: 4.5, count: 12 },
        customersCount: 40,
      },
    });
    const res = await put(owner.headers, member.id, { ...PROFILE, providesServices: false });
    expect(bodyOf(res).data).toMatchObject({
      providesServices: false,
      rating: { avg: 4.5, count: 12 },
      customersCount: 40,
    });
  });

  it.each([
    [
      'a service of another salon',
      (): object => ({ serviceIds: [addService(menSalon)] }),
      'body.serviceIds',
    ],
    [
      'an unknown service',
      (): object => ({ serviceIds: [new Types.ObjectId().toHexString()] }),
      'body.serviceIds',
    ],
    [
      'a duplicate service',
      (): object => {
        const s = addService(womenSalon);
        return { serviceIds: [s, s] };
      },
      'body.serviceIds',
    ],
    [
      'a day the salon is closed',
      (): object => ({ workingDays: [{ day: 'FRI' }] }),
      'body.workingDays.0.day',
    ],
    [
      'the same day twice',
      (): object => ({ workingDays: [{ day: 'SUN' }, { day: 'SUN' }] }),
      'body.workingDays.1.day',
    ],
    [
      'only a start time',
      (): object => ({ workingDays: [{ day: 'SUN', start: '10:00' }] }),
      'body.workingDays.0.start',
    ],
    [
      'hours before the salon opens',
      (): object => ({ workingDays: [{ day: 'SUN', start: '08:00', end: '12:00' }] }),
      'body.workingDays.0.start',
    ],
    [
      'hours after the salon closes',
      (): object => ({ workingDays: [{ day: 'SUN', start: '10:00', end: '19:00' }] }),
      'body.workingDays.0.end',
    ],
    [
      'end not after start',
      (): object => ({ workingDays: [{ day: 'SUN', start: '12:00', end: '12:00' }] }),
      'body.workingDays.0.end',
    ],
    [
      'hours off the 15-minute grid',
      (): object => ({ workingDays: [{ day: 'SUN', start: '10:10', end: '12:00' }] }),
      'body.workingDays.0.start',
    ],
    [
      'bride qualification in a men’s salon',
      (): object => ({ brideQualified: true }),
      'body.brideQualified',
    ],
  ])('rejects %s and saves nothing', async (name, make, field) => {
    const salon = name.includes('men’s') ? menSalon : womenSalon;
    const owner = addMember(salon, 'OWNER');
    const member = addMember(salon, 'EMPLOYEE');
    const res = await put(owner.headers, member.id, { ...PROFILE, ...make() });
    expect(res.status).toBe(400);
    expect(bodyOf(res).error.details.map((d) => d.field)).toContain(field);
    expect(membersM.docs[1]?.['providesServices']).toBe(false);
    expect(recomputes).toHaveLength(0);
  });

  it.each([
    ['bad day', { workingDays: [{ day: 'XXX' }] }],
    ['bad time', { workingDays: [{ day: 'SUN', start: '9', end: '10:00' }] }],
    ['negative experience', { yearsOfExperience: -1 }],
    ['missing flag', { providesServices: undefined }],
    ['long bio', { bio: 'x'.repeat(1001) }],
  ])('validates the body: %s', async (_n, over) => {
    const owner = addMember(womenSalon, 'OWNER');
    const member = addMember(womenSalon, 'EMPLOYEE');
    expect((await put(owner.headers, member.id, { ...PROFILE, ...over })).status).toBe(400);
  });

  it('is scoped to the own salon', async () => {
    const owner = addMember(womenSalon, 'OWNER');
    const foreign = addMember(menSalon, 'EMPLOYEE');
    expect((await put(owner.headers, foreign.id, PROFILE)).status).toBe(404);
    expect(
      (await request(app).get(`/merchant/v1/team/members/${foreign.id}/staff`).set(owner.headers))
        .status,
    ).toBe(404);
  });

  it('previews a profile change: lists affected bookings and saves nothing (SRV-134)', async () => {
    const owner = addMember(womenSalon, 'OWNER');
    const member = addMember(womenSalon, 'EMPLOYEE');
    conflict.list = [{ bookingId: 'b1', startsAt: new Date(), status: 'APPROVED' }];
    const before = JSON.stringify(membersM.docs.find((d) => String(d['_id']) === member.id));
    const res = await request(app)
      .post(`/merchant/v1/team/members/${member.id}/staff/preview`)
      .set(owner.headers)
      .send(PROFILE);
    expect(res.status).toBe(200);
    expect(JSON.stringify(membersM.docs.find((d) => String(d['_id']) === member.id))).toBe(before);
    expect(recomputes).toHaveLength(0);
  });

  it('answers 409 SCHEDULE_CONFLICT with the bookings and saves nothing', async () => {
    const owner = addMember(womenSalon, 'OWNER');
    const member = addMember(womenSalon, 'EMPLOYEE');
    conflict.list = [{ bookingId: 'b1', startsAt: new Date(), status: 'APPROVED' }];
    const res = await put(owner.headers, member.id, PROFILE);
    expect(res.status).toBe(409);
    expect(bodyOf(res).error.code).toBe('SCHEDULE_CONFLICT');
    expect(membersM.docs[1]?.['providesServices']).toBe(false);
  });

  it('answers 503 when unconfigured', async () => {
    expect(
      (
        await request(createApp({ logger })).get(
          `/merchant/v1/team/members/${new Types.ObjectId().toHexString()}/staff`,
        )
      ).status,
    ).toBe(503);
  });
});
