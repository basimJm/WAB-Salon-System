import type { Redis } from 'ioredis';
import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { ADMIN_EMAIL_CHANGE_KEY_PREFIX } from '../src/constants/adminProfile';
import { ERROR_CODES } from '../src/constants/errorCodes';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createAdminProfileService } from '../src/domain/adminProfile/adminProfile.service';
import { createAuditWriter } from '../src/domain/audit/audit.service';
import { createAdminAuthService } from '../src/domain/auth/adminAuth.service';
import { createRefreshTokenService } from '../src/domain/auth/refreshTokens.service';
import { requireAuth } from '../src/middlewares/auth';
import { FakeNotifier } from '../src/providers/notifier';
import { AuditLogsRepository } from '../src/repositories/auditLogs.repository';
import { AdminsRepository, RefreshTokensRepository } from '../src/repositories/identity.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { hashPassword, verifyPassword } from '../src/utils/auth/password';
import { ExternalServiceError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';
import { connectRedis, disconnectRedis } from '../src/utils/redis/client';
import { redisKey } from '../src/utils/redis/keys';
import { createFakeModel, type FakeModel } from './helpers/fakeModel';
import { startTestRedis, type TestRedis } from './helpers/redis';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const PASSWORD = 'correct horse battery staple';
const NEW_PASSWORD = 'another long passphrase 2026';
const EMAIL = 'admin@example.com';
const NEW_EMAIL = 'new.admin@example.com';
const CODE = '654321';
const COST = 4;

let testRedis: TestRedis;
let redis: Redis;
beforeAll(async () => {
  testRedis = await startTestRedis();
  redis = await connectRedis({ redis: { url: testRedis.url } }, logger);
});
afterAll(async () => {
  await disconnectRedis(redis);
  await testRedis.stop();
});
beforeEach(async () => {
  await redis.flushdb();
});

interface Body {
  data: Record<string, unknown>;
  error?: { code: string };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;

interface Rig {
  app: ReturnType<typeof createApp>;
  admins: FakeModel;
  audit: FakeModel;
  tokens: FakeModel;
  notifier: FakeNotifier;
  adminId: string;
  auth: string;
  stored: () => {
    email: string;
    passwordHash: string;
    alertEmails: string[];
    failedLoginCount: number;
    lockedUntil?: Date;
  };
  revoked: () => number;
}

const setup = async (): Promise<Rig> => {
  const adminId = new Types.ObjectId();
  const admins = createFakeModel([
    {
      _id: adminId,
      email: EMAIL,
      passwordHash: await hashPassword(PASSWORD, COST),
      failedLoginCount: 0,
      alertEmails: [],
    },
    {
      _id: new Types.ObjectId(),
      email: 'other@example.com',
      passwordHash: await hashPassword(PASSWORD, COST),
      failedLoginCount: 0,
      alertEmails: [],
    },
  ]);
  const tokens = createFakeModel();
  const audit = createFakeModel();
  const settings = { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) };
  const repository = new AdminsRepository(admins.model as never);
  const refreshTokens = createRefreshTokenService({
    repository: new RefreshTokensRepository(tokens.model as never),
    logger,
  });
  const notifier = new FakeNotifier();
  const service = createAdminProfileService({
    admins: repository,
    auth: createAdminAuthService({
      admins: repository,
      refreshTokens,
      settings,
      logger,
      accessSecret: SECRET,
      bcryptCost: COST,
    }),
    refreshTokens,
    audit: createAuditWriter(new AuditLogsRepository(audit.model as never)),
    redis,
    notifier,
    settings,
    logger,
    secret: SECRET,
    randomCode: () => CODE,
    bcryptCost: COST,
  });
  const app = createApp({
    logger,
    services: { adminGuard: requireAuth('admin', SECRET), adminProfile: service },
  });
  const id = adminId.toHexString();
  return {
    app,
    admins,
    audit,
    tokens,
    notifier,
    adminId: id,
    auth: `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'ADMIN', subjectId: id, ttlSec: 600 }).token}`,
    stored: () => admins.docs.find((d) => String(d._id) === id) as never,
    revoked: () => tokens.docs.filter((d) => d.revokedAt !== undefined).length,
  };
};

describe('admin profile', () => {
  it('needs an admin token', async () => {
    const { app } = await setup();
    expect((await request(app).get('/admin/v1/profile')).status).toBe(401);
    const customer = signAccessToken({
      secret: SECRET,
      subjectType: 'CUSTOMER',
      subjectId: new Types.ObjectId().toHexString(),
      ttlSec: 600,
    }).token;
    expect(
      (await request(app).get('/admin/v1/profile').set('Authorization', `Bearer ${customer}`))
        .status,
    ).toBe(403);
  });

  it('reads the own profile without the password hash', async () => {
    const { app, auth, adminId } = await setup();
    const res = await request(app).get('/admin/v1/profile').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toEqual({
      id: adminId,
      email: EMAIL,
      alertEmails: [],
      lastLoginAt: null,
    });
  });

  describe('alert recipients', () => {
    it('replaces the list, lower-cases and de-duplicates it, and audits the change', async () => {
      const { app, auth, audit, stored } = await setup();
      const res = await request(app)
        .patch('/admin/v1/profile')
        .set('Authorization', auth)
        .send({ alertEmails: ['Ops@Example.com', 'ops@example.com', 'cto@example.com'] });
      expect(res.status).toBe(200);
      expect(bodyOf(res).data['alertEmails']).toEqual(['ops@example.com', 'cto@example.com']);
      expect(stored().alertEmails).toEqual(['ops@example.com', 'cto@example.com']);
      expect(audit.docs).toHaveLength(1);
      expect(audit.docs[0]).toMatchObject({ action: 'ADMIN_PROFILE_UPDATE', entityType: 'admin' });
    });

    it('accepts an empty list and refuses bad addresses and too many', async () => {
      const { app, auth } = await setup();
      const patch = (alertEmails: unknown): Promise<{ status: number }> =>
        request(app).patch('/admin/v1/profile').set('Authorization', auth).send({ alertEmails });
      expect((await patch([])).status).toBe(200);
      expect((await patch(['not-an-email'])).status).toBe(400);
      const many = Array.from({ length: 11 }, (_, i) => `a${String(i)}@example.com`);
      expect((await patch(many)).status).toBe(400);
      expect((await patch('x@example.com')).status).toBe(400);
    });
  });

  describe('password', () => {
    const change = (
      rig: Rig,
      body: Record<string, unknown>,
    ): Promise<{ status: number; body: unknown }> =>
      request(rig.app).post('/admin/v1/profile/password').set('Authorization', rig.auth).send(body);

    it('changes the password, ends every session, notices the admin and audits it', async () => {
      const rig = await setup();
      rig.tokens.docs.push({
        _id: new Types.ObjectId(),
        subjectType: 'ADMIN',
        subjectId: new Types.ObjectId(rig.adminId),
        tokenHash: 'h'.repeat(64),
        familyId: 'f',
        expiresAt: new Date(Date.now() + 60_000),
      });
      const res = await change(rig, { currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
      expect(res.status).toBe(200);
      expect(await verifyPassword(NEW_PASSWORD, rig.stored().passwordHash)).toBe(true);
      expect(await verifyPassword(PASSWORD, rig.stored().passwordHash)).toBe(false);
      expect(rig.revoked()).toBe(1);
      expect(rig.notifier.emails).toHaveLength(1);
      expect(rig.notifier.emails[0]?.to).toEqual([EMAIL]);
      expect(rig.audit.docs[0]).toMatchObject({ action: 'ADMIN_PASSWORD_CHANGE' });
      expect(JSON.stringify(rig.audit.docs)).not.toContain(NEW_PASSWORD);
    });

    it('notices the alert recipients when there are some', async () => {
      const rig = await setup();
      await request(rig.app)
        .patch('/admin/v1/profile')
        .set('Authorization', rig.auth)
        .send({ alertEmails: ['ops@example.com'] });
      await change(rig, { currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
      expect(rig.notifier.emails[0]?.to).toEqual(['ops@example.com']);
    });

    it('answers 403 CURRENT_PASSWORD_INVALID (never 401) and leaves the password alone', async () => {
      const rig = await setup();
      const res = await change(rig, {
        currentPassword: 'wrong wrong wrong',
        newPassword: NEW_PASSWORD,
      });
      expect(res.status).toBe(403);
      expect(bodyOf(res).error?.code).toBe(ERROR_CODES.CURRENT_PASSWORD_INVALID);
      expect(await verifyPassword(PASSWORD, rig.stored().passwordHash)).toBe(true);
      expect(rig.stored().failedLoginCount).toBe(1);
    });

    it('locks the account after repeated wrong passwords: then 429, even with the right one', async () => {
      const rig = await setup();
      const max = SETTING_DEFAULTS['admin.maxFailedLogins'];
      for (let i = 0; i < max; i += 1) {
        await change(rig, { currentPassword: 'wrong wrong wrong', newPassword: NEW_PASSWORD });
      }
      const locked = await change(rig, { currentPassword: PASSWORD, newPassword: NEW_PASSWORD });
      expect(locked.status).toBe(429);
      expect(await verifyPassword(PASSWORD, rig.stored().passwordHash)).toBe(true);
    });

    it('refuses a short password, an unchanged one and missing fields', async () => {
      const rig = await setup();
      expect((await change(rig, { currentPassword: PASSWORD, newPassword: 'short' })).status).toBe(
        400,
      );
      expect((await change(rig, { currentPassword: PASSWORD })).status).toBe(400);
      const same = await change(rig, { currentPassword: PASSWORD, newPassword: PASSWORD });
      expect(same.status).toBe(422);
      expect(rig.notifier.emails).toHaveLength(0);
      expect(rig.audit.docs).toHaveLength(0);
    });
  });

  describe('email change', () => {
    const requestChange = (
      rig: Rig,
      body: Record<string, unknown>,
    ): Promise<{ status: number; body: unknown }> =>
      request(rig.app)
        .post('/admin/v1/profile/email/request')
        .set('Authorization', rig.auth)
        .send(body);
    const confirm = (rig: Rig, code: string): Promise<{ status: number; body: unknown }> =>
      request(rig.app)
        .post('/admin/v1/profile/email/verify')
        .set('Authorization', rig.auth)
        .send({ code });

    it('mails a code to the NEW address and changes nothing until it is confirmed', async () => {
      const rig = await setup();
      const res = await requestChange(rig, { newEmail: NEW_EMAIL, password: PASSWORD });
      expect(res.status).toBe(200);
      expect(rig.notifier.emails).toHaveLength(1);
      expect(rig.notifier.emails[0]?.to).toEqual([NEW_EMAIL]);
      expect(rig.notifier.emails[0]?.text).toContain(CODE);
      expect(rig.stored().email).toBe(EMAIL);
    });

    it('the right code changes the email once, ends sessions and tells both addresses', async () => {
      const rig = await setup();
      rig.tokens.docs.push({
        _id: new Types.ObjectId(),
        subjectType: 'ADMIN',
        subjectId: new Types.ObjectId(rig.adminId),
        tokenHash: 'g'.repeat(64),
        familyId: 'f',
        expiresAt: new Date(Date.now() + 60_000),
      });
      await requestChange(rig, { newEmail: NEW_EMAIL.toUpperCase(), password: PASSWORD });
      const res = await confirm(rig, CODE);
      expect(res.status).toBe(200);
      expect(bodyOf(res).data['email']).toBe(NEW_EMAIL);
      expect(rig.stored().email).toBe(NEW_EMAIL);
      expect(rig.revoked()).toBe(1);
      expect(rig.audit.docs[0]).toMatchObject({ action: 'ADMIN_EMAIL_CHANGE' });
      const notice = rig.notifier.emails[1];
      expect(notice?.to).toEqual(expect.arrayContaining([EMAIL]));
      expect(notice?.text).toContain(NEW_EMAIL);
      const again = await confirm(rig, CODE);
      expect(again.status).toBe(422);
      expect(bodyOf(again).error?.code).toBe(ERROR_CODES.OTP_EXPIRED);
    });

    it('a wrong code is 422 OTP_INVALID, counts toward the lockout and keeps the code usable', async () => {
      const rig = await setup();
      await requestChange(rig, { newEmail: NEW_EMAIL, password: PASSWORD });
      const wrong = await confirm(rig, '000000');
      expect(wrong.status).toBe(422);
      expect(bodyOf(wrong).error?.code).toBe(ERROR_CODES.OTP_INVALID);
      expect(rig.stored().failedLoginCount).toBe(1);
      expect((await confirm(rig, CODE)).status).toBe(200);
    });

    it('an expired or never requested code is 422 OTP_EXPIRED', async () => {
      const rig = await setup();
      const none = await confirm(rig, CODE);
      expect(none.status).toBe(422);
      expect(bodyOf(none).error?.code).toBe(ERROR_CODES.OTP_EXPIRED);
      await requestChange(rig, { newEmail: NEW_EMAIL, password: PASSWORD });
      await redis.del(redisKey(ADMIN_EMAIL_CHANGE_KEY_PREFIX, rig.adminId));
      expect((await confirm(rig, CODE)).status).toBe(422);
    });

    it('needs the right password (403) and a free address (409)', async () => {
      const rig = await setup();
      const bad = await requestChange(rig, { newEmail: NEW_EMAIL, password: 'wrong wrong wrong' });
      expect(bad.status).toBe(403);
      expect(bodyOf(bad).error?.code).toBe(ERROR_CODES.CURRENT_PASSWORD_INVALID);
      const taken = await requestChange(rig, { newEmail: 'other@example.com', password: PASSWORD });
      expect(taken.status).toBe(409);
      expect(bodyOf(taken).error?.code).toBe(ERROR_CODES.EMAIL_ALREADY_USED);
      const same = await requestChange(rig, { newEmail: EMAIL, password: PASSWORD });
      expect(same.status).toBe(409);
      expect(rig.notifier.emails).toHaveLength(0);
    });

    it('does not mail another code inside the resend window', async () => {
      const rig = await setup();
      expect((await requestChange(rig, { newEmail: NEW_EMAIL, password: PASSWORD })).status).toBe(
        200,
      );
      expect((await requestChange(rig, { newEmail: NEW_EMAIL, password: PASSWORD })).status).toBe(
        429,
      );
      expect(rig.notifier.emails).toHaveLength(1);
    });

    it('a code issued for one address cannot confirm another change', async () => {
      const rig = await setup();
      await requestChange(rig, { newEmail: NEW_EMAIL, password: PASSWORD });
      await redis.set(
        redisKey(ADMIN_EMAIL_CHANGE_KEY_PREFIX, rig.adminId),
        `evil@example.com|${'0'.repeat(64)}`,
      );
      expect((await confirm(rig, CODE)).status).toBe(422);
      expect(rig.stored().email).toBe(EMAIL);
    });

    it('validates the bodies', async () => {
      const rig = await setup();
      expect((await requestChange(rig, { newEmail: 'nope', password: PASSWORD })).status).toBe(400);
      expect((await confirm(rig, 'abc')).status).toBe(400);
    });

    it('a failed email send leaves no pending change and lets the admin ask again at once', async () => {
      const rig = await setup();
      jest
        .spyOn(rig.notifier, 'sendEmail')
        .mockRejectedValueOnce(new ExternalServiceError({ unavailable: true }));
      const failed = await requestChange(rig, { newEmail: NEW_EMAIL, password: PASSWORD });
      expect(failed.status).toBeGreaterThanOrEqual(500);
      expect(await redis.get(redisKey(ADMIN_EMAIL_CHANGE_KEY_PREFIX, rig.adminId))).toBeNull();
      expect((await requestChange(rig, { newEmail: NEW_EMAIL, password: PASSWORD })).status).toBe(
        200,
      );
    });
  });
});
