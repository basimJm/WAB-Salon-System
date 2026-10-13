import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { todaysHours, closureOn } from '../src/domain/salons/hours';
import { createHoursService, type ScheduleConflicts } from '../src/domain/salons/hoursService';
import { requireAuth } from '../src/middlewares/auth';
import { loadMember } from '../src/middlewares/permission';
import { ClosuresRepository } from '../src/repositories/closures.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import type { DayOfWeek } from '../src/constants/time';
import { dayOfWeek } from '../src/utils/time';
import { createFakeModel } from './helpers/fakeModel';

const TZ = 'Asia/Amman';
type Day = { day: DayOfWeek; isOff: boolean; open: string; close: string };
const week = (
  over: Record<string, { isOff?: boolean; open?: string; close?: string }> = {},
): Day[] =>
  (['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'] as const).map((day) => ({
    day,
    isOff: false,
    open: '09:00',
    close: '18:00',
    ...over[day],
  }));

describe('todaysHours (Asia/Amman)', () => {
  // 2026-10-12 is a Monday.
  it('knows the weekday used below', () => {
    expect(dayOfWeek('2026-10-12')).toBe('MON');
  });

  it('is open from open (inclusive) to close (exclusive), in Amman time', () => {
    const at = (iso: string): ReturnType<typeof todaysHours> =>
      todaysHours(week(), [], new Date(iso), TZ);
    expect(at('2026-10-12T05:59:00Z').isOpenNow).toBe(false); // 08:59
    expect(at('2026-10-12T06:00:00Z')).toMatchObject({
      isOpenNow: true,
      open: '09:00',
      close: '18:00',
      date: '2026-10-12',
    });
    expect(at('2026-10-12T14:59:59Z').isOpenNow).toBe(true); // 17:59:59
    expect(at('2026-10-12T15:00:00Z').isOpenNow).toBe(false); // 18:00
  });

  it('rolls to the next local day at 21:00 UTC (midnight in Amman)', () => {
    const schedule = week({ MON: { isOff: true } });
    expect(todaysHours(schedule, [], new Date('2026-10-12T20:59:59Z'), TZ)).toMatchObject({
      date: '2026-10-12',
      isClosed: true,
    });
    expect(todaysHours(schedule, [], new Date('2026-10-12T21:00:00Z'), TZ)).toMatchObject({
      date: '2026-10-13',
      isClosed: false,
    });
  });

  it('a day off or an exceptional closure closes the day, the closure reason wins', () => {
    const off = todaysHours(
      week({ MON: { isOff: true } }),
      [],
      new Date('2026-10-12T08:00:00Z'),
      TZ,
    );
    expect(off).toMatchObject({ isClosed: true, closedReason: null, open: null, isOpenNow: false });
    const closure = [{ from: '2026-10-10', to: '2026-10-12', reason: 'Holiday' }];
    const closed = todaysHours(week(), closure, new Date('2026-10-12T08:00:00Z'), TZ);
    expect(closed).toMatchObject({ isClosed: true, closedReason: 'Holiday', isOpenNow: false });
    expect(todaysHours(week(), closure, new Date('2026-10-13T08:00:00Z'), TZ).isClosed).toBe(false);
  });

  it('closure ends are inclusive', () => {
    const c = [{ from: '2026-10-10', to: '2026-10-12', reason: 'r' }];
    expect(closureOn('2026-10-10', c)).toBeDefined();
    expect(closureOn('2026-10-12', c)).toBeDefined();
    expect(closureOn('2026-10-09', c)).toBeUndefined();
    expect(closureOn('2026-10-13', c)).toBeUndefined();
  });
});

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const salonId = new Types.ObjectId();
const salons = createFakeModel();
const closures = createFakeModel();
const members = createFakeModel();
const recomputes: string[] = [];
const conflict = { list: [] as { bookingId: string; startsAt: Date; status: string }[] };
const conflicts: ScheduleConflicts = {
  weekly: () => Promise.resolve(conflict.list),
  closure: () => Promise.resolve(conflict.list),
};
const NOW = new Date('2026-10-12T08:00:00Z');
const app = createApp({
  logger,
  services: {
    hours: createHoursService({
      salons: new SalonsRepository(salons.model as never),
      closures: new ClosuresRepository(closures.model as never),
      settings: { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) },
      state: {
        recompute: (id) => {
          recomputes.push(id);
          return Promise.resolve({ salonId: id, state: 'LIVE', missing: [], isComplete: true });
        },
      },
      conflicts,
      now: () => NOW,
    }),
    salonProfile: {
      service: undefined as never,
      guard: [
        requireAuth('merchant', SECRET),
        loadMember(new MembersRepository(members.model as never)),
      ],
    },
  },
});

