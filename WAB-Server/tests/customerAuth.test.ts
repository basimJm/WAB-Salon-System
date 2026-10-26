import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createCustomerAuthService } from '../src/domain/auth/customerAuth.service';
import { createRefreshTokenService } from '../src/domain/auth/refreshTokens.service';
import type { OtpGate } from '../src/domain/otp/otpGate.service';
import { requireAuth } from '../src/middlewares/auth';
import { proofFor, testOtp } from './helpers/otp';
import {
  CustomersRepository,
  InstallationsRepository,
  RefreshTokensRepository,
} from '../src/repositories/identity.repository';
import {
  AreasRepository,
  CitiesRepository,
  CountriesRepository,
} from '../src/repositories/locations.repository';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { signAccessToken, verifyAccessToken } from '../src/utils/auth/accessToken';
import { RateLimitError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';
import { createFakeModel, type FakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const NOW = new Date('2026-10-12T10:00:00.000Z');
const PHONE = { countryCode: 'JO', number: '791234567' };
const E164 = '+962791234567';
const OTHER = { countryCode: 'JO', number: '781234567' };
const OTHER_E164 = '+962781234567';
const DEVICE = {
  installationId: 'install-device-0001',
  platform: 'ANDROID',
  appVersion: '1.0.0',
} as const;

interface Rig {
  service: ReturnType<typeof createCustomerAuthService>;
  customers: FakeModel;
  installations: FakeModel;
  tokens: FakeModel;
  gate: { blocked: boolean; resets: string[] } & OtpGate;
  cityId: string;
  areaId: string;
  otherCityAreaId: string;
}

/** `clock` defaults to a fixed instant; HTTP tests pass the real clock because `requireAuth` uses it. */
const setup = (clock: () => Date = () => NOW): Rig => {
  const cityId = new Types.ObjectId();
  const otherCityId = new Types.ObjectId();
  const areaId = new Types.ObjectId();
  const otherCityAreaId = new Types.ObjectId();
  const countries = createFakeModel([
    { code: 'JO', dialCode: '+962', phoneRegex: '^7[789][0-9]{7}$', active: true },
    { code: 'XX', dialCode: '+999', phoneRegex: '^[0-9]+$', active: false },
  ]);
  const cities = createFakeModel([
    { _id: cityId, active: true },
    { _id: otherCityId, active: true },
  ]);
  const areas = createFakeModel([
    { _id: areaId, cityId, active: true },
    { _id: otherCityAreaId, cityId: otherCityId, active: true },
  ]);
  const customers = createFakeModel();
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
  const service = createCustomerAuthService({
    customers: new CustomersRepository(customers.model as never),
    installations: new InstallationsRepository(installations.model as never),
    countries: new CountriesRepository(countries.model as never),
    cities: new CitiesRepository(cities.model as never),
    areas: new AreasRepository(areas.model as never),
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
  return {
    service,
    customers,
    installations,
    tokens,
    gate,
    cityId: cityId.toHexString(),
    areaId: areaId.toHexString(),
    otherCityAreaId: otherCityAreaId.toHexString(),
  };
};

const registration = (rig: Rig, override: Record<string, unknown> = {}): never =>
  ({
    firstName: 'Lina',
    lastName: 'Haddad',
    email: 'lina@example.com',
    gender: 'FEMALE',
    cityId: rig.cityId,
    areaId: rig.areaId,
    phone: PHONE,
    otpToken: proofFor(E164, 'REGISTER'),
    device: DEVICE,
    language: 'ar',
    ...override,
  }) as never;

const customerDoc = (override: Record<string, unknown> = {}): Record<string, unknown> => ({
  _id: new Types.ObjectId(),
  firstName: 'Omar',
  lastName: 'Saleh',
  email: 'omar@example.com',
  gender: 'MALE',
  phone: { countryCode: 'JO', dialCode: '+962', number: '781234567', e164: OTHER_E164 },
  cityId: new Types.ObjectId(),
  areaId: new Types.ObjectId(),
  language: 'ar',
  pushEnabled: true,
  status: 'ACTIVE',
  ...override,
});

/** Changes a field of the first stored document (the fake model's docs are plain records). */
const setFirst = (model: FakeModel, key: string, value: unknown): void => {
  Object.assign(model.docs[0] ?? {}, { [key]: value });
};

const failure = async (promise: Promise<unknown>): Promise<Record<string, unknown>> =>
  await promise.then(
    () => ({}),
    (error: unknown) => error as Record<string, unknown>,
  );

describe('customer auth: check phone', () => {
  it('login: unknown number, blocked account and deleted account', async () => {
    const rig = setup();
    expect(await failure(rig.service.checkPhone({ phone: PHONE, purpose: 'LOGIN' }))).toMatchObject(
      {
        code: 'PHONE_NOT_REGISTERED',
        httpStatus: 404,
      },
    );
    rig.customers.docs.push(
      customerDoc({
        phone: { countryCode: 'JO', dialCode: '+962', number: '791234567', e164: E164 },
        status: 'BLOCKED',
      }),
    );
    expect(await failure(rig.service.checkPhone({ phone: PHONE, purpose: 'LOGIN' }))).toMatchObject(
      {
        code: 'ACCOUNT_BLOCKED',
        httpStatus: 403,
      },
    );
    setFirst(rig.customers, 'status', 'DELETED');
    expect(await failure(rig.service.checkPhone({ phone: PHONE, purpose: 'LOGIN' }))).toMatchObject(
      {
        code: 'PHONE_NOT_REGISTERED',
      },
    );
    setFirst(rig.customers, 'status', 'DELETION_PENDING');
    await expect(
      rig.service.checkPhone({ phone: PHONE, purpose: 'LOGIN' }),
    ).resolves.toBeUndefined();
  });

  it('register: taken number is 409, free number passes', async () => {
    const rig = setup();
    await expect(
      rig.service.checkPhone({ phone: PHONE, purpose: 'REGISTER' }),
    ).resolves.toBeUndefined();
    rig.customers.docs.push(
      customerDoc({
        phone: { countryCode: 'JO', dialCode: '+962', number: '791234567', e164: E164 },
      }),
    );
    expect(
      await failure(rig.service.checkPhone({ phone: PHONE, purpose: 'REGISTER' })),
    ).toMatchObject({
      code: 'PHONE_ALREADY_REGISTERED',
      httpStatus: 409,
    });
  });

  it.each([
    [{ countryCode: 'XX', number: '791234567' }, 'body.phone.countryCode'],
    [{ countryCode: 'ZZ', number: '791234567' }, 'body.phone.countryCode'],
    [{ countryCode: 'JO', number: '0791234567' }, 'body.phone.number'],
    [{ countryCode: 'JO', number: '711234567' }, 'body.phone.number'],
  ])('rejects %j', async (phone, field) => {
    const error = await failure(setup().service.checkPhone({ phone, purpose: 'LOGIN' }));
    expect(error).toMatchObject({ code: 'VALIDATION_ERROR', httpStatus: 400 });
    expect((error['details'] as { field: string }[]).map((d) => d.field)).toEqual([field]);
  });
});

describe('customer auth: register', () => {
  it('creates the account, signs it in, hashes the refresh token and links the device', async () => {
    const rig = setup();
    const session = await rig.service.register(registration(rig));
    expect(rig.customers.docs).toHaveLength(1);
    expect(rig.customers.docs[0]).toMatchObject({
      firstName: 'Lina',
      status: 'ACTIVE',
      pushEnabled: true,
      phone: { e164: E164, dialCode: '+962', countryCode: 'JO', number: '791234567' },
    });
    const claims = verifyAccessToken(SECRET, session.accessToken, NOW);
    expect(claims).toMatchObject({
      subjectType: 'CUSTOMER',
      scope: 'customer',
      subjectId: session.customer.id,
    });
    expect(session.accessTokenExpiresAt.getTime()).toBe(NOW.getTime() + 900_000);
    expect(session.refreshTokenExpiresAt.getTime()).toBe(NOW.getTime() + 90 * 86_400_000);
    expect(JSON.stringify(rig.tokens.docs)).not.toContain(session.refreshToken);
    expect(rig.tokens.docs[0]).toMatchObject({ installationId: DEVICE.installationId });
    expect(rig.installations.docs[0]).toMatchObject({
      installationId: DEVICE.installationId,
      app: 'CUSTOMER',
      platform: 'ANDROID',
    });
    expect(String(rig.installations.docs[0]?.['customerId'])).toBe(session.customer.id);
    expect(rig.gate.resets).toEqual([E164]);
    expect(session.customer).toMatchObject({ email: 'lina@example.com', language: 'ar' });
  });

  it.each([
    ['an invalid proof', 'invalid', 'OTP_INVALID', 401],
    ['an expired proof', 'expired', 'OTP_EXPIRED', 401],
  ] as const)('%s creates nothing', async (_label, kind, code, status) => {
    const rig = setup();
    const error = await failure(
      rig.service.register(registration(rig, { otpToken: proofFor(E164, 'REGISTER', kind) })),
    );
    expect(error).toMatchObject({ code, httpStatus: status });
    expect(rig.customers.docs).toHaveLength(0);
    expect(rig.tokens.docs).toHaveLength(0);
  });

  it('refuses a proof for a different number', async () => {
    const rig = setup();
    const error = await failure(
      rig.service.register(registration(rig, { otpToken: proofFor(OTHER_E164, 'REGISTER') })),
    );
    expect(error).toMatchObject({ code: 'OTP_INVALID' });
    expect(rig.customers.docs).toHaveLength(0);
  });

  it('answers OTP_BLOCKED (429) before asking the provider when the number is blocked', async () => {
    const rig = setup();
    rig.gate.blocked = true;
    const error = await failure(
      rig.service.register(registration(rig, { otpToken: 'not even checked' })),
    );
    expect(error).toMatchObject({ code: 'OTP_BLOCKED', httpStatus: 429 });
  });

  it('rejects an unknown city, or an area of another city', async () => {
    const rig = setup();
    const error = await failure(
      rig.service.register(
        registration(rig, {
          cityId: new Types.ObjectId().toHexString(),
          areaId: rig.otherCityAreaId,
        }),
      ),
    );
    // the area cannot belong to a city that does not exist, so both fields are reported
    expect((error['details'] as { field: string }[]).map((d) => d.field)).toEqual([
      'body.cityId',
      'body.areaId',
    ]);
    const mismatch = await failure(
      rig.service.register(registration(rig, { areaId: rig.otherCityAreaId })),
    );
    expect((mismatch['details'] as { field: string }[]).map((d) => d.field)).toEqual([
      'body.areaId',
    ]);
    expect(rig.customers.docs).toHaveLength(0);
  });

  it('refuses a number that already has an account', async () => {
    const rig = setup();
    await rig.service.register(registration(rig));
    expect(await failure(rig.service.register(registration(rig)))).toMatchObject({
      code: 'PHONE_ALREADY_REGISTERED',
      httpStatus: 409,
    });
    expect(rig.customers.docs).toHaveLength(1);
  });

  it('turns a unique-index race into the same 409', async () => {
    const rig = setup();
    const raced = new CustomersRepository(rig.customers.model as never);
    jest
      .spyOn(raced, 'create')
      .mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 11000 }));
    const service = createCustomerAuthService({
      customers: raced,
      installations: new InstallationsRepository(rig.installations.model as never),
      countries: new CountriesRepository(
        createFakeModel([
          { code: 'JO', dialCode: '+962', phoneRegex: '^7[789][0-9]{7}$', active: true },
        ]).model as never,
      ),
      cities: new CitiesRepository(
        createFakeModel([{ _id: new Types.ObjectId(rig.cityId), active: true }]).model as never,
      ),
      areas: new AreasRepository(
        createFakeModel([
          {
            _id: new Types.ObjectId(rig.areaId),
            cityId: new Types.ObjectId(rig.cityId),
            active: true,
          },
        ]).model as never,
      ),
      otp: testOtp,
      otpGate: rig.gate,
      refreshTokens: createRefreshTokenService({
        repository: new RefreshTokensRepository(rig.tokens.model as never),
        logger,
      }),
      settings: { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) },
      accessSecret: SECRET,
    });
    expect(await failure(service.register(registration(rig)))).toMatchObject({
      code: 'PHONE_ALREADY_REGISTERED',
    });
  });
});

