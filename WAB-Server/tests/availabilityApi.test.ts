import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createAvailabilityService } from '../src/domain/availability/availability.service';
import type { BusyInterval } from '../src/domain/availability/availability';
import { requireAuth } from '../src/middlewares/auth';
import { ClosuresRepository } from '../src/repositories/closures.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { LeavesRepository } from '../src/repositories/leaves.repository';
import { SalonServicesRepository } from '../src/repositories/salonServices.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
// Monday 2026-10-12 11:00 in Amman.
const NOW = new Date('2026-10-12T08:00:00Z');
const m = {
  salons: createFakeModel(),
  members: createFakeModel(),
  services: createFakeModel(),
  closures: createFakeModel(),
  leaves: createFakeModel(),
};
const state = {
  booked: [] as BusyInterval[],
  held: [] as BusyInterval[],
  asked: [] as { exceptDraftId?: string | undefined; staffIds: readonly string[] }[],
};
const app = createApp({
  logger,
  services: {
    availability: createAvailabilityService({
      salons: new SalonsRepository(m.salons.model as never),
      members: new MembersRepository(m.members.model as never),
      salonServices: new SalonServicesRepository(m.services.model as never),
      closures: new ClosuresRepository(m.closures.model as never),
      leaves: new LeavesRepository(m.leaves.model as never),
      bookings: { busy: () => Promise.resolve(state.booked) },
      holds: {
        busy: (input) => {
          state.asked.push({ exceptDraftId: input.exceptDraftId, staffIds: input.staffIds });
          return Promise.resolve(state.held);
        },
      },
      settings: {
        get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]),
      },
      now: () => NOW,
    }),
    installations: {
      service: undefined as never,
      customerOptional: requireAuth('customer', SECRET),
      customerRequired: requireAuth('customer', SECRET),
      merchantRequired: requireAuth('merchant', SECRET),
    },
  },
});

