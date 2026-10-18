import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createLeavesService, type LeaveConflicts } from '../src/domain/team/leaves.service';
import { requireAuth } from '../src/middlewares/auth';
import { loadMember } from '../src/middlewares/permission';
import { LeavesRepository } from '../src/repositories/leaves.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const salonId = new Types.ObjectId();
const otherSalon = new Types.ObjectId();
const leavesM = createFakeModel();
const membersM = createFakeModel();
const members = new MembersRepository(membersM.model as never);
const conflict = {
  list: [] as { bookingId: string; startsAt: Date; status: string }[],
  seen: [] as object[],
};
const conflicts: LeaveConflicts = {
  check: (input) => {
    conflict.seen.push(input);
    return Promise.resolve(conflict.list);
  },
};
const NOW = new Date('2026-10-12T08:00:00Z'); // Monday 2026-10-12 in Amman
const app = createApp({
  logger,
  services: {
    leaves: createLeavesService({
      leaves: new LeavesRepository(leavesM.model as never),
      members,
      settings: { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) },
      conflicts,
      now: () => NOW,
    }),
    salonProfile: {
      service: undefined as never,
      guard: [requireAuth('merchant', SECRET), loadMember(members)],
    },
  },
});

interface Body {
  data: Record<string, unknown> & Record<string, unknown>[];
  error: { code: string; details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const add = (
  salon: Types.ObjectId,
  role: string,
  permissions: string[] = [],
): { id: string; headers: Record<string, string> } => {
  const _id = new Types.ObjectId();
  membersM.docs.push({
    _id,
    salonId: salon,
    role,
    permissions,
    active: true,
    firstName: 'A',
    lastName: 'B',
    phone: '+962790000000',
  });
  return {
    id: _id.toHexString(),
    headers: {
      Authorization: `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'MEMBER', subjectId: _id.toHexString(), ttlSec: 600 }).token}`,
    },
  };
};
const url = (member: string, leave?: string): string =>
  `/merchant/v1/team/members/${member}/leaves${leave === undefined ? '' : `/${leave}`}`;
const addLeave = (memberId: string, over: Record<string, unknown> = {}): string => {
  const _id = new Types.ObjectId();
  leavesM.docs.push({
    _id,
    memberId: new Types.ObjectId(memberId),
    salonId,
    from: '2026-10-20',
    to: '2026-10-22',
    ...over,
  });
  return _id.toHexString();
};

beforeEach(() => {
  leavesM.docs.length = 0;
  membersM.docs.length = 0;
  conflict.list = [];
  conflict.seen.length = 0;
});

describe('staff leaves', () => {
  it('needs STAFF_MANAGE', async () => {
    const employee = add(salonId, 'EMPLOYEE', ['REVIEWS_VIEW']);
    expect((await request(app).get(url(employee.id)).set(employee.headers)).status).toBe(403);
    expect((await request(app).get(url(employee.id))).status).toBe(401);
    const manager = add(salonId, 'MANAGER', ['STAFF_MANAGE']);
    expect((await request(app).get(url(employee.id)).set(manager.headers)).status).toBe(200);
  });

  it('adds a leave (today counts, inclusive end) and lists upcoming ones only', async () => {
    const owner = add(salonId, 'OWNER');
    const staff = add(salonId, 'EMPLOYEE');
    const res = await request(app)
      .post(url(staff.id))
      .set(owner.headers)
      .send({ from: '2026-10-12', to: '2026-10-14', note: 'Vacation' });
    expect(res.status).toBe(201);
    expect(bodyOf(res).data).toMatchObject({
      from: '2026-10-12',
      to: '2026-10-14',
      note: 'Vacation',
      editable: false,
      memberId: staff.id,
    });
    addLeave(staff.id, { from: '2026-09-01', to: '2026-09-05' });
    addLeave(staff.id, { from: '2026-11-01', to: '2026-11-03' });
    const list = await request(app).get(url(staff.id)).set(owner.headers);
    expect(bodyOf(list).data.map((l) => l['from'])).toEqual(['2026-10-12', '2026-11-01']);
    expect(String(leavesM.docs[0]?.['salonId'])).toBe(salonId.toHexString());
    expect(conflict.seen[0]).toMatchObject({
      salonId: salonId.toHexString(),
      memberId: staff.id,
      from: '2026-10-12',
      to: '2026-10-14',
    });
  });

  it.each([
    ['in the past', { from: '2026-10-11', to: '2026-10-13' }],
    ['end before start', { from: '2026-10-15', to: '2026-10-14' }],
    ['not a real date', { from: '2026-02-30', to: '2026-03-01' }],
    ['a long note', { from: '2026-10-15', to: '2026-10-16', note: 'x'.repeat(301) }],
    ['a missing end', { from: '2026-10-15' }],
  ])('rejects %s', async (_n, body) => {
    const owner = add(salonId, 'OWNER');
    const staff = add(salonId, 'EMPLOYEE');
    expect((await request(app).post(url(staff.id)).set(owner.headers).send(body)).status).toBe(400);
    expect(leavesM.docs).toHaveLength(0);
  });

  it('answers 409 SCHEDULE_CONFLICT with the bookings and saves nothing', async () => {
    const owner = add(salonId, 'OWNER');
    const staff = add(salonId, 'EMPLOYEE');
    conflict.list = [{ bookingId: 'b7', startsAt: NOW, status: 'APPROVED' }];
    const res = await request(app)
      .post(url(staff.id))
      .set(owner.headers)
      .send({ from: '2026-10-15', to: '2026-10-16' });
    expect(res.status).toBe(409);
    expect(bodyOf(res).error.code).toBe('SCHEDULE_CONFLICT');
    expect(bodyOf(res).error.details.map((d) => d.field)).toEqual(['b7']);
    expect(leavesM.docs).toHaveLength(0);
  });

  it('edits and removes only leaves that have not started; the note can be cleared', async () => {
    const owner = add(salonId, 'OWNER');
    const staff = add(salonId, 'EMPLOYEE');
    const future = addLeave(staff.id, { note: 'old' });
    const started = addLeave(staff.id, { from: '2026-10-12', to: '2026-10-14' });
    const edited = await request(app)
      .patch(url(staff.id, future))
      .set(owner.headers)
      .send({ to: '2026-10-25', note: null });
    expect(edited.status).toBe(200);
    expect(bodyOf(edited).data).toMatchObject({ to: '2026-10-25', note: null });
    expect(
      (
        await request(app)
          .patch(url(staff.id, future))
          .set(owner.headers)
          .send({ to: '2026-10-19' })
      ).status,
    ).toBe(400);
    expect(
      (await request(app).patch(url(staff.id, future)).set(owner.headers).send({})).status,
    ).toBe(400);
    expect(
      (await request(app).patch(url(staff.id, started)).set(owner.headers).send({ note: 'x' }))
        .status,
    ).toBe(422);
    expect((await request(app).delete(url(staff.id, started)).set(owner.headers)).status).toBe(422);
    expect((await request(app).delete(url(staff.id, future)).set(owner.headers)).status).toBe(200);
    expect(leavesM.docs.map((d) => String(d['_id']))).toEqual([started]);
  });

  it('a leave of another member or salon is 404', async () => {
    const owner = add(salonId, 'OWNER');
    const staff = add(salonId, 'EMPLOYEE');
    const colleague = add(salonId, 'EMPLOYEE');
    const foreign = add(otherSalon, 'EMPLOYEE');
    const leave = addLeave(colleague.id);
    expect(
      (await request(app).patch(url(staff.id, leave)).set(owner.headers).send({ note: 'x' }))
        .status,
    ).toBe(404);
    expect((await request(app).delete(url(staff.id, leave)).set(owner.headers)).status).toBe(404);
    expect((await request(app).get(url(foreign.id)).set(owner.headers)).status).toBe(404);
    expect(
      (
        await request(app)
          .post(url(foreign.id))
          .set(owner.headers)
          .send({ from: '2026-10-15', to: '2026-10-16' })
      ).status,
    ).toBe(404);
    expect(leavesM.docs).toHaveLength(1);
  });

  it('answers 503 when unconfigured', async () => {
    expect(
      (await request(createApp({ logger })).get(url(new Types.ObjectId().toHexString()))).status,
    ).toBe(503);
  });
});
