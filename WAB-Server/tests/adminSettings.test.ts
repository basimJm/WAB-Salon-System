import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createAdminSettingsService } from '../src/domain/adminSettings/adminSettings.service';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { createSettingsService, type SettingsStore } from '../src/domain/settings';
import { requireAuth } from '../src/middlewares/auth';
import { AuditLogsRepository } from '../src/repositories/auditLogs.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { createLogger } from '../src/utils/logger';
import { connectRedis, disconnectRedis } from '../src/utils/redis/client';
import { createFakeModel } from './helpers/fakeModel';
import { startTestRedis, type TestRedis } from './helpers/redis';
import type { Redis } from 'ioredis';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const auditM = createFakeModel();
const stored = new Map<string, unknown>();
const store: SettingsStore = {
  findAllEntries: () => Promise.resolve([...stored].map(([key, value]) => ({ key, value }))),
  upsert: (key, value) => {
    stored.set(key, value);
    return Promise.resolve();
  },
};
let testRedis: TestRedis;
let redis: Redis;
let app: ReturnType<typeof createApp>;
const adminId = new Types.ObjectId().toHexString();
const token = (type: 'ADMIN' | 'CUSTOMER' = 'ADMIN'): string =>
  `Bearer ${signAccessToken({ secret: SECRET, subjectType: type, subjectId: adminId, ttlSec: 600 }).token}`;

interface Body {
  data: Record<string, unknown> & Record<string, unknown>[];
  meta?: { total: number };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;

beforeAll(async () => {
  testRedis = await startTestRedis();
  redis = await connectRedis({ redis: { url: testRedis.url } }, logger);
  const settings = createSettingsService({ store, redis, logger });
  const auditRepo = new AuditLogsRepository(auditM.model as never);
  app = createApp({
    logger,
    services: {
      adminGuard: requireAuth('admin', SECRET),
      adminSettings: createAdminSettingsService({
        settings,
        auditLogs: auditRepo,
        audit: createAuditWriter(auditRepo),
      }),
    },
  });
});
afterAll(async () => {
  await disconnectRedis(redis);
  await testRedis.stop();
});
beforeEach(async () => {
  await redis.flushdb();
  stored.clear();
  auditM.docs.length = 0;
});

describe('admin settings', () => {
  it('needs an admin token', async () => {
    expect((await request(app).get('/admin/v1/settings')).status).toBe(401);
    expect(
      (await request(app).get('/admin/v1/settings').set('Authorization', token('CUSTOMER'))).status,
    ).toBe(403);
  });

  it('lists every setting with its default and whether it was changed', async () => {
    const res = await request(app).get('/admin/v1/settings').set('Authorization', token());
    expect(res.status).toBe(200);
    const rows = bodyOf(res).data as unknown as { key: string; isDefault: boolean }[];
    expect(rows.length).toBeGreaterThanOrEqual(38);
    expect(rows.every((r) => r.isDefault)).toBe(true);
    expect(rows.find((r) => r.key === 'booking.slotMinutes')).toBeDefined();
  });

  it('changes a setting at once, audits before/after with the reason', async () => {
    const put = await request(app)
      .put('/admin/v1/settings/booking.maxCompanions')
      .set('Authorization', token())
      .send({ value: 3, reason: 'smaller groups' });
    expect(put.status).toBe(200);
    expect(bodyOf(put).data).toMatchObject({ value: 3, isDefault: false });
    const rows = bodyOf(await request(app).get('/admin/v1/settings').set('Authorization', token()))
      .data as unknown as { key: string; value: unknown }[];
    expect(rows.find((r) => r.key === 'booking.maxCompanions')?.value).toBe(3);
    expect(auditM.docs[0]).toMatchObject({
      action: 'SETTING_UPDATE',
      entityId: 'booking.maxCompanions',
      reason: 'smaller groups',
      before: { value: 5 },
      after: { value: 3 },
    });
  });

  it('rejects invalid values, unknown keys and a missing reason without saving or auditing', async () => {
    const bad = await request(app)
      .put('/admin/v1/settings/booking.maxCompanions')
      .set('Authorization', token())
      .send({ value: 'many', reason: 'x' });
    expect(bad.status).toBe(400);
    const unknown = await request(app)
      .put('/admin/v1/settings/no.such.key')
      .set('Authorization', token())
      .send({ value: 1, reason: 'x' });
    expect(unknown.status).toBe(404);
    const noReason = await request(app)
      .put('/admin/v1/settings/booking.maxCompanions')
      .set('Authorization', token())
      .send({ value: 2 });
    expect(noReason.status).toBe(400);
    expect(stored.size).toBe(0);
    expect(auditM.docs).toHaveLength(0);
  });
});

describe('audit log viewer', () => {
  const entry = (over: Record<string, unknown>): string => {
    const _id = new Types.ObjectId();
    auditM.docs.push({
      _id,
      adminId: new Types.ObjectId(adminId),
      action: 'BANNER_CREATE',
      entityType: 'banner',
      entityId: 'b1',
      reason: 'r',
      ip: '1.1.1.1',
      userAgent: 'ua',
      createdAt: new Date('2026-10-10T10:00:00Z'),
      ...over,
    });
    return _id.toHexString();
  };
  it('lists newest first with filters and returns one entry', async () => {
    entry({});
    const other = entry({
      action: 'SALON_SET_OFFLINE',
      entityType: 'salon',
      entityId: 's1',
      createdAt: new Date('2026-10-12T10:00:00Z'),
    });
    const all = await request(app).get('/admin/v1/audit-logs').set('Authorization', token());
    expect(bodyOf(all).meta?.total).toBe(2);
    expect((bodyOf(all).data[0] as unknown as { id: string }).id).toBe(other);
    const byAction = await request(app)
      .get('/admin/v1/audit-logs?action=BANNER_CREATE')
      .set('Authorization', token());
    expect(bodyOf(byAction).data).toHaveLength(1);
    const byEntity = await request(app)
      .get('/admin/v1/audit-logs?entityType=salon&entityId=s1')
      .set('Authorization', token());
    expect(bodyOf(byEntity).data).toHaveLength(1);
    const byDate = await request(app)
      .get('/admin/v1/audit-logs?from=2026-10-11T00:00:00Z')
      .set('Authorization', token());
    expect(bodyOf(byDate).data).toHaveLength(1);
    const one = await request(app)
      .get(`/admin/v1/audit-logs/${other}`)
      .set('Authorization', token());
    expect(bodyOf(one).data).toMatchObject({ action: 'SALON_SET_OFFLINE' });
    expect(
      (
        await request(app)
          .get(`/admin/v1/audit-logs/${new Types.ObjectId().toHexString()}`)
          .set('Authorization', token())
      ).status,
    ).toBe(404);
  });
  it('rejects a reversed date range and a bad admin id', async () => {
    const reversed = await request(app)
      .get('/admin/v1/audit-logs?from=2026-10-12&to=2026-10-01')
      .set('Authorization', token());
    expect(reversed.status).toBe(400);
    expect(
      (await request(app).get('/admin/v1/audit-logs?adminId=nope').set('Authorization', token()))
        .status,
    ).toBe(400);
  });
});
