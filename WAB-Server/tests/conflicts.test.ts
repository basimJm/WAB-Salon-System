import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import {
  closureConflicts,
  createConflictFinder,
  deactivationConflicts,
  leaveConflicts,
  noBookings,
  staffConflicts,
  weeklyConflicts,
  type BookingLookup,
  type UpcomingBooking,
} from '../src/domain/salons/conflicts';
import { createHoursService } from '../src/domain/salons/hoursService';
import { createLeavesService } from '../src/domain/team/leaves.service';
import { createStaffService } from '../src/domain/team/staff.service';
import { createTeamService } from '../src/domain/team/team.service';
import { requireAuth } from '../src/middlewares/auth';
import { loadMember } from '../src/middlewares/permission';
import { ClosuresRepository } from '../src/repositories/closures.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { LeavesRepository } from '../src/repositories/leaves.repository';
import { SalonServicesRepository } from '../src/repositories/salonServices.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const TZ = 'Asia/Amman';
// 2026-10-12 is a Monday; Amman is UTC+3, so 09:00 local = 06:00Z.
const at = (day: string, hhmm: string): Date => new Date(`${day}T${hhmm}:00+03:00`);
const booking = (
  id: string,
  staffId: string,
  start: Date,
  end: Date,
  serviceIds: string[] = ['s1'],
  status = 'APPROVED',
): UpcomingBooking => ({
  id,
  status,
  startsAt: start,
  persons: [{ staffId, serviceIds, start, end }],
});
const week = (
  over: Record<string, { isOff?: boolean; open?: string; close?: string }> = {},
): {
  day: 'SAT' | 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI';
  isOff: boolean;
  open: string;
  close: string;
}[] =>
  (['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'] as const).map((day) => ({
    day,
    isOff: false,
    open: '09:00',
    close: '18:00',
    ...over[day],
  }));

describe('weeklyConflicts', () => {
  const monday = booking('b1', 'm1', at('2026-10-12', '10:00'), at('2026-10-12', '11:00'));
  it('breaks a booking on a day that becomes a day off', () => {
    expect(
      weeklyConflicts([monday], week({ MON: { isOff: true } }), TZ).map((c) => c.bookingId),
    ).toEqual(['b1']);
    expect(weeklyConflicts([monday], week(), TZ)).toEqual([]);
  });

  it('breaks bookings outside the new hours; touching the edges is fine', () => {
    const early = booking('e', 'm1', at('2026-10-12', '09:00'), at('2026-10-12', '10:00'));
    const late = booking('l', 'm1', at('2026-10-12', '17:00'), at('2026-10-12', '18:00'));
    expect(weeklyConflicts([early, late], week(), TZ)).toEqual([]);
    expect(
      weeklyConflicts([early, late], week({ MON: { open: '09:15' } }), TZ).map((c) => c.bookingId),
    ).toEqual(['e']);
    expect(
      weeklyConflicts([early, late], week({ MON: { close: '17:45' } }), TZ).map((c) => c.bookingId),
    ).toEqual(['l']);
  });

  it('uses the Amman day: 23:30 local on Sunday is still Sunday although it is Monday in UTC', () => {
    const night = booking(
      'n',
      'm1',
      new Date('2026-10-11T20:30:00Z'),
      new Date('2026-10-11T20:50:00Z'),
    );
    expect(
      weeklyConflicts([night], week({ SUN: { isOff: true }, MON: { isOff: false } }), TZ).map(
        (c) => c.bookingId,
      ),
    ).toEqual(['n']);
  });

  it('a booking that runs past midnight never fits', () => {
    const over = booking('o', 'm1', at('2026-10-12', '23:30'), at('2026-10-13', '00:30'));
    expect(weeklyConflicts([over], week({ MON: { close: '23:45' } }), TZ)).toHaveLength(1);
  });

  it('lists each booking once, soonest first, even with several persons', () => {
    const start = at('2026-10-13', '10:00');
    const group: UpcomingBooking = {
      id: 'g',
      status: 'PENDING',
      startsAt: start,
      persons: [
        { staffId: 'a', serviceIds: [], start, end: at('2026-10-13', '11:00') },
        { staffId: 'b', serviceIds: [], start, end: at('2026-10-13', '11:00') },
      ],
    };
    const result = weeklyConflicts(
      [group, monday],
      week({ MON: { isOff: true }, TUE: { isOff: true } }),
      TZ,
    );
    expect(result.map((c) => c.bookingId)).toEqual(['b1', 'g']);
    expect(result[1]).toMatchObject({ status: 'PENDING', startsAt: start });
  });
});