interface Slot {
  start: string;
  available: boolean;
  eligibleStaffIds: string[];
}
interface Body {
  data: { date: string; reason: string | null; durationMinutes: number; slots: Slot[] };
  error: { code: string; details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const id = (): Types.ObjectId => new Types.ObjectId();
const token = (): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'CUSTOMER', subjectId: id().toHexString(), ttlSec: 600 }).token}`;
const salonId = id();
const cut = id();
const color = id();
const vip = id();
const foreignService = id();
const staffA = id();
const staffB = id();
const week = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'].map((day) => ({
  day,
  isOff: day === 'FRI',
  open: '09:00',
  close: '18:00',
}));
const profile = (serviceIds: Types.ObjectId[], over: Record<string, unknown> = {}): object => ({
  serviceIds,
  brideQualified: false,
  workingDays: week.map((d) => ({ day: d.day })),
  rating: { avg: 0, count: 0 },
  ...over,
});
const amman = (date: string, hhmm: string): Date => new Date(`${date}T${hhmm}:00+03:00`);
const ask = (body: object, path = salonId.toHexString(), auth = token()): request.Test =>
  request(app)
    .post(`/customer/v1/salons/${path}/availability`)
    .set('Authorization', auth)
    .send(body);
const person = (serviceIds: Types.ObjectId[], over: Record<string, unknown> = {}): object => ({
  serviceIds: serviceIds.map((s) => s.toHexString()),
  ...over,
});
const DATE = '2026-10-13';

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  state.booked = [];
  state.held = [];
  state.asked = [];
  m.salons.docs.push({
    _id: salonId,
    businessType: 'SALON',
    audience: 'FEMALE',
    state: 'LIVE',
    completeness: { missing: [], isComplete: true },
    weeklySchedule: week,
  });
  for (const [_id, durationMinutes, brideOnly] of [
    [cut, 45, false],
    [color, 75, false],
    [vip, 60, true],
  ] as const) {
    m.services.docs.push({ _id, salonId, active: true, durationMinutes, brideOnly, price: 1000 });
  }
  m.services.docs.push({
    _id: foreignService,
    salonId: id(),
    active: true,
    durationMinutes: 30,
    brideOnly: false,
    price: 1000,
  });
  m.members.docs.push(
    { _id: staffA, salonId, active: true, providesServices: true, staff: profile([cut, color]) },
    {
      _id: staffB,
      salonId,
      active: true,
      providesServices: true,
      staff: profile([cut, vip], { brideQualified: true }),
    },
  );
});

describe('POST /customer/v1/salons/:salonId/availability', () => {
  it('returns slots for the summed duration with the free staff per slot', async () => {
    const res = await ask({ date: DATE, person: person([cut, color]) });
    expect(res.status).toBe(200);
    const d = bodyOf(res).data;
    expect(d).toMatchObject({ date: DATE, reason: null, durationMinutes: 120 });
    expect(d.slots[0]).toMatchObject({
      start: amman(DATE, '09:00').toISOString(),
      available: true,
      eligibleStaffIds: [staffA.toHexString()], // only staff A can do both services
    });
    // 120 minutes must end by 18:00.
    expect(d.slots.at(-1)?.start).toBe(amman(DATE, '16:00').toISOString());
  });

  it('a bride sees only bride-qualified staff and may book bride-only services', async () => {
    const res = await ask({ date: DATE, person: person([cut], { isBride: true }) });
    expect(bodyOf(res).data.slots[0]?.eligibleStaffIds).toEqual([staffB.toHexString()]);
    const notBride = bodyOf(await ask({ date: DATE, person: person([vip]) })).data;
    expect(notBride.slots.every((s) => !s.available)).toBe(true);
    const bride = bodyOf(await ask({ date: DATE, person: person([vip], { isBride: true }) })).data;
    expect(bride.slots[0]?.eligibleStaffIds).toEqual([staffB.toHexString()]);
  });

  it('bookings, live holds and the other persons’ picks block their staff', async () => {
    state.booked = [
      { staffId: staffA.toHexString(), start: amman(DATE, '09:00'), end: amman(DATE, '10:00') },
    ];
    state.held = [
      { staffId: staffB.toHexString(), start: amman(DATE, '09:00'), end: amman(DATE, '09:45') },
    ];
    const first = bodyOf(await ask({ date: DATE, person: person([cut]) })).data.slots[0];
    expect(first).toMatchObject({ available: false, eligibleStaffIds: [] });
    const others = [
      { staffId: staffB.toHexString(), start: amman(DATE, '10:00'), end: amman(DATE, '10:45') },
    ];
    const at1000 = bodyOf(await ask({ date: DATE, person: person([cut]), others })).data.slots.find(
      (s) => s.start === amman(DATE, '10:00').toISOString(),
    );
    expect(at1000?.eligibleStaffIds).toEqual([staffA.toHexString()]);
  });

  it('does not let the caller’s own draft hold block it', async () => {
    const draftId = id().toHexString();
    await ask({ date: DATE, person: person([cut]), draftId });
    expect(state.asked[0]?.exceptDraftId).toBe(draftId);
    expect(state.asked[0]?.staffIds).toHaveLength(2);
  });

  it('a chosen staff member restricts the answer', async () => {
    const res = await ask({
      date: DATE,
      person: person([cut], { staffId: staffA.toHexString() }),
    });
    expect(bodyOf(res).data.slots[0]?.eligibleStaffIds).toEqual([staffA.toHexString()]);
  });

  it('explains days without slots', async () => {
    const reason = async (date: string): Promise<string | null> =>
      bodyOf(await ask({ date, person: person([cut]) })).data.reason;
    expect(await reason('2026-10-11')).toBe('PAST');
    expect(await reason('2026-10-16')).toBe('CLOSED');
    expect(await reason('2027-01-11')).toBe('TOO_FAR');
    m.closures.docs.push({ _id: id(), salonId, from: DATE, to: DATE, reason: 'Eid' });
    expect(await reason(DATE)).toBe('CLOSED');
  });

  it('leaves take staff out for that day', async () => {
    m.leaves.docs.push({ _id: id(), salonId, memberId: staffA, from: DATE, to: DATE });
    const res = await ask({ date: DATE, person: person([cut]) });
    expect(bodyOf(res).data.slots[0]?.eligibleStaffIds).toEqual([staffB.toHexString()]);
  });

  it.each([
    ['an unknown service', { person: person([id()]) }],
    ['a service of another salon', { person: person([foreignService]) }],
    ['a repeated service', { person: person([cut, cut]) }],
    ['no services', { person: person([]) }],
    ['a staff member of another salon', { person: person([cut], { staffId: id().toHexString() }) }],
    [
      'a pick of unknown staff',
      {
        person: person([cut]),
        others: [{ staffId: id().toHexString(), start: DATE, end: '2026-10-14' }],
      },
    ],
    [
      'an inverted pick',
      {
        person: person([cut]),
        others: [{ staffId: staffA.toHexString(), start: '2026-10-14', end: DATE }],
      },
    ],
    ['a bad date', { date: '2026-02-30', person: person([cut]) }],
  ])('rejects %s', async (_n, over) => {
    const res = await ask({ date: DATE, ...over });
    expect(res.status).toBe(400);
  });

  it('a bride cannot book at a men’s salon', async () => {
    for (const doc of m.salons.docs) doc['audience'] = 'MALE';
    const res = await ask({ date: DATE, person: person([cut], { isBride: true }) });
    expect(res.status).toBe(422);
    expect(bodyOf(res).error.code).toBe('BRIDE_NOT_ALLOWED');
    expect(bodyOf(res).error.details.map((d) => d.field)).toEqual(['body.person.isBride']);
  });

  it('a bride cannot book at a clinic (§5.19)', async () => {
    for (const doc of m.salons.docs)
      Object.assign(doc, { businessType: 'CLINIC', audience: 'BOTH' });
    const res = await ask({ date: DATE, person: person([cut], { isBride: true }) });
    expect(res.status).toBe(422);
    expect(bodyOf(res).error.code).toBe('BRIDE_NOT_ALLOWED');
  });

  it('inactive services and hidden salons are refused', async () => {
    for (const doc of m.services.docs) doc['active'] = false;
    expect((await ask({ date: DATE, person: person([cut]) })).status).toBe(400);
    for (const doc of m.salons.docs) doc['state'] = 'OFFLINE';
    expect((await ask({ date: DATE, person: person([cut]) })).status).toBe(404);
  });

  it('needs a customer token', async () => {
    const res = await request(app)
      .post(`/customer/v1/salons/${salonId.toHexString()}/availability`)
      .send({ date: DATE, person: person([cut]) });
    expect(res.status).toBe(401);
  });
});