describe('customer auth: login', () => {
  const existing = (rig: Rig, override: Record<string, unknown> = {}): string => {
    rig.customers.docs.push(
      customerDoc({
        phone: { countryCode: 'JO', dialCode: '+962', number: '791234567', e164: E164 },
        ...override,
      }),
    );
    return String(rig.customers.docs.at(-1)?.['_id']);
  };
  const login = (
    rig: Rig,
    otpToken = proofFor(E164, 'LOGIN'),
  ): Promise<{ customer: { id: string } }> =>
    rig.service.login({ phone: PHONE, otpToken, device: DEVICE, language: 'en' });

  it('signs an active customer in and links the device with the app language', async () => {
    const rig = setup();
    const id = existing(rig);
    const session = await login(rig);
    expect(session.customer.id).toBe(id);
    expect(rig.installations.docs[0]).toMatchObject({ language: 'en' });
    expect(rig.gate.resets).toEqual([E164]);
  });

  it('updates the device record instead of adding one on the next login', async () => {
    const rig = setup();
    existing(rig);
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

  it('restores an account in its deletion grace period', async () => {
    const rig = setup();
    existing(rig, {
      status: 'DELETION_PENDING',
      deletionRequestedAt: new Date(),
      deletionScheduledAt: new Date(),
    });
    await login(rig);
    expect(rig.customers.docs[0]?.['status']).toBe('ACTIVE');
    expect(rig.customers.docs[0]?.['deletionRequestedAt']).toBeUndefined();
    expect(rig.customers.docs[0]?.['deletionScheduledAt']).toBeUndefined();
  });

  it.each([
    ['BLOCKED', 'ACCOUNT_BLOCKED', 403],
    ['DELETED', 'PHONE_NOT_REGISTERED', 404],
  ])('a %s account answers %s', async (status, code, httpStatus) => {
    const rig = setup();
    existing(rig, { status });
    expect(await failure(login(rig))).toMatchObject({ code, httpStatus });
    expect(rig.tokens.docs).toHaveLength(0);
  });

  it('an unknown number answers PHONE_NOT_REGISTERED', async () => {
    expect(await failure(login(setup()))).toMatchObject({ code: 'PHONE_NOT_REGISTERED' });
  });

  it('takes a LOGIN otpToken only once; a token of another purpose is refused', async () => {
    const rig = setup();
    existing(rig);
    const token = proofFor(E164, 'LOGIN');
    await login(rig, token);
    expect(await failure(login(rig, token))).toMatchObject({ code: 'OTP_INVALID' });
    expect(await failure(login(rig, proofFor(E164, 'REGISTER')))).toMatchObject({
      code: 'OTP_INVALID',
    });
  });

  it('checks the proof first: wrong, expired, other number, blocked', async () => {
    const rig = setup();
    existing(rig);
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
    expect(await failure(login(rig))).toMatchObject({ code: 'OTP_BLOCKED' });
    expect(rig.tokens.docs).toHaveLength(0);
  });
});

describe('customer auth: refresh and logout', () => {
  const signedIn = async (): Promise<{ rig: Rig; refreshToken: string; id: string }> => {
    const rig = setup();
    const session = await rig.service.register(registration(rig));
    return { rig, refreshToken: session.refreshToken, id: session.customer.id };
  };

  it('rotates the pair and the old refresh token stops working', async () => {
    const { rig, refreshToken, id } = await signedIn();
    const next = await rig.service.refresh({ refreshToken });
    expect(next.refreshToken).not.toBe(refreshToken);
    expect(verifyAccessToken(SECRET, next.accessToken, NOW).subjectId).toBe(id);
    expect(await failure(rig.service.refresh({ refreshToken }))).toMatchObject({ httpStatus: 401 });
    // reuse revoked the whole family, so the newest token is dead too
    expect(await failure(rig.service.refresh({ refreshToken: next.refreshToken }))).toMatchObject({
      httpStatus: 401,
    });
  });

  it('ends every session of a customer who was blocked meanwhile', async () => {
    const { rig, refreshToken } = await signedIn();
    setFirst(rig.customers, 'status', 'BLOCKED');
    expect(await failure(rig.service.refresh({ refreshToken }))).toMatchObject({
      code: 'ACCOUNT_BLOCKED',
      httpStatus: 403,
    });
    expect(rig.tokens.docs.every((doc) => doc['revokedAt'] !== undefined)).toBe(true);
  });

  it('refuses garbage', async () => {
    const { rig } = await signedIn();
    expect(await failure(rig.service.refresh({ refreshToken: 'A'.repeat(43) }))).toMatchObject({
      httpStatus: 401,
    });
  });

  it('logout revokes the token and unlinks the device; repeating it is harmless', async () => {
    const { rig, refreshToken } = await signedIn();
    await rig.service.logout({ refreshToken });
    await rig.service.logout({ refreshToken });
    await rig.service.logout({ refreshToken: 'A'.repeat(43) });
    expect(rig.installations.docs[0]?.['customerId']).toBeUndefined();
    expect(rig.installations.docs).toHaveLength(1);
    expect(await failure(rig.service.refresh({ refreshToken }))).toMatchObject({ httpStatus: 401 });
  });
});

describe('customer auth: change phone', () => {
  const account = async (): Promise<{ rig: Rig; id: string }> => {
    const rig = setup();
    const session = await rig.service.register(registration(rig));
    return { rig, id: session.customer.id };
  };

  it('moves the account to the verified new number', async () => {
    const { rig, id } = await account();
    rig.gate.resets.length = 0;
    const profile = await rig.service.changePhone({
      customerId: id,
      phone: OTHER,
      otpToken: proofFor(OTHER_E164, 'CHANGE_PHONE'),
    });
    expect(profile.phone).toMatchObject({ e164: OTHER_E164, number: '781234567' });
    expect(rig.customers.docs[0]?.['phone']).toMatchObject({ e164: OTHER_E164 });
    expect(rig.gate.resets).toEqual([OTHER_E164]);
  });

  it('needs a proof for the NEW number', async () => {
    const { rig, id } = await account();
    expect(
      await failure(
        rig.service.changePhone({
          customerId: id,
          phone: OTHER,
          otpToken: proofFor(E164, 'CHANGE_PHONE'),
        }),
      ),
    ).toMatchObject({ code: 'OTP_INVALID' });
    expect(rig.customers.docs[0]?.['phone']).toMatchObject({ e164: E164 });
  });

  it('refuses a number that belongs to someone else, accepts the own number', async () => {
    const { rig, id } = await account();
    rig.customers.docs.push(customerDoc());
    expect(
      await failure(
        rig.service.changePhone({
          customerId: id,
          phone: OTHER,
          otpToken: proofFor(OTHER_E164, 'CHANGE_PHONE'),
        }),
      ),
    ).toMatchObject({ code: 'PHONE_ALREADY_REGISTERED' });
    await expect(
      rig.service.changePhone({
        customerId: id,
        phone: PHONE,
        otpToken: proofFor(E164, 'CHANGE_PHONE'),
      }),
    ).resolves.toMatchObject({ phone: { e164: E164 } });
  });

  it('refuses unknown and non-active customers and a blocked number', async () => {
    const { rig, id } = await account();
    const args = { phone: OTHER, otpToken: proofFor(OTHER_E164, 'CHANGE_PHONE') };
    expect(
      await failure(
        rig.service.changePhone({ customerId: new Types.ObjectId().toHexString(), ...args }),
      ),
    ).toMatchObject({ httpStatus: 401 });
    rig.gate.blocked = true;
    expect(await failure(rig.service.changePhone({ customerId: id, ...args }))).toMatchObject({
      code: 'OTP_BLOCKED',
    });
    rig.gate.blocked = false;
    setFirst(rig.customers, 'status', 'BLOCKED');
    expect(await failure(rig.service.changePhone({ customerId: id, ...args }))).toMatchObject({
      httpStatus: 401,
    });
  });
});

describe('customer auth: HTTP', () => {
  interface Body {
    success: boolean;
    message: string;
    data: { accessToken: string; refreshToken: string; customer: { id: string } } | null;
    error: { code: string; details: { field: string }[] };
  }
  const bodyOf = (res: { body: unknown }): Body => res.body as Body;
  const appFor = (rig: Rig): ReturnType<typeof createApp> =>
    createApp({
      logger,
      services: {
        customerAuth: { service: rig.service, authenticate: requireAuth('customer', SECRET) },
      },
    });
  const registerBody = (rig: Rig): Record<string, unknown> => ({
    firstName: 'Lina',
    lastName: 'Haddad',
    email: 'lina@example.com',
    gender: 'FEMALE',
    cityId: rig.cityId,
    areaId: rig.areaId,
    phone: PHONE,
    otpToken: proofFor(E164, 'REGISTER'),
    installation: DEVICE,
  });

  it('registers (201), logs in (200), refreshes and logs out through the API', async () => {
    const rig = setup();
    const app = appFor(rig);
    const registered = await request(app)
      .post('/customer/v1/auth/register')
      .send(registerBody(rig));
    expect(registered.status).toBe(201);
    expect(bodyOf(registered)).toMatchObject({ success: true });
    const login = await request(app)
      .post('/customer/v1/auth/login')
      .set('Accept-Language', 'en')
      .send({ phone: PHONE, otpToken: proofFor(E164, 'LOGIN'), installation: DEVICE });
    expect(login.status).toBe(200);
    expect(rig.installations.docs[0]).toMatchObject({ language: 'en' });
    const refreshToken = bodyOf(login).data?.refreshToken ?? '';
    const refreshed = await request(app).post('/customer/v1/auth/refresh').send({ refreshToken });
    expect(refreshed.status).toBe(200);
    const next = bodyOf(refreshed).data?.refreshToken ?? '';
    const out = await request(app).post('/customer/v1/auth/logout').send({ refreshToken: next });
    expect(out.status).toBe(200);
    expect(bodyOf(out).data).toBeNull();
  });

  it('answers the check-phone errors with their codes', async () => {
    const res = await request(appFor(setup()))
      .post('/customer/v1/auth/check-phone')
      .send({ phone: PHONE, purpose: 'LOGIN' });
    expect(res.status).toBe(404);
    expect(bodyOf(res).error.code).toBe('PHONE_NOT_REGISTERED');
  });

  it.each([
    [{ phone: PHONE, otpToken: 'x' }, 'body.installation'],
    [
      { phone: { countryCode: 'jo', number: '791234567' }, otpToken: 'x', installation: DEVICE },
      'body.phone.countryCode',
    ],
    [{ phone: PHONE, otpToken: '', installation: DEVICE }, 'body.otpToken'],
    [
      { phone: PHONE, otpToken: 'x', installation: { ...DEVICE, platform: 'PALM' } },
      'body.installation.platform',
    ],
  ])('validates the login body %#', async (body, field) => {
    const res = await request(appFor(setup())).post('/customer/v1/auth/login').send(body);
    expect(res.status).toBe(400);
    expect(bodyOf(res).error.details.map((d) => d.field)).toContain(field);
  });

  it('validates the register body', async () => {
    const rig = setup();
    const res = await request(appFor(rig))
      .post('/customer/v1/auth/register')
      .send({ ...registerBody(rig), email: 'nope', firstName: '  ', cityId: 'x' });
    expect(res.status).toBe(400);
    expect(
      bodyOf(res)
        .error.details.map((d) => d.field)
        .sort(),
    ).toEqual(['body.cityId', 'body.email', 'body.firstName']);
  });

  it('change-phone needs a customer token: none 401, merchant token 403, customer token 200', async () => {
    const rig = setup(() => new Date());
    const app = appFor(rig);
    const session = await request(app).post('/customer/v1/auth/register').send(registerBody(rig));
    const customer = bodyOf(session).data;
    const body = { phone: OTHER, otpToken: proofFor(OTHER_E164, 'CHANGE_PHONE') };
    expect((await request(app).post('/customer/v1/auth/change-phone').send(body)).status).toBe(401);
    const merchantToken = signAccessToken({
      secret: SECRET,
      subjectType: 'MEMBER',
      subjectId: customer?.customer.id ?? '',
      ttlSec: 60,
    }).token;
    expect(
      (
        await request(app)
          .post('/customer/v1/auth/change-phone')
          .set('Authorization', `Bearer ${merchantToken}`)
          .send(body)
      ).status,
    ).toBe(403);
    const ok = await request(app)
      .post('/customer/v1/auth/change-phone')
      .set('Authorization', `Bearer ${customer?.accessToken ?? ''}`)
      .send(body);
    expect(ok.status).toBe(200);
  });

  it('answers 503, not 404, when auth is not configured', async () => {
    const res = await request(createApp({ logger }))
      .post('/customer/v1/auth/login')
      .send({ phone: PHONE, otpToken: 'x', installation: DEVICE });
    expect(res.status).toBe(503);
  });
});
