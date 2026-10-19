import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { ERROR_CODES } from '../src/constants/errorCodes';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { createAdminSalonsService } from '../src/domain/salons/adminSalons.service';
import { createSalonDeletionService } from '../src/domain/salons/salonDeletion.service';
import { createSalonInsightsService } from '../src/domain/salons/salonInsights.service';
import { requireAuth } from '../src/middlewares/auth';
import { AuditLogsRepository } from '../src/repositories/auditLogs.repository';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { PlacementsRepository } from '../src/repositories/placements.repository';
import { SalonServicesRepository } from '../src/repositories/salonServices.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { SubscriptionsRepository } from '../src/repositories/subscriptions.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const REASON = 'Checked with the owner';
const NOW = new Date('2026-10-12T08:00:00Z');
const adminId = new Types.ObjectId().toHexString();

const m = {
  salons: createFakeModel(),
  members: createFakeModel(),
  subs: createFakeModel(),
  services: createFakeModel(),
  placements: createFakeModel(),
  audit: createFakeModel(),
};
const notices: Record<string, unknown>[] = [];
const offlineCalls: Record<string, unknown>[] = [];
const upcoming = { list: [] as { bookingId: string; startsAt: Date; status: string }[] };
const counts = {
  /** What `countBy` answers, keyed by whether the filter has a date bound. */
  all: {} as Record<string, number>,
  recent: {} as Record<string, number>,
  perSalon: {} as Record<string, number>,
  range: {} as Record<string, number>,
  daily: {} as Record<string, number>,
  calls: [] as { filter: Record<string, unknown>; field: string }[],
  dailyCalls: [] as Record<string, unknown>[],
};
const bookings = {
  countBy: (filter: Record<string, unknown>, field: string): Promise<Record<string, number>> => {
    counts.calls.push({ filter, field });
    const created = filter['createdAt'] as { $gte?: Date; $lt?: Date } | undefined;
    if (field === 'salonId') return Promise.resolve(counts.perSalon);
    if (created?.$lt !== undefined) return Promise.resolve(counts.range);
    return Promise.resolve(created === undefined ? counts.all : counts.recent);
  },
  dailyCounts: (input: Record<string, unknown>): Promise<Record<string, number>> => {
    counts.dailyCalls.push(input);
    return Promise.resolve(counts.daily);
  },
};
const settings = { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) };
const salonRepo = new SalonsRepository(m.salons.model as never);
const audit = createAuditWriter(new AuditLogsRepository(m.audit.model as never));
const notifier = {
  changed: (change: Record<string, unknown>): Promise<void> => {
    notices.push(change);
    return Promise.resolve();
  },
};
const state = {
  recompute: (id: string) =>
    Promise.resolve({ salonId: id, state: 'LIVE' as const, missing: [], isComplete: true }),
  setOffline: (input: Record<string, unknown>) => {
    offlineCalls.push(input);
    return Promise.resolve({
      salonId: String(input['salonId']),
      state: 'OFFLINE' as const,
      missing: [],
      isComplete: true,
    });
  },
};
const app = createApp({
  logger,
  services: {
    adminGuard: requireAuth('admin', SECRET),
    adminSalons: createAdminSalonsService({
      salons: salonRepo,
      members: new MembersRepository(m.members.model as never),
      subscriptions: new SubscriptionsRepository(m.subs.model as never),
      salonServices: new SalonServicesRepository(m.services.model as never),
      state,
      audit,
      notifier,
      logger,
      placements: new PlacementsRepository(m.placements.model as never),
      bookingCounts: bookings,
      now: () => NOW,
    }),
    adminSalonInsights: {
      insights: createSalonInsightsService({
        salons: salonRepo,
        bookings,
        salonServices: { countActive: () => Promise.resolve(4) },
        members: new MembersRepository(m.members.model as never),
        auditLogs: new AuditLogsRepository(m.audit.model as never),
        settings,
        now: () => NOW,
      }),
      deletion: createSalonDeletionService({
        salons: salonRepo,
        state,
        bookings: { check: () => Promise.resolve(upcoming.list) },
        audit,
        notifier,
        logger,
        now: () => NOW,
      }),
    },
  },
});