describe('closureConflicts / leaveConflicts', () => {
  const b = [
    booking('a', 'm1', at('2026-10-12', '10:00'), at('2026-10-12', '11:00')),
    booking('c', 'm2', at('2026-10-14', '10:00'), at('2026-10-14', '11:00')),
  ];
  it('a closure breaks every booking on its days (ends inclusive)', () => {
    expect(
      closureConflicts(b, { from: '2026-10-12', to: '2026-10-12' }, TZ).map((c) => c.bookingId),
    ).toEqual(['a']);
    expect(
      closureConflicts(b, { from: '2026-10-12', to: '2026-10-14' }, TZ).map((c) => c.bookingId),
    ).toEqual(['a', 'c']);
    expect(closureConflicts(b, { from: '2026-10-13', to: '2026-10-13' }, TZ)).toEqual([]);
  });

  it('a leave only breaks that member’s bookings', () => {
    expect(
      leaveConflicts(b, 'm1', { from: '2026-10-12', to: '2026-10-14' }, TZ).map((c) => c.bookingId),
    ).toEqual(['a']);
    expect(leaveConflicts(b, 'm3', { from: '2026-10-12', to: '2026-10-14' }, TZ)).toEqual([]);
  });
});

describe('staffConflicts / deactivationConflicts', () => {
  const b = booking('a', 'm1', at('2026-10-12', '10:00'), at('2026-10-12', '11:00'), ['s1', 's2']);
  const after = {
    providesServices: true,
    serviceIds: ['s1', 's2'],
    workingDays: [{ day: 'MON' as const }],
  };
  it('is fine when nothing the booking needs is removed', () => {
    expect(staffConflicts([b], 'm1', after, TZ)).toEqual([]);
    expect(staffConflicts([b], 'other', { ...after, providesServices: false }, TZ)).toEqual([]);
  });
  it.each([
    ['no longer providing services', { providesServices: false }],
    ['a removed skill', { serviceIds: ['s1'] }],
    ['a removed working day', { workingDays: [{ day: 'TUE' as const }] }],
    [
      'custom hours that no longer cover it',
      { workingDays: [{ day: 'MON' as const, start: '11:00', end: '17:00' }] },
    ],
    [
      'custom hours that end too early',
      { workingDays: [{ day: 'MON' as const, start: '09:00', end: '10:30' }] },
    ],
  ])('breaks the booking after %s', (_n, over) => {
    expect(staffConflicts([b], 'm1', { ...after, ...over }, TZ).map((c) => c.bookingId)).toEqual([
      'a',
    ]);
  });
  it('custom hours that cover the booking are fine', () => {
    expect(
      staffConflicts(
        [b],
        'm1',
        { ...after, workingDays: [{ day: 'MON', start: '10:00', end: '11:00' }] },
        TZ,
      ),
    ).toEqual([]);
  });
  it('deactivation breaks every booking of the member', () => {
    expect(deactivationConflicts([b], 'm1')).toHaveLength(1);
    expect(deactivationConflicts([b], 'm2')).toEqual([]);
  });
});

