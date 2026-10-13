import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { createPlacementsService } from '../src/domain/placements/placements.service';
import { requireAuth } from '../src/middlewares/auth';
import { PlacementsRepository } from '../src/repositories/placements.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const NOW = new Date('2026-10-12T08:00:00Z');
const m = { placements: createFakeModel(), salons: createFakeModel() };
const audits: Record<string, unknown>[] = [];
const service = createPlacementsService({
  placements: new PlacementsRepository(m.placements.model as never),
  salons: new SalonsRepository(m.salons.model as never),
  audit: createAuditWriter({
    append: (data) => {
      audits.push(data);
      return Promise.resolve({ id: 'a', ...data } as never);
    },
  }),
  now: () => NOW,
});
const app = createApp({
  logger,
  services: { adminGuard: requireAuth('admin', SECRET), adminPlacements: service },
});

interface Row {
  id: string;
  gender: string;
  status: string;
  order: number;
  amountPaid: string;
  salon: { name: string };
  note: string | null;
}
interface Body {
  data: Row & Row[];
  meta?: { total: number };
  error: { code: string; details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const id = (): Types.ObjectId => new Types.ObjectId();
const token = (): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'ADMIN', subjectId: id().toHexString(), ttlSec: 600 }).token}`;
const base = '/admin/v1/recommended';
const send = (method: 'post' | 'patch' | 'put', path: string, body: object): request.Test =>
  request(app)[method](`${base}${path}`).set('Authorization', token()).send(body);
const day = (offset: number): string => new Date(NOW.getTime() + offset * 86_400_000).toISOString();
const women = id();
const men = id();

const add = (over: Record<string, unknown> = {}): string => {
  const _id = id();
  m.placements.docs.push({
    _id,
    salonId: women,
    gender: 'FEMALE',
    startAt: new Date(day(-1)),
    endAt: new Date(day(5)),
    order: 0,
    amountPaid: 50000,
    ...over,
  });
  return _id.toHexString();
};

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  audits.length = 0;
  m.salons.docs.push(
    { _id: women, name: 'Glow', gender: 'FEMALE' },
    { _id: men, name: 'Barber', gender: 'MALE' },
  );
});

describe('lookup for customers', () => {
  it('returns only placements running now, in display order', async () => {
    const b = id();
    const c = id();
    add({ salonId: b, order: 2 });
    add({ salonId: c, order: 1 });
    add({ salonId: id(), startAt: new Date(day(1)), endAt: new Date(day(3)) });
    add({ salonId: id(), startAt: new Date(day(-9)), endAt: new Date(day(-1)) });
    add({ salonId: id(), gender: 'MALE' });
    expect(await service.salonIds('FEMALE', NOW)).toEqual([c.toHexString(), b.toHexString()]);
    expect(await service.salonIds('MALE', NOW)).toHaveLength(1);
  });

  it('the start is inclusive and the end is exclusive', async () => {
    const s = id();
    add({ salonId: s, startAt: NOW, endAt: new Date(NOW.getTime() + 1000) });
    expect(await service.salonIds('FEMALE', NOW)).toEqual([s.toHexString()]);
    expect(await service.salonIds('FEMALE', new Date(NOW.getTime() + 1000))).toEqual([]);
  });
});

describe('POST /admin/v1/recommended', () => {
  const valid = (): Record<string, unknown> => ({
    salonId: women.toHexString(),
    startAt: day(1),
    endAt: day(30),
    amountPaid: '75.500',
    note: 'Eid campaign',
    reason: 'Paid in cash',
  });

  it('adds a scheduled placement; the audience is the salon’s gender; audited', async () => {
    const res = await send('post', '', valid());
    expect(res.status).toBe(201);
    expect(bodyOf(res).data).toMatchObject({
      gender: 'FEMALE',
      status: 'SCHEDULED',
      amountPaid: '75.500',
      salon: { name: 'Glow' },
      note: 'Eid campaign',
    });
    expect(m.placements.docs[0]?.['amountPaid']).toBe(75500);
    expect(audits[0]).toMatchObject({ action: 'RECOMMENDED_CREATE', reason: 'Paid in cash' });
  });

  it('refuses an unknown salon, a reversed period and overlapping periods of one salon', async () => {
    expect((await send('post', '', { ...valid(), salonId: id().toHexString() })).status).toBe(404);
    const reversed = await send('post', '', { ...valid(), startAt: day(5), endAt: day(2) });
    expect(reversed.status).toBe(400);
    expect(bodyOf(reversed).error.details.map((d) => d.field)).toEqual(['endAt']);
    expect((await send('post', '', valid())).status).toBe(201);
    const clash = await send('post', '', { ...valid(), startAt: day(10), endAt: day(40) });
    expect(clash.status).toBe(409);
    expect((await send('post', '', { ...valid(), startAt: day(30), endAt: day(40) })).status).toBe(
      201,
    );
    expect(m.placements.docs).toHaveLength(2);
  });

  it.each([
    ['no reason', { reason: undefined }],
    ['a money amount with 4 decimals', { amountPaid: '1.0001' }],
    ['a negative amount', { amountPaid: '-1.000' }],
    ['a bad salon id', { salonId: 'x' }],
    ['a negative order', { order: -1 }],
  ])('rejects %s', async (_n, over) => {
    expect((await send('post', '', { ...valid(), ...over })).status).toBe(400);
  });
});

describe('GET /admin/v1/recommended', () => {
  it('shows status per placement and filters by gender and status', async () => {
    add();
    add({ startAt: new Date(day(2)), endAt: new Date(day(9)), salonId: men, gender: 'MALE' });
    add({ startAt: new Date(day(-9)), endAt: new Date(day(-2)), salonId: id() });
    const get = async (q: string): Promise<string[]> =>
      bodyOf(await request(app).get(`${base}?${q}`).set('Authorization', token())).data.map(
        (r) => r.status,
      );
    expect(await get('')).toEqual(['ENDED', 'ACTIVE', 'SCHEDULED']);
    expect(await get('status=ACTIVE')).toEqual(['ACTIVE']);
    expect(await get('status=SCHEDULED')).toEqual(['SCHEDULED']);
    expect(await get('status=ENDED')).toEqual(['ENDED']);
    expect(await get('gender=MALE')).toEqual(['SCHEDULED']);
  });

  it('needs an admin token', async () => {
    expect((await request(app).get(base)).status).toBe(401);
  });
});

describe('PATCH, end and reorder', () => {
  it('edits a running placement and keeps other fields', async () => {
    const a = add({ note: 'keep' });
    const res = await send('patch', `/${a}`, { order: 3, amountPaid: '10.000', reason: 'fix' });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toMatchObject({ order: 3, amountPaid: '10.000', note: 'keep' });
    expect(audits[0]).toMatchObject({ action: 'RECOMMENDED_UPDATE' });
  });

  it('cannot move a period onto another one of the same salon, or edit an ended one', async () => {
    const first = add({ endAt: new Date(day(5)) });
    add({ startAt: new Date(day(5)), endAt: new Date(day(9)) });
    expect((await send('patch', `/${first}`, { endAt: day(7), reason: 'x' })).status).toBe(409);
    expect((await send('patch', `/${first}`, { endAt: day(4), reason: 'x' })).status).toBe(200);
    const ended = add({ salonId: id(), startAt: new Date(day(-9)), endAt: new Date(day(-2)) });
    expect((await send('patch', `/${ended}`, { order: 1, reason: 'x' })).status).toBe(422);
    expect((await send('patch', `/${first}`, { reason: 'x' })).status).toBe(400);
  });

  it('end stops a running placement now and a scheduled one never starts', async () => {
    const running = add();
    const later = add({ salonId: id(), startAt: new Date(day(2)), endAt: new Date(day(9)) });
    expect(bodyOf(await send('post', `/${running}/end`, { reason: 'refund' })).data.status).toBe(
      'ENDED',
    );
    expect(bodyOf(await send('post', `/${later}/end`, { reason: 'cancelled' })).data.status).toBe(
      'ENDED',
    );
    expect(await service.salonIds('FEMALE', NOW)).toEqual([]);
    const again = await send('post', `/${running}/end`, { reason: 'x' });
    expect(again.status).toBe(422);
    expect(bodyOf(again).error.code).toBe('ALREADY_HANDLED');
    expect((await send('post', `/${id().toHexString()}/end`, { reason: 'x' })).status).toBe(404);
  });

  it('reorders one audience and refuses ids of another audience or unknown ids', async () => {
    const a = add({ salonId: id(), order: 0 });
    const b = add({ salonId: id(), order: 1 });
    const other = add({ salonId: id(), gender: 'MALE' });
    const res = await send('put', '/reorder', { gender: 'FEMALE', ids: [b, a], reason: 'drag' });
    expect(res.status).toBe(200);
    expect(m.placements.docs.map((d) => d['order'])).toEqual([1, 0, 0]);
    expect(
      (await send('put', '/reorder', { gender: 'FEMALE', ids: [a, other], reason: 'x' })).status,
    ).toBe(400);
    expect(
      (await send('put', '/reorder', { gender: 'FEMALE', ids: [id().toHexString()], reason: 'x' }))
        .status,
    ).toBe(400);
    expect((await send('put', '/reorder', { gender: 'FEMALE', ids: [], reason: 'x' })).status).toBe(
      400,
    );
  });
});