interface Body {
  data: Record<string, unknown> & Record<string, unknown>[];
  meta?: { total: number };
  error?: { code: string; details?: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const bearer = (type: 'ADMIN' | 'MEMBER' = 'ADMIN'): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: type, subjectId: adminId, ttlSec: 600 }).token}`;
const get = (path: string): Promise<{ status: number; body: unknown }> =>
  request(app).get(`/admin/v1/salons${path}`).set('Authorization', bearer());
const post = (path: string, body: object): Promise<{ status: number; body: unknown }> =>
  request(app).post(`/admin/v1/salons${path}`).set('Authorization', bearer()).send(body);
const addSalon = (name: string, over: Record<string, unknown> = {}): string => {
  const _id = new Types.ObjectId();
  m.salons.docs.push({
    _id,
    name,
    gender: 'FEMALE',
    state: 'LIVE',
    rating: { avg: 4.5, count: 10 },
    completeness: { missing: [], isComplete: true },
    createdAt: new Date(NOW.getTime() - m.salons.docs.length * 1000),
    ...over,
  });
  return _id.toHexString();
};

beforeEach(() => {
  for (const model of Object.values(m)) model.docs.length = 0;
  notices.length = 0;
  offlineCalls.length = 0;
  upcoming.list = [];
  counts.all = {};
  counts.recent = {};
  counts.perSalon = {};
  counts.range = {};
  counts.daily = {};
  counts.calls = [];
  counts.dailyCalls = [];
});

describe('admin salon list extras', () => {
  const subscribe = (salonId: string, status: string): void => {
    m.subs.docs.push({ _id: new Types.ObjectId(), salonId: new Types.ObjectId(salonId), status });
  };
  const place = (salonId: string, over: Record<string, unknown> = {}): void => {
    m.placements.docs.push({
      _id: new Types.ObjectId(),
      salonId: new Types.ObjectId(salonId),
      gender: 'FEMALE',
      startAt: new Date('2026-10-01T00:00:00Z'),
      endAt: new Date('2026-11-01T00:00:00Z'),
      order: 1,
      ...over,
    });
  };
  const names = (res: { body: unknown }): string[] =>
    (bodyOf(res).data as unknown as { name: string }[]).map((s) => s.name);

  it('needs an admin token', async () => {
    expect((await request(app).get('/admin/v1/salons')).status).toBe(401);
    expect(
      (await request(app).get('/admin/v1/salons').set('Authorization', bearer('MEMBER'))).status,
    ).toBe(403);
  });

  it('adds the recommended flag, the 30-day booking count and the pending deletion request to every row', async () => {
    const glow = addSalon('Glow', { deletionRequestedAt: new Date('2026-10-10T00:00:00Z') });
    const other = addSalon('Other');
    place(glow);
    place(other, { endAt: new Date('2026-10-05T00:00:00Z') }); // ended
    counts.perSalon = { [glow]: 7 };
    const rows = bodyOf(await get('')).data as unknown as Record<string, unknown>[];
    const byName = Object.fromEntries(rows.map((r) => [String(r['name']), r]));
    expect(byName['Glow']).toMatchObject({
      recommended: true,
      bookings30d: 7,
      deletionRequestedAt: '2026-10-10T00:00:00.000Z',
    });
    expect(byName['Other']).toMatchObject({
      recommended: false,
      bookings30d: 0,
      deletionRequestedAt: null,
    });
    const call = counts.calls.find((c) => c.field === 'salonId');
    const since = (call?.filter['createdAt'] as { $gte: Date }).$gte;
    expect(NOW.getTime() - since.getTime()).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('filters by subscription status', async () => {
    const a = addSalon('A');
    const b = addSalon('B');
    subscribe(a, 'ACTIVE');
    subscribe(b, 'EXPIRED');
    const res = await get('?subscription=ACTIVE');
    expect(names(res)).toEqual(['A']);
    expect(bodyOf(res).meta?.total).toBe(1);
    expect(names(await get('?subscription=TRIAL'))).toEqual([]);
    expect((await get('?subscription=NOPE')).status).toBe(400);
  });

  it('filters recommended salons, the others, and combines filters', async () => {
    const a = addSalon('A');
    const b = addSalon('B');
    const c = addSalon('C');
    place(a);
    place(b);
    subscribe(a, 'ACTIVE');
    subscribe(c, 'ACTIVE');
    expect(names(await get('?recommended=true')).sort()).toEqual(['A', 'B']);
    expect(names(await get('?recommended=false'))).toEqual(['C']);
    expect(names(await get('?recommended=true&subscription=ACTIVE'))).toEqual(['A']);
    expect(names(await get('?recommended=false&subscription=ACTIVE'))).toEqual(['C']);
    expect((await get('?recommended=maybe')).status).toBe(400);
  });

  it('lists only the salons with a pending deletion request', async () => {
    addSalon('Plain');
    addSalon('Leaving', { deletionRequestedAt: new Date('2026-10-10T00:00:00Z') });
    expect(names(await get('?deletionRequested=true'))).toEqual(['Leaving']);
    expect((await get('?deletionRequested=false')).status).toBe(400);
  });

  it('the detail also carries the extras and the deletion approval', async () => {
    const id = addSalon('Glow', { deletionApprovedAt: new Date('2026-10-11T00:00:00Z') });
    place(id);
    counts.perSalon = { [id]: 3 };
    const detail = bodyOf(await get(`/${id}`)).data;
    expect(detail).toMatchObject({
      recommended: true,
      bookings30d: 3,
      deletionRequestedAt: null,
      deletionApprovedAt: '2026-10-11T00:00:00.000Z',
    });
  });
});

describe('admin salon KPIs, analytics and activity', () => {
  it('KPIs count bookings by status (all time and last 30 days), services and staff', async () => {
    const id = addSalon('Glow');
    m.members.docs.push(
      {
        _id: new Types.ObjectId(),
        salonId: new Types.ObjectId(id),
        active: true,
        providesServices: true,
      },
      {
        _id: new Types.ObjectId(),
        salonId: new Types.ObjectId(id),
        active: true,
        providesServices: false,
      },
      {
        _id: new Types.ObjectId(),
        salonId: new Types.ObjectId(id),
        active: false,
        providesServices: true,
      },
    );
    counts.all = { COMPLETED: 8, PENDING: 1, NO_SHOW: 1 };
    counts.recent = { COMPLETED: 3, PENDING: 1 };
    const res = bodyOf(await get(`/${id}/kpis`)).data as unknown as {
      rating: unknown;
      bookings: {
        total: number;
        last30d: number;
        byStatus: Record<string, number>;
        byStatus30d: Record<string, number>;
      };
      activeServices: number;
      activeStaff: number;
    };
    expect(res.rating).toEqual({ avg: 4.5, count: 10 });
    expect(res.bookings.total).toBe(10);
    expect(res.bookings.last30d).toBe(4);
    expect(res.bookings.byStatus['REJECTED']).toBe(0);
    expect(res.bookings.byStatus30d['COMPLETED']).toBe(3);
    expect(res.activeServices).toBe(4);
    expect(res.activeStaff).toBe(1);
  });

  it('KPIs of an unknown salon are 404 and need the admin token', async () => {
    expect((await get(`/${new Types.ObjectId().toHexString()}/kpis`)).status).toBe(404);
    const id = addSalon('Glow');
    expect((await request(app).get(`/admin/v1/salons/${id}/kpis`)).status).toBe(401);
  });

  it('analytics fills every day of the range, in Amman time, with zero days', async () => {
    const id = addSalon('Glow');
    counts.daily = { '2026-10-12': 2, '2026-10-14': 5 };
    counts.range = { COMPLETED: 6, PENDING: 1 };
    const res = bodyOf(await get(`/${id}/analytics?from=2026-10-12&to=2026-10-14`));
    expect(res.data['total']).toBe(7);
    expect(res.data['days']).toEqual([
      { date: '2026-10-12', bookings: 2 },
      { date: '2026-10-13', bookings: 0 },
      { date: '2026-10-14', bookings: 5 },
    ]);
    expect((res.data['byStatus'] as Record<string, number>)['COMPLETED']).toBe(6);
    // Local midnight in Amman (UTC+3): the day starts at 21:00Z the evening before.
    expect(counts.dailyCalls[0]).toMatchObject({
      from: new Date('2026-10-11T21:00:00.000Z'),
      to: new Date('2026-10-14T21:00:00.000Z'),
      timeZone: 'Asia/Amman',
    });
  });

  it('analytics refuses a bad, reversed or too long range', async () => {
    const id = addSalon('Glow');
    const range = (from: string, to: string): Promise<{ status: number }> =>
      get(`/${id}/analytics?from=${from}&to=${to}`);
    expect((await range('nope', '2026-10-14')).status).toBe(400);
    expect((await range('2026-10-14', '2026-10-12')).status).toBe(400);
    expect((await range('2026-01-01', '2026-10-01')).status).toBe(400);
    expect((await get(`/${id}/analytics?from=2026-10-12`)).status).toBe(400);
    expect((await range('2026-07-14', '2026-10-13')).status).toBe(200); // 92 days
    expect((await range('2026-07-13', '2026-10-13')).status).toBe(400); // 93 days
  });

  it('activity lists what admins did to this salon only, newest first, paginated', async () => {
    const id = addSalon('Glow');
    const at = (minutes: number): Date => new Date(NOW.getTime() - minutes * 60_000);
    m.audit.docs.push(
      {
        _id: new Types.ObjectId(),
        adminId: new Types.ObjectId(),
        action: 'SALON_SET_OFFLINE',
        entityType: 'salon',
        entityId: id,
        reason: 'old',
        createdAt: at(30),
      },
      {
        _id: new Types.ObjectId(),
        adminId: new Types.ObjectId(),
        action: 'SALON_PROFILE_EDIT',
        entityType: 'salon',
        entityId: id,
        reason: 'new',
        createdAt: at(5),
      },
      {
        _id: new Types.ObjectId(),
        adminId: new Types.ObjectId(),
        action: 'SETTING_UPDATE',
        entityType: 'setting',
        entityId: id,
        reason: 'other',
        createdAt: at(1),
      },
      {
        _id: new Types.ObjectId(),
        adminId: new Types.ObjectId(),
        action: 'SALON_SET_OFFLINE',
        entityType: 'salon',
        entityId: 'x',
        reason: 'other salon',
        createdAt: at(2),
      },
    );
    const res = bodyOf(await get(`/${id}/activity`));
    expect((res.data as unknown as { action: string }[]).map((e) => e.action)).toEqual([
      'SALON_PROFILE_EDIT',
      'SALON_SET_OFFLINE',
    ]);
    expect(res.meta?.total).toBe(2);
    const second = bodyOf(await get(`/${id}/activity?pageSize=1&page=2`));
    expect((second.data as unknown as { reason: string }[])[0]?.reason).toBe('old');
  });
});

describe('admin salon deletion decision', () => {
  const requested = (over: Record<string, unknown> = {}): string =>
    addSalon('Leaving', { deletionRequestedAt: new Date('2026-10-10T00:00:00Z'), ...over });
  const decide = (id: string, body: object): Promise<{ status: number; body: unknown }> =>
    post(`/${id}/deletion-request/decision`, body);

  it('approve: salon goes offline, approval stamped, decision audited', async () => {
    const id = requested();
    const res = await decide(id, { decision: 'APPROVE', reason: REASON });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toEqual({ decision: 'APPROVE' });
    expect(offlineCalls).toHaveLength(1);
    expect(offlineCalls[0]).toMatchObject({ salonId: id, reason: REASON });
    expect(m.salons.docs[0]?.['deletionApprovedAt']).toEqual(NOW);
    expect(m.audit.docs[0]).toMatchObject({
      action: 'SALON_DELETION_DECISION',
      entityId: id,
      reason: REASON,
      after: { decision: 'APPROVE' },
    });
  });

  it('approve leaves an already offline salon as it is', async () => {
    const id = requested({ state: 'OFFLINE' });
    expect((await decide(id, { decision: 'APPROVE', reason: REASON })).status).toBe(200);
    expect(offlineCalls).toHaveLength(0);
    expect(m.salons.docs[0]?.['deletionApprovedAt']).toEqual(NOW);
  });

  it('approve is refused while PENDING/APPROVED bookings exist (409 with the ids), nothing changes', async () => {
    const id = requested();
    const bookingId = new Types.ObjectId().toHexString();
    upcoming.list = [{ bookingId, startsAt: new Date('2026-10-20T09:00:00Z'), status: 'APPROVED' }];
    const res = await decide(id, { decision: 'APPROVE', reason: REASON });
    expect(res.status).toBe(409);
    expect(bodyOf(res).error?.code).toBe(ERROR_CODES.SCHEDULE_CONFLICT);
    expect(bodyOf(res).error?.details?.[0]?.field).toBe(bookingId);
    expect(offlineCalls).toHaveLength(0);
    expect(m.salons.docs[0]?.['deletionApprovedAt']).toBeUndefined();
    expect(m.audit.docs).toHaveLength(0);
  });

  it('reject clears the request, tells the owner and audits', async () => {
    const id = requested();
    const res = await decide(id, { decision: 'REJECT', reason: REASON });
    expect(res.status).toBe(200);
    expect(m.salons.docs[0]?.['deletionRequestedAt']).toBeUndefined();
    expect(notices).toEqual([{ salonId: id, event: 'salon.deletion_rejected', reason: REASON }]);
    expect(m.audit.docs[0]).toMatchObject({
      action: 'SALON_DELETION_DECISION',
      after: { decision: 'REJECT' },
    });
    expect(offlineCalls).toHaveLength(0);
  });

  it('there must be an open request: none, or already decided, is 422', async () => {
    const plain = addSalon('Plain');
    const none = await decide(plain, { decision: 'REJECT', reason: REASON });
    expect(none.status).toBe(422);
    expect(bodyOf(none).error?.code).toBe(ERROR_CODES.INVALID_TRANSITION);
    const id = requested();
    expect((await decide(id, { decision: 'APPROVE', reason: REASON })).status).toBe(200);
    expect((await decide(id, { decision: 'APPROVE', reason: REASON })).status).toBe(422);
    expect((await decide(id, { decision: 'REJECT', reason: REASON })).status).toBe(422);
  });

  it('needs a reason and a known decision; an unknown salon is 404', async () => {
    const id = requested();
    expect((await decide(id, { decision: 'APPROVE' })).status).toBe(400);
    expect((await decide(id, { decision: 'APPROVE', reason: '  ' })).status).toBe(400);
    expect((await decide(id, { decision: 'MAYBE', reason: REASON })).status).toBe(400);
    expect(
      (await decide(new Types.ObjectId().toHexString(), { decision: 'REJECT', reason: REASON }))
        .status,
    ).toBe(404);
  });
});

describe('BookingsRepository.dailyCounts', () => {
  it('groups by the local calendar day and bounds the range', async () => {
    const pipelines: unknown[][] = [];
    const repo = new BookingsRepository({
      aggregate: (pipeline: unknown[]) => {
        pipelines.push(pipeline);
        return { exec: () => Promise.resolve([{ _id: '2026-10-12', count: 3 }]) };
      },
    } as never);
    const salonId = new Types.ObjectId().toHexString();
    const from = new Date('2026-10-11T21:00:00Z');
    const to = new Date('2026-10-12T21:00:00Z');
    expect(await repo.dailyCounts({ salonId, from, to, timeZone: 'Asia/Amman' })).toEqual({
      '2026-10-12': 3,
    });
    const [match, group] = pipelines[0] as [
      { $match: { salonId: Types.ObjectId; createdAt: { $gte: Date; $lt: Date } } },
      { $group: { _id: { $dateToString: { format: string; timezone: string } } } },
    ];
    expect(String(match.$match.salonId)).toBe(salonId);
    expect(match.$match.createdAt).toEqual({ $gte: from, $lt: to });
    expect(group.$group._id.$dateToString).toMatchObject({
      format: '%Y-%m-%d',
      timezone: 'Asia/Amman',
    });
  });
});