describe('wired into the services', () => {
  const logger = createLogger({ level: 'silent' });
  const SECRET = 'a'.repeat(48);
  const salonId = new Types.ObjectId();
  const salonsM = createFakeModel();
  const closuresM = createFakeModel();
  const membersM = createFakeModel();
  const leavesM = createFakeModel();
  const servicesM = createFakeModel();
  const NOW = new Date('2026-10-10T08:00:00Z');
  const lookup: BookingLookup & {
    list: UpcomingBooking[];
    asked: { salonId: string; from: Date }[];
  } = {
    list: [],
    asked: [],
    upcomingForSalon(id, from) {
      this.asked.push({ salonId: id, from });
      return Promise.resolve(this.list);
    },
  };
  const settings = { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) };
  const finder = createConflictFinder({ bookings: lookup, settings, now: () => NOW });
  const members = new MembersRepository(membersM.model as never);
  const state = {
    recompute: (id: string) =>
      Promise.resolve({ salonId: id, state: 'LIVE' as const, missing: [], isComplete: true }),
  };
  const app = createApp({
    logger,
    services: {
      hours: createHoursService({
        salons: new SalonsRepository(salonsM.model as never),
        closures: new ClosuresRepository(closuresM.model as never),
        settings,
        state,
        conflicts: finder.schedule,
        now: () => NOW,
      }),
      leaves: createLeavesService({
        leaves: new LeavesRepository(leavesM.model as never),
        members,
        settings,
        conflicts: finder.leave,
        now: () => NOW,
      }),
      staff: createStaffService({
        members,
        salons: new SalonsRepository(salonsM.model as never),
        salonServices: new SalonServicesRepository(servicesM.model as never),
        settings,
        state,
        conflicts: {
          check: ({ salonId: s, memberId, after }) =>
            finder.staff.check({ salonId: s, memberId, after }),
        },
      }),
      team: createTeamService({
        members,
        lifecycle: {
          deactivateMember: () => Promise.resolve(),
          reactivateMember: () => Promise.resolve(),
        },
        phones: { resolve: () => Promise.reject(new Error('x')) },
        storage: { getPublicUrl: (k: string) => k },
        uploads: { assertConfirmed: () => Promise.resolve() },
        files: {
          replace: () => Promise.reject(new Error('unused')),
          remove: () => Promise.resolve(),
        },
        deactivationConflicts: finder.deactivation,
      }),
      salonProfile: {
        service: undefined as never,
        guard: [requireAuth('merchant', SECRET), loadMember(members)],
      },
    },
  });
  const owner = (): { id: string; headers: Record<string, string> } => {
    const _id = new Types.ObjectId();
    membersM.docs.push({
      _id,
      salonId,
      role: 'OWNER',
      permissions: [],
      active: true,
      firstName: 'O',
      lastName: 'W',
      phone: '+962790000001',
    });
    return {
      id: _id.toHexString(),
      headers: {
        Authorization: `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'MEMBER', subjectId: _id.toHexString(), ttlSec: 600 }).token}`,
      },
    };
  };

  beforeEach(() => {
    for (const f of [salonsM, closuresM, membersM, leavesM, servicesM]) f.docs.length = 0;
    lookup.list = [];
    lookup.asked.length = 0;
    salonsM.docs.push({
      _id: salonId,
      name: 'Glow',
      businessType: 'SALON',
      audience: 'FEMALE',
      weeklySchedule: week(),
    });
  });

  it('no bookings: nothing is blocked (and the lookup is asked for the right salon and time)', async () => {
    const o = owner();
    const res = await request(app)
      .post('/merchant/v1/salon/hours/closures')
      .set(o.headers)
      .send({ from: '2026-10-20', to: '2026-10-21', reason: 'Trip' });
    expect(res.status).toBe(201);
    expect(lookup.asked[0]).toEqual({ salonId: salonId.toHexString(), from: NOW });
    expect(createConflictFinder({ bookings: noBookings, settings }).schedule).toBeDefined();
  });

  it('a closure over a booked day is a 409 SCHEDULE_CONFLICT listing the booking, nothing saved', async () => {
    const o = owner();
    lookup.list = [booking('bk1', 'm1', at('2026-10-20', '10:00'), at('2026-10-20', '11:00'))];
    const res = await request(app)
      .post('/merchant/v1/salon/hours/closures')
      .set(o.headers)
      .send({ from: '2026-10-20', to: '2026-10-21', reason: 'Trip' });
    expect(res.status).toBe(409);
    expect(
      (res.body as { error: { code: string; details: { field: string }[] } }).error.details.map(
        (d) => d.field,
      ),
    ).toEqual(['bk1']);
    expect(closuresM.docs).toHaveLength(0);
  });

  it('a weekly change, a leave, a staff change and a deactivation are each stopped by a real booking', async () => {
    const o = owner();
    const staff = new Types.ObjectId();
    membersM.docs.push({
      _id: staff,
      salonId,
      role: 'EMPLOYEE',
      active: true,
      providesServices: true,
      firstName: 'S',
      lastName: 'T',
      phone: '+962790000002',
    });
    lookup.list = [
      booking('bk2', staff.toHexString(), at('2026-10-12', '10:00'), at('2026-10-12', '11:00')),
    ];
    const weekly = await request(app)
      .put('/merchant/v1/salon/hours/weekly')
      .set(o.headers)
      .send({ days: week({ MON: { isOff: true } }) });
    expect(weekly.status).toBe(409);
    const leave = await request(app)
      .post(`/merchant/v1/team/members/${staff.toHexString()}/leaves`)
      .set(o.headers)
      .send({ from: '2026-10-12', to: '2026-10-12' });
    expect(leave.status).toBe(409);
    const change = await request(app)
      .put(`/merchant/v1/team/members/${staff.toHexString()}/staff`)
      .set(o.headers)
      .send({ providesServices: false, serviceIds: [], brideQualified: false, workingDays: [] });
    expect(change.status).toBe(409);
    const off = await request(app)
      .post(`/merchant/v1/team/members/${staff.toHexString()}/deactivate`)
      .set(o.headers);
    expect(off.status).toBe(409);
    expect(membersM.docs[1]?.['providesServices']).toBe(true);
    // The same changes are fine for a member who has no booking.
    lookup.list = [];
    expect(
      (
        await request(app)
          .post(`/merchant/v1/team/members/${staff.toHexString()}/deactivate`)
          .set(o.headers)
      ).status,
    ).toBe(200);
  });
});
