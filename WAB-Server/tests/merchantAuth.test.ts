import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { PERMISSIONS } from '../src/constants/enums';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import {
  createMerchantAuthService,
  type MerchantSession,
} from '../src/domain/auth/merchantAuth.service';
import { createRefreshTokenService } from '../src/domain/auth/refreshTokens.service';
import type { OtpGate } from '../src/domain/otp/otpGate.service';
import { proofFor, testOtp } from './helpers/otp';
import {
  InstallationsRepository,
  MembersRepository,
  RefreshTokensRepository,
} from '../src/repositories/identity.repository';
import { CountriesRepository } from '../src/repositories/locations.repository';
import { verifyAccessToken } from '../src/utils/auth/accessToken';
import { RateLimitError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';
import { createFakeModel, type FakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const NOW = new Date('2026-10-12T10:00:00.000Z');
const PHONE = { countryCode: 'JO', number: '791234567' };
const E164 = '+962791234567';
const OTHER_E164 = '+962781234567';
const DEVICE = {
  installationId: 'install-device-0001',
  platform: 'ANDROID',
  appVersion: '1.0.0',
} as const;

interface Rig {
  service: ReturnType<typeof createMerchantAuthService>;
  members: FakeModel;
  installations: FakeModel;
  tokens: FakeModel;
  gate: { blocked: boolean; resets: string[] } & OtpGate;
  salonId: Types.ObjectId;
}

/** `clock` defaults to a fixed instant; HTTP tests could pass the real clock. */
const setup = (clock: () => Date = () => NOW): Rig => {
  const countries = createFakeModel([
    { code: 'JO', dialCode: '+962', phoneRegex: '^7[789][0-9]{7}$', active: true },
  ]);
  const members = createFakeModel();
  const installations = createFakeModel();
  const tokens = createFakeModel();
  const gate = {
    blocked: false,
    resets: [] as string[],
    request: () => Promise.reject(new Error('unused')),
    reportWrongAttempt: () => Promise.reject(new Error('unused')),
    assertNotBlocked(): Promise<void> {
      return this.blocked
        ? Promise.reject(new RateLimitError({ code: 'OTP_BLOCKED' }))
        : Promise.resolve();
    },
    reset(e164: string): Promise<void> {
      this.resets.push(e164);
      return Promise.resolve();
    },
  };
  const service = createMerchantAuthService({
    members: new MembersRepository(members.model as never),
    installations: new InstallationsRepository(installations.model as never),
    countries: new CountriesRepository(countries.model as never),
    otp: testOtp,
    otpGate: gate,
    refreshTokens: createRefreshTokenService({
      repository: new RefreshTokensRepository(tokens.model as never),
      logger,
      now: clock,
    }),
    settings: { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) },
    accessSecret: SECRET,
    now: clock,
  });
  return { service, members, installations, tokens, gate, salonId: new Types.ObjectId() };
};

const addMember = (rig: Rig, override: Record<string, unknown> = {}): string => {
  const _id = new Types.ObjectId();
  rig.members.docs.push({
    _id,
    salonId: rig.salonId,
    firstName: 'Sami',
    lastName: 'Nasser',
    phone: E164,
    role: 'OWNER',
    permissions: [],
    active: true,
    providesServices: false,
    ...override,
  });
  return _id.toHexString();
};

const setFirst = (model: FakeModel, key: string, value: unknown): void => {
  Object.assign(model.docs[0] ?? {}, { [key]: value });
};

const failure = async (promise: Promise<unknown>): Promise<Record<string, unknown>> =>
  await promise.then(
    () => ({}),
    (error: unknown) => error as Record<string, unknown>,
  );

const login = (
  rig: Rig,
  otpToken = proofFor(E164, 'LOGIN'),
  language: 'ar' | 'en' = 'ar',
): Promise<MerchantSession> =>
  rig.service.login({ phone: PHONE, otpToken, device: DEVICE, language });

describe('merchant auth: check phone', () => {
  it('passes for an active member', async () => {
    const rig = setup();
    addMember(rig);
    await expect(rig.service.checkPhone({ phone: PHONE })).resolves.toBeUndefined();
  });

  it('an unknown number is PHONE_NOT_REGISTERED (404), a removed member MEMBER_INACTIVE (403)', async () => {
    const rig = setup();
    expect(await failure(rig.service.checkPhone({ phone: PHONE }))).toMatchObject({
      code: 'PHONE_NOT_REGISTERED',
      httpStatus: 404,
    });
    addMember(rig, { active: false });
    expect(await failure(rig.service.checkPhone({ phone: PHONE }))).toMatchObject({
      code: 'MEMBER_INACTIVE',
      httpStatus: 403,
    });
  });

  it.each([
    [{ countryCode: 'XX', number: '791234567' }, 'body.phone.countryCode'],
    [{ countryCode: 'JO', number: '0791234567' }, 'body.phone.number'],
  ])('rejects %j', async (phone, field) => {
    const error = await failure(setup().service.checkPhone({ phone }));
    expect(error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect((error['details'] as { field: string }[]).map((d) => d.field)).toEqual([field]);
  });
});

describe('merchant auth: login', () => {
  it('signs a member in: merchant-scope token, hashed refresh token, device linked', async () => {
    const rig = setup();
    const id = addMember(rig);
    const session = await login(rig, proofFor(E164, 'LOGIN'), 'en');
    expect(verifyAccessToken(SECRET, session.accessToken, NOW)).toMatchObject({
      subjectType: 'MEMBER',
      scope: 'merchant',
      subjectId: id,
    });
    expect(session.accessTokenExpiresAt.getTime()).toBe(NOW.getTime() + 900_000);
    expect(session.refreshTokenExpiresAt.getTime()).toBe(NOW.getTime() + 90 * 86_400_000);
    expect(JSON.stringify(rig.tokens.docs)).not.toContain(session.refreshToken);
    expect(rig.tokens.docs[0]).toMatchObject({
      subjectType: 'MEMBER',
      installationId: DEVICE.installationId,
    });
    expect(rig.installations.docs).toHaveLength(1);
    expect(rig.installations.docs[0]).toMatchObject({
      app: 'MERCHANT',
      installationId: DEVICE.installationId,
      language: 'en',
    });
    expect(String(rig.installations.docs[0]?.['memberId'])).toBe(id);
    expect(rig.installations.docs[0]?.['customerId']).toBeUndefined();
    expect(rig.gate.resets).toEqual([E164]);
  });

  it('the owner gets every permission, others exactly what was granted', async () => {
    const owner = setup();
    addMember(owner, { permissions: ['DASHBOARD_VIEW'] });
    const ownerSession = await login(owner);
    expect(ownerSession.member).toMatchObject({
      role: 'OWNER',
      salonId: owner.salonId.toHexString(),
      permissions: PERMISSIONS,
    });
    const manager = setup();
    addMember(manager, { role: 'MANAGER', permissions: ['BOOKINGS_VIEW_ALL', 'BOOKINGS_RESPOND'] });
    const managerSession = await login(manager);
    expect(managerSession.member.permissions).toEqual(['BOOKINGS_VIEW_ALL', 'BOOKINGS_RESPOND']);
    expect(managerSession.member).not.toHaveProperty('photoKey');
  });

  it('updates the device record on the next login instead of adding one', async () => {
    const rig = setup();
    addMember(rig);
    await login(rig);
    await rig.service.login({
      phone: PHONE,
      otpToken: proofFor(E164, 'LOGIN'),
      device: { ...DEVICE, appVersion: '1.1.0', fcmToken: 'fcm-token-1' },
      language: 'ar',
    });
    expect(rig.installations.docs).toHaveLength(1);
    expect(rig.installations.docs[0]).toMatchObject({
      appVersion: '1.1.0',
      fcmToken: 'fcm-token-1',
    });
  });

  it('unknown number: PHONE_NOT_REGISTERED; deactivated member: MEMBER_INACTIVE; nothing issued', async () => {
    const rig = setup();
    expect(await failure(login(rig))).toMatchObject({ code: 'PHONE_NOT_REGISTERED' });
    addMember(rig, { active: false });
    expect(await failure(login(rig))).toMatchObject({ code: 'MEMBER_INACTIVE', httpStatus: 403 });
    expect(rig.tokens.docs).toHaveLength(0);
    expect(rig.installations.docs).toHaveLength(0);
  });

  it('takes a LOGIN otpToken only once; a token of another purpose is refused', async () => {
    const rig = setup();
    addMember(rig);
    const token = proofFor(E164, 'LOGIN');
    await login(rig, token);
    expect(await failure(login(rig, token))).toMatchObject({ code: 'OTP_INVALID' });
    expect(await failure(login(rig, proofFor(E164, 'CHANGE_PHONE')))).toMatchObject({
      code: 'OTP_INVALID',
    });
  });

  it('checks the proof first: invalid, expired, another number, blocked', async () => {
    const rig = setup();
    addMember(rig);
    expect(await failure(login(rig, proofFor(E164, 'LOGIN', 'invalid')))).toMatchObject({
      code: 'OTP_INVALID',
    });
    expect(await failure(login(rig, proofFor(E164, 'LOGIN', 'expired')))).toMatchObject({
      code: 'OTP_EXPIRED',
    });
    expect(await failure(login(rig, proofFor(OTHER_E164, 'LOGIN')))).toMatchObject({
      code: 'OTP_INVALID',
    });
    rig.gate.blocked = true;
    expect(await failure(login(rig))).toMatchObject({ code: 'OTP_BLOCKED', httpStatus: 429 });
    expect(rig.tokens.docs).toHaveLength(0);
  });
});

describe('merchant auth: refresh and logout', () => {
  const signedIn = async (): Promise<{ rig: Rig; refreshToken: string; id: string }> => {
    const rig = setup();
    const id = addMember(rig, { role: 'MANAGER', permissions: ['BOOKINGS_VIEW_ALL'] });
    const session = await login(rig);
    return { rig, refreshToken: session.refreshToken, id };
  };

  it('rotates the pair, reflects permission changes at once, and rejects the old token', async () => {
    const { rig, refreshToken, id } = await signedIn();
    setFirst(rig.members, 'permissions', ['BOOKINGS_VIEW_ALL', 'FINANCE_VIEW']);
    const next = await rig.service.refresh({ refreshToken });
    expect(next.refreshToken).not.toBe(refreshToken);
    expect(next.member.permissions).toEqual(['BOOKINGS_VIEW_ALL', 'FINANCE_VIEW']);
    expect(verifyAccessToken(SECRET, next.accessToken, NOW).subjectId).toBe(id);
    expect(await failure(rig.service.refresh({ refreshToken }))).toMatchObject({ httpStatus: 401 });
    // reuse revoked the whole family, so the newest token is dead too
    expect(await failure(rig.service.refresh({ refreshToken: next.refreshToken }))).toMatchObject({
      httpStatus: 401,
    });
  });

  it('a member deactivated meanwhile gets MEMBER_INACTIVE and loses every session', async () => {
    const { rig, refreshToken } = await signedIn();
    setFirst(rig.members, 'active', false);
    expect(await failure(rig.service.refresh({ refreshToken }))).toMatchObject({
      code: 'MEMBER_INACTIVE',
      httpStatus: 403,
    });
    expect(rig.tokens.docs.every((doc) => doc['revokedAt'] !== undefined)).toBe(true);
  });

  it('a removed member and garbage tokens answer 401', async () => {
    const { rig, refreshToken } = await signedIn();
    rig.members.docs.length = 0;
    expect(await failure(rig.service.refresh({ refreshToken }))).toMatchObject({ httpStatus: 401 });
    expect(await failure(rig.service.refresh({ refreshToken: 'A'.repeat(43) }))).toMatchObject({
      httpStatus: 401,
    });
  });

  it('logout revokes the token and unlinks the device; repeating it is harmless', async () => {
    const { rig, refreshToken } = await signedIn();
    await rig.service.logout({ refreshToken });
    await rig.service.logout({ refreshToken });
    await rig.service.logout({ refreshToken: 'A'.repeat(43) });
    expect(rig.installations.docs).toHaveLength(1);
    expect(rig.installations.docs[0]?.['memberId']).toBeUndefined();
    expect(await failure(rig.service.refresh({ refreshToken }))).toMatchObject({ httpStatus: 401 });
  });
});

describe('merchant auth: HTTP', () => {
  interface Body {
    success: boolean;
    data: { refreshToken: string; member: { salonId: string } } | null;
    error: { code: string; details: { field: string }[] };
  }
  const bodyOf = (res: { body: unknown }): Body => res.body as Body;
  const appFor = (rig: Rig): ReturnType<typeof createApp> =>
    createApp({ logger, services: { merchantAuth: rig.service } });

  it('checks the phone, logs in, refreshes and logs out through the API', async () => {
    const rig = setup();
    addMember(rig);
    const app = appFor(rig);
    expect(
      (await request(app).post('/merchant/v1/auth/check-phone').send({ phone: PHONE })).status,
    ).toBe(200);
    const res = await request(app)
      .post('/merchant/v1/auth/login')
      .set('Accept-Language', 'en')
      .send({ phone: PHONE, otpToken: proofFor(E164, 'LOGIN'), installation: DEVICE });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data?.member.salonId).toBe(rig.salonId.toHexString());
    expect(rig.installations.docs[0]).toMatchObject({ language: 'en' });
    const refreshed = await request(app)
      .post('/merchant/v1/auth/refresh')
      .send({ refreshToken: bodyOf(res).data?.refreshToken });
    expect(refreshed.status).toBe(200);
    const out = await request(app)
      .post('/merchant/v1/auth/logout')
      .send({ refreshToken: bodyOf(refreshed).data?.refreshToken });
    expect(out.status).toBe(200);
    expect(bodyOf(out).data).toBeNull();
  });

  it('answers the not-linked dialog case with its code', async () => {
    const res = await request(appFor(setup()))
      .post('/merchant/v1/auth/check-phone')
      .send({ phone: PHONE });
    expect(res.status).toBe(404);
    expect(bodyOf(res).error.code).toBe('PHONE_NOT_REGISTERED');
  });

  it.each([
    [{ phone: PHONE, otpToken: 'x' }, 'body.installation'],
    [
      { phone: { countryCode: 'jo', number: '1' }, otpToken: 'x', installation: DEVICE },
      'body.phone.countryCode',
    ],
    [{ phone: PHONE, otpToken: '', installation: DEVICE }, 'body.otpToken'],
  ])('validates the login body %#', async (body, field) => {
    const res = await request(appFor(setup())).post('/merchant/v1/auth/login').send(body);
    expect(res.status).toBe(400);
    expect(bodyOf(res).error.details.map((d) => d.field)).toContain(field);
  });

  it('keeps the namespaces apart: the customer prefix has no merchant login', async () => {
    const rig = setup();
    addMember(rig);
    const res = await request(createApp({ logger, services: { merchantAuth: rig.service } }))
      .post('/customer/v1/auth/login')
      .send({ phone: PHONE, otpToken: proofFor(E164, 'LOGIN'), installation: DEVICE });
    expect(res.status).toBe(503);
    expect(rig.tokens.docs).toHaveLength(0);
  });

  it('answers 503, not 404, when merchant auth is not configured', async () => {
    const res = await request(createApp({ logger }))
      .post('/merchant/v1/auth/login')
      .send({ phone: PHONE, otpToken: 'x', installation: DEVICE });
    expect(res.status).toBe(503);
  });
});