interface Body {
  data: {
    weeklySchedule: { day: string; isOff: boolean; open: string; close: string }[];
    closures: { id: string; from: string; to: string; editable: boolean }[];
    today: { isOpenNow: boolean; isClosed: boolean; closedReason: string | null };
    id: string;
  };
  error: { code: string; details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const owner = (): Record<string, string> => {
  const _id = new Types.ObjectId();
  members.docs.push({ _id, salonId, role: 'OWNER', permissions: [], active: true });
  return {
    Authorization: `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'MEMBER', subjectId: _id.toHexString(), ttlSec: 600 }).token}`,
  };
};
const days = (over: Record<string, object> = {}): { days: object[] } => ({ days: week(over) });

beforeEach(() => {
  salons.docs.length = 0;
  closures.docs.length = 0;
  members.docs.length = 0;
  recomputes.length = 0;
  conflict.list = [];
  salons.docs.push({ _id: salonId, name: 'Glow', weeklySchedule: week({ SAT: { isOff: true } }) });
});

describe('weekly schedule', () => {
  it('needs WORKING_HOURS_MANAGE', async () => {
    const _id = new Types.ObjectId();
    members.docs.push({ _id, salonId, role: 'EMPLOYEE', permissions: [], active: true });
    const token = signAccessToken({
      secret: SECRET,
      subjectType: 'MEMBER',
      subjectId: _id.toHexString(),
      ttlSec: 600,
    }).token;
    expect(
      (await request(app).get('/merchant/v1/salon/hours').set('Authorization', `Bearer ${token}`))
        .status,
    ).toBe(403);
    expect((await request(app).get('/merchant/v1/salon/hours')).status).toBe(401);
  });

  it('shows the schedule, upcoming closures and today’s status', async () => {
    closures.docs.push(
      { _id: new Types.ObjectId(), salonId, from: '2026-10-20', to: '2026-10-22', reason: 'Trip' },
      { _id: new Types.ObjectId(), salonId, from: '2026-09-01', to: '2026-09-02', reason: 'Past' },
    );
    const res = await request(app).get('/merchant/v1/salon/hours').set(owner());
    expect(res.status).toBe(200);
    expect(bodyOf(res).data.closures).toEqual([
      {
        id: expect.any(String) as string,
        from: '2026-10-20',
        to: '2026-10-22',
        reason: 'Trip',
        editable: true,
      },
    ]);
    expect(bodyOf(res).data.today).toMatchObject({ isClosed: false, isOpenNow: true });
  });

  it('saves a full week in Saturday→Friday order and recomputes completeness', async () => {
    const shuffled = week({
      MON: { open: '10:00', close: '20:30' },
      FRI: { isOff: true },
    }).reverse();
    const res = await request(app)
      .put('/merchant/v1/salon/hours/weekly')
      .set(owner())
      .send({ days: shuffled });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data.weeklySchedule.map((d) => d.day)).toEqual([
      'SAT',
      'SUN',
      'MON',
      'TUE',
      'WED',
      'THU',
      'FRI',
    ]);
    expect(bodyOf(res).data.weeklySchedule[2]).toMatchObject({ open: '10:00', close: '20:30' });
    expect(recomputes).toEqual([salonId.toHexString()]);
  });

  it.each([
    ['close not after open', { MON: { open: '12:00', close: '12:00' } }, 'body.days.2.close'],
    ['close before open', { TUE: { open: '18:00', close: '09:00' } }, 'body.days.3.close'],
    ['not on the 15-minute grid', { WED: { open: '09:10' } }, 'body.days.4.open'],
  ])('rejects %s', async (_n, over, field) => {
    const res = await request(app)
      .put('/merchant/v1/salon/hours/weekly')
      .set(owner())
      .send(days(over));
    expect(res.status).toBe(400);
    expect(bodyOf(res).error.details.map((d) => d.field)).toContain(field);
  });

  it('ignores times of a day that is off, but needs valid HH:mm, seven distinct days', async () => {
    const off = await request(app)
      .put('/merchant/v1/salon/hours/weekly')
      .set(owner())
      .send(days({ MON: { isOff: true, open: '12:00', close: '12:00' } }));
    expect(off.status).toBe(200);
    const six = week().slice(1);
    expect(
      (await request(app).put('/merchant/v1/salon/hours/weekly').set(owner()).send({ days: six }))
        .status,
    ).toBe(400);
    const dup = week();
    dup[1] = { day: 'SAT', isOff: false, open: '09:00', close: '18:00' };
    expect(
      (await request(app).put('/merchant/v1/salon/hours/weekly').set(owner()).send({ days: dup }))
        .status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .put('/merchant/v1/salon/hours/weekly')
          .set(owner())
          .send(days({ MON: { open: '9am' } }))
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .put('/merchant/v1/salon/hours/weekly')
          .set(owner())
          .send(days({ MON: { close: '24:00' } }))
      ).status,
    ).toBe(400);
  });

  it('answers 409 SCHEDULE_CONFLICT with the bookings and saves nothing', async () => {
    conflict.list = [{ bookingId: 'b1', startsAt: NOW, status: 'APPROVED' }];
    const res = await request(app)
      .put('/merchant/v1/salon/hours/weekly')
      .set(owner())
      .send(days({ MON: { isOff: true } }));
    expect(res.status).toBe(409);
    expect(bodyOf(res).error.code).toBe('SCHEDULE_CONFLICT');
    expect(bodyOf(res).error.details.map((d) => d.field)).toEqual(['b1']);
    expect((salons.docs[0]?.['weeklySchedule'] as { isOff: boolean }[])[0]?.isOff).toBe(true);
    expect(recomputes).toHaveLength(0);
  });
});

describe('closures', () => {
  const add = async (body: object, headers = owner()): Promise<{ status: number; body: unknown }> =>
    await request(app).post('/merchant/v1/salon/hours/closures').set(headers).send(body);

  it('adds a closure (today counts, inclusive end) and it closes those days', async () => {
    const res = await add({ from: '2026-10-12', to: '2026-10-14', reason: 'Renovation' });
    expect(res.status).toBe(201);
    expect(bodyOf(res).data).toMatchObject({
      from: '2026-10-12',
      to: '2026-10-14',
      editable: false,
    });
    const hours = await request(app).get('/merchant/v1/salon/hours').set(owner());
    expect(bodyOf(hours).data.today).toMatchObject({
      isClosed: true,
      closedReason: 'Renovation',
      isOpenNow: false,
    });
  });

  it.each([
    ['in the past', { from: '2026-10-11', to: '2026-10-13', reason: 'x' }],
    ['end before start', { from: '2026-10-15', to: '2026-10-14', reason: 'x' }],
    ['blank reason', { from: '2026-10-15', to: '2026-10-16', reason: ' ' }],
    ['not a real date', { from: '2026-02-30', to: '2026-03-01', reason: 'x' }],
    ['long reason', { from: '2026-10-15', to: '2026-10-16', reason: 'x'.repeat(301) }],
  ])('rejects %s', async (_n, body) => {
    expect((await add(body)).status).toBe(400);
    expect(closures.docs).toHaveLength(0);
  });

  it('a conflict with bookings stops the closure with the list', async () => {
    conflict.list = [{ bookingId: 'b9', startsAt: NOW, status: 'PENDING' }];
    const res = await add({ from: '2026-10-15', to: '2026-10-16', reason: 'x' });
    expect(res.status).toBe(409);
    expect(closures.docs).toHaveLength(0);
  });

  it('edits and deletes only closures that have not started, only in the own salon', async () => {
    const future = new Types.ObjectId();
    const started = new Types.ObjectId();
    const foreign = new Types.ObjectId();
    closures.docs.push(
      { _id: future, salonId, from: '2026-10-20', to: '2026-10-22', reason: 'Trip' },
      { _id: started, salonId, from: '2026-10-12', to: '2026-10-14', reason: 'Now' },
      {
        _id: foreign,
        salonId: new Types.ObjectId(),
        from: '2026-10-20',
        to: '2026-10-22',
        reason: 'Other',
      },
    );
    const headers = owner();
    const edited = await request(app)
      .patch(`/merchant/v1/salon/hours/closures/${future.toHexString()}`)
      .set(headers)
      .send({ to: '2026-10-25', reason: 'Longer' });
    expect(edited.status).toBe(200);
    expect(closures.docs[0]).toMatchObject({
      from: '2026-10-20',
      to: '2026-10-25',
      reason: 'Longer',
    });
    expect(
      (
        await request(app)
          .patch(`/merchant/v1/salon/hours/closures/${future.toHexString()}`)
          .set(headers)
          .send({ to: '2026-10-19' })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .patch(`/merchant/v1/salon/hours/closures/${started.toHexString()}`)
          .set(headers)
          .send({ reason: 'x' })
      ).status,
    ).toBe(422);
    expect(
      (
        await request(app)
          .delete(`/merchant/v1/salon/hours/closures/${started.toHexString()}`)
          .set(headers)
      ).status,
    ).toBe(422);
    expect(
      (
        await request(app)
          .delete(`/merchant/v1/salon/hours/closures/${foreign.toHexString()}`)
          .set(headers)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .patch(`/merchant/v1/salon/hours/closures/${foreign.toHexString()}`)
          .set(headers)
          .send({ reason: 'x' })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .delete(`/merchant/v1/salon/hours/closures/${future.toHexString()}`)
          .set(headers)
      ).status,
    ).toBe(200);
    expect(closures.docs.map((d) => d['reason'])).toEqual(['Now', 'Other']);
    expect(
      (
        await request(app)
          .patch(`/merchant/v1/salon/hours/closures/${future.toHexString()}`)
          .set(headers)
          .send({})
      ).status,
    ).toBe(400);
  });

  it('answers 503 when unconfigured', async () => {
    expect((await request(createApp({ logger })).get('/merchant/v1/salon/hours')).status).toBe(503);
  });
});
