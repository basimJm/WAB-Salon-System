import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { createRefreshTokenService } from '../src/domain/auth/refreshTokens.service';
import type { OtpGate } from '../src/domain/otp/otpGate.service';
import { createSalonApplicationService } from '../src/domain/salons/salonApplication.service';
import type { UploadVerifier } from '../src/domain/uploads/uploads.service';
import { requireAuth } from '../src/middlewares/auth';
import { SalonModel } from '../src/models/salon.model';
import { proofFor, testOtp } from './helpers/otp';
import {
  InstallationsRepository,
  MembersRepository,
  RefreshTokensRepository,
} from '../src/repositories/identity.repository';
import {
  AreasRepository,
  CitiesRepository,
  CountriesRepository,
} from '../src/repositories/locations.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { signAccessToken, verifyAccessToken } from '../src/utils/auth/accessToken';
import { RateLimitError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';
import { createFakeModel, type FakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const NOW = new Date('2026-10-12T10:00:00.000Z');
const E164 = '+962791234567';
const cityId = new Types.ObjectId();
const areaId = new Types.ObjectId();
const BODY = {
  phone: { countryCode: 'JO', number: '791234567' },
  /** Replaced by a fresh single-use token on every send. */
  otpToken: '',
  firstName: 'Sami',
  lastName: 'Nasser',
  salon: {
    name: 'Glow',
    businessType: 'SALON',
    audience: 'FEMALE',
    cityId: cityId.toHexString(),
    areaId: areaId.toHexString(),
  },
  documentKeys: ['licenses/doc-1.pdf'],
  installation: { installationId: 'install-device-0001', platform: 'ANDROID', appVersion: '1.0.0' },
};

interface Rig {
  app: ReturnType<typeof createApp>;
  salons: FakeModel;
  members: FakeModel;
  installations: FakeModel;
  blocked: { value: boolean };
  resets: string[];
}

const setup = (uploads?: UploadVerifier): Rig => {
  const countries = createFakeModel([
    { code: 'JO', dialCode: '+962', phoneRegex: '^7[789][0-9]{7}$', active: true },
  ]);
  const cities = createFakeModel([{ _id: cityId, active: true }]);
  const areas = createFakeModel([{ _id: areaId, cityId, active: true }]);
  const salons = createFakeModel();
  const members = createFakeModel();
  const installations = createFakeModel();
  const tokens = createFakeModel();
  const blocked = { value: false };
  const resets: string[] = [];
  const gate: OtpGate = {
    request: () => Promise.reject(new Error('unused')),
    reportWrongAttempt: () => Promise.reject(new Error('unused')),
    assertNotBlocked: () =>
      blocked.value
        ? Promise.reject(new RateLimitError({ code: 'OTP_BLOCKED' }))
        : Promise.resolve(),
    reset: (e164) => {
      resets.push(e164);
      return Promise.resolve();
    },
  };
  const service = createSalonApplicationService({
    salons: new SalonsRepository(salons.model as never),
    members: new MembersRepository(members.model as never),
    installations: new InstallationsRepository(installations.model as never),
    countries: new CountriesRepository(countries.model as never),
    cities: new CitiesRepository(cities.model as never),
    areas: new AreasRepository(areas.model as never),
    otp: testOtp,
    otpGate: gate,
    refreshTokens: createRefreshTokenService({
      repository: new RefreshTokensRepository(tokens.model as never),
      logger,
      now: () => NOW,
    }),
    settings: { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) },
    accessSecret: SECRET,
    ...(uploads === undefined ? {} : { uploads }),
    now: () => NOW,
  });
  const app = createApp({
    logger,
    services: { salonApplication: { service, guard: requireAuth('merchant', SECRET) } },
  });
  return { app, salons, members, installations, blocked, resets };
};

interface Body {
  data: Record<string, unknown> & {
    application: Record<string, unknown>;
    member: Record<string, unknown>;
  };
  error: { code: string; details: { field: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const memberToken = (id: string): string =>
  signAccessToken({ secret: SECRET, subjectType: 'MEMBER', subjectId: id, ttlSec: 600 }).token;
const apply = async (
  rig: Rig,
  over: Record<string, unknown> = {},
): Promise<{ status: number; body: unknown }> =>
  await request(rig.app)
    .post('/merchant/v1/salon/applications')
    .send({ ...BODY, otpToken: proofFor(E164, 'REGISTER'), ...over });

describe('salon model', () => {
  it('starts with seven days off and default completeness', async () => {
    const doc = new SalonModel({
      name: 'X',
      businessType: 'SALON',
      audience: 'MALE',
      state: 'APPLICATION_PENDING',
      application: { submittedAt: NOW, documentKeys: ['k'] },
    });
    await expect(doc.validate()).resolves.toBeUndefined();
    expect(doc.weeklySchedule).toHaveLength(7);
    expect(doc.weeklySchedule.every((d) => d.isOff)).toBe(true);
    expect(doc.completeness.isComplete).toBe(false);
  });

  it('rejects a policy without payment options and an unknown state', async () => {
    const doc = new SalonModel({
      name: 'X',
      businessType: 'SALON',
      audience: 'MALE',
      state: 'NOPE',
      application: { submittedAt: NOW },
      policy: {
        cancellationWindowHours: 1,
        paymentOptions: [],
        depositRefundableOnCustomerCancel: true,
        fullPaymentRefundOnCustomerCancel: 'FULL',
        noShowDeposit: 'KEEP',
        noShowFullPayment: 'KEEP',
      },
    });
    const error = await doc.validate().then(
      () => undefined,
      (e: unknown) => e as { errors: Record<string, unknown> },
    );
    const paths = Object.keys(error?.errors ?? {});
    expect(paths).toEqual(expect.arrayContaining(['state', 'policy.paymentOptions']));
  });
});

describe('POST /merchant/v1/salon/applications', () => {
  it('creates a pending salon, an OWNER member and a merchant session', async () => {
    const rig = setup();
    const res = await apply(rig);
    expect(res.status).toBe(201);
    const data = bodyOf(res).data;
    expect(data.application).toMatchObject({ state: 'APPLICATION_PENDING', resubmissionCount: 0 });
    expect(data.member).toMatchObject({ role: 'OWNER', phone: E164 });
    expect(rig.salons.docs[0]).toMatchObject({
      name: 'Glow',
      businessType: 'SALON',
      audience: 'FEMALE',
      state: 'APPLICATION_PENDING',
    });
    expect(rig.members.docs[0]).toMatchObject({ role: 'OWNER', active: true, phone: E164 });
    expect(String(rig.members.docs[0]?.['salonId'])).toBe(String(rig.salons.docs[0]?.['_id']));
    expect(verifyAccessToken(SECRET, String(data['accessToken']), NOW)).toMatchObject({
      scope: 'merchant',
    });
    expect(rig.installations.docs[0]?.['memberId']).toBeDefined();
    expect(rig.resets).toEqual([E164]);
  });

  it('refuses a number that already belongs to a member and creates nothing', async () => {
    const rig = setup();
    rig.members.docs.push({
      _id: new Types.ObjectId(),
      phone: E164,
      role: 'EMPLOYEE',
      active: true,
    });
    const res = await apply(rig);
    expect(res.status).toBe(409);
    expect(bodyOf(res).error.code).toBe('PHONE_ALREADY_REGISTERED');
    expect(rig.salons.docs).toHaveLength(0);
  });

  it.each([
    ['proof for another number', { otpToken: proofFor('+962781234567', 'REGISTER') }, 401],
    ['expired proof', { otpToken: proofFor(E164, 'REGISTER', 'expired') }, 401],
    ['unknown country', { phone: { countryCode: 'XX', number: '791234567' } }, 400],
    ['bad number', { phone: { countryCode: 'JO', number: '123' } }, 400],
    ['no documents', { documentKeys: [] }, 400],
    ['six documents', { documentKeys: ['a', 'b', 'c', 'd', 'e', 'f'] }, 400],
    ['duplicate documents', { documentKeys: ['a/b', 'a/b'] }, 400],
    ['path traversal key', { documentKeys: ['../etc/passwd'] }, 400],
    ['blank salon name', { salon: { name: ' ', businessType: 'SALON', audience: 'MALE' } }, 400],
    ['unknown business type', { salon: { name: 'X', businessType: 'SPA', audience: 'BOTH' } }, 400],
    ['unknown audience', { salon: { name: 'X', businessType: 'SALON', audience: 'KIDS' } }, 400],
    ['a salon without an audience', { salon: { name: 'X', businessType: 'SALON' } }, 400],
    ['the old gender field only', { salon: { name: 'X', gender: 'MALE' } }, 400],
  ])('rejects %s and stores nothing', async (_name, over, status) => {
    const rig = setup();
    const res = await apply(rig, over);
    expect(res.status).toBe(status);
    expect(rig.salons.docs).toHaveLength(0);
    expect(rig.members.docs).toHaveLength(0);
  });

  it('rejects an area outside the city and a blocked number', async () => {
    const rig = setup();
    const other = new Types.ObjectId().toHexString();
    const res = await apply(rig, { salon: { ...BODY.salon, cityId: other } });
    expect(res.status).toBe(400);
    expect(bodyOf(res).error.details.map((d) => d.field)).toContain('body.salon.areaId');
    rig.blocked.value = true;
    expect((await apply(rig)).status).toBe(429);
    expect(rig.salons.docs).toHaveLength(0);
  });

  it('a SALON may serve BOTH; a CLINIC is always BOTH whatever is sent (§5.19)', async () => {
    const both = setup();
    const res = await apply(both, {
      salon: { name: 'Unity', businessType: 'SALON', audience: 'BOTH' },
    });
    expect(res.status).toBe(201);
    expect(both.salons.docs[0]).toMatchObject({ businessType: 'SALON', audience: 'BOTH' });
    const clinic = setup();
    const made = await apply(clinic, {
      salon: { name: 'Glow Clinic', businessType: 'CLINIC', audience: 'MALE' },
    });
    expect(made.status).toBe(201);
    expect(clinic.salons.docs[0]).toMatchObject({ businessType: 'CLINIC', audience: 'BOTH' });
  });

  it('works without city and area', async () => {
    const rig = setup();
    const res = await apply(rig, {
      salon: { name: 'Glow', businessType: 'SALON', audience: 'MALE' },
    });
    expect(res.status).toBe(201);
    expect(rig.salons.docs[0]?.['cityId']).toBeUndefined();
  });

  it('removes the salon when the owner cannot be created (number race)', async () => {
    const rig = setup();
    (rig.members.model as unknown as { create: unknown }).create = (): Promise<never> =>
      Promise.reject(Object.assign(new Error('dup'), { code: 11000 }));
    const res = await apply(rig);
    expect(res.status).toBe(409);
    expect(rig.salons.docs).toHaveLength(0);
  });

  it('answers 503 when unconfigured', async () => {
    const res = await request(createApp({ logger }))
      .post('/merchant/v1/salon/applications')
      .send({ ...BODY, otpToken: proofFor(E164, 'REGISTER') });
    expect(res.status).toBe(503);
  });
});

describe('application status and resubmission', () => {
  const owner = async (rig: Rig): Promise<{ token: string; salonId: string }> => {
    const res = await apply(rig);
    const data = bodyOf(res).data;
    // The service signs with the fixed test clock; the guard checks the real one, so sign afresh.
    return {
      token: memberToken(String(data.member['id'])),
      salonId: String(data.application['salonId']),
    };
  };
  const reject = (rig: Rig): void => {
    Object.assign(rig.salons.docs[0] ?? {}, {
      state: 'APPLICATION_REJECTED',
      application: {
        ...(rig.salons.docs[0]?.['application'] as object),
        rejectionReason: 'blurry license',
      },
    });
  };

  it('shows the state and the rejection reason', async () => {
    const rig = setup();
    const { token } = await owner(rig);
    const pending = await request(rig.app)
      .get('/merchant/v1/salon/application')
      .set('Authorization', `Bearer ${token}`);
    expect(bodyOf(pending).data).toMatchObject({
      state: 'APPLICATION_PENDING',
      rejectionReason: null,
    });
    reject(rig);
    const rejected = await request(rig.app)
      .get('/merchant/v1/salon/application')
      .set('Authorization', `Bearer ${token}`);
    expect(bodyOf(rejected).data).toMatchObject({
      state: 'APPLICATION_REJECTED',
      rejectionReason: 'blurry license',
    });
  });

  it('resubmits a rejected application: pending again, counter up, reason cleared, changes applied', async () => {
    const rig = setup();
    const { token } = await owner(rig);
    reject(rig);
    const res = await request(rig.app)
      .post('/merchant/v1/salon/application/resubmit')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Glow Studio', documentKeys: ['licenses/new.pdf'] });
    expect(res.status).toBe(200);
    expect(bodyOf(res).data).toMatchObject({
      state: 'APPLICATION_PENDING',
      resubmissionCount: 1,
      rejectionReason: null,
    });
    expect(rig.salons.docs[0]).toMatchObject({ name: 'Glow Studio', state: 'APPLICATION_PENDING' });
    expect(
      (rig.salons.docs[0]?.['application'] as { documentKeys: string[] }).documentKeys,
    ).toEqual(['licenses/new.pdf']);
  });

  it('refuses to resubmit unless the application was rejected', async () => {
    const rig = setup();
    const { token } = await owner(rig);
    const res = await request(rig.app)
      .post('/merchant/v1/salon/application/resubmit')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(422);
    expect(bodyOf(res).error.code).toBe('INVALID_TRANSITION');
  });

  it('only the owner can see or change the application; tokens are required', async () => {
    const rig = setup();
    await owner(rig);
    const employee = new Types.ObjectId();
    rig.members.docs.push({
      _id: employee,
      salonId: rig.salons.docs[0]?.['_id'],
      role: 'EMPLOYEE',
      active: true,
    });
    const forbidden = await request(rig.app)
      .get('/merchant/v1/salon/application')
      .set('Authorization', `Bearer ${memberToken(employee.toHexString())}`);
    expect(forbidden.status).toBe(403);
    expect((await request(rig.app).get('/merchant/v1/salon/application')).status).toBe(401);
    const stranger = await request(rig.app)
      .get('/merchant/v1/salon/application')
      .set('Authorization', `Bearer ${memberToken(new Types.ObjectId().toHexString())}`);
    expect(stranger.status).toBe(401);
  });
});

describe('license documents must be confirmed uploads', () => {
  const verifier = (
    fail: boolean,
  ): { calls: Parameters<UploadVerifier['assertConfirmed']>[0][] } & UploadVerifier => ({
    calls: [],
    assertConfirmed(input) {
      this.calls.push(input);
      return fail ? Promise.reject(new Error('UPLOAD_INVALID')) : Promise.resolve();
    },
  });

  it('apply checks the keys as guest-owned license documents and stops on a bad one', async () => {
    const ok = verifier(false);
    const rig = setup(ok);
    expect((await apply(rig)).status).toBe(201);
    expect(ok.calls[0]).toMatchObject({
      keys: BODY.documentKeys,
      purpose: 'LICENSE_DOCUMENT',
      field: 'body.documentKeys',
    });
    expect(ok.calls[0]?.accept?.({ ownerType: 'GUEST' } as never)).toBe(true);
    expect(ok.calls[0]?.accept?.({ ownerType: 'MEMBER' } as never)).toBe(false);
    const bad = setup(verifier(true));
    expect((await apply(bad)).status).toBe(500);
    expect(bad.salons.docs).toHaveLength(0);
    expect(bad.members.docs).toHaveLength(0);
  });

  it('resubmit keeps the keys already on the application and accepts new ones only from this salon', async () => {
    const check = verifier(false);
    const rig = setup(check);
    const res = await apply(rig);
    const data = bodyOf(res).data;
    const token = memberToken(String(data.member['id']));
    Object.assign(rig.salons.docs[0] ?? {}, { state: 'APPLICATION_REJECTED' });
    check.calls.length = 0;
    const again = await request(rig.app)
      .post('/merchant/v1/salon/application/resubmit')
      .set('Authorization', `Bearer ${token}`)
      .send({ documentKeys: ['licenses/doc-1.pdf', 'licenses/new.pdf'] });
    expect(again.status).toBe(200);
    expect(check.calls[0]).toMatchObject({
      allow: ['licenses/doc-1.pdf'],
      purpose: 'LICENSE_DOCUMENT',
    });
    const salonId = String(rig.salons.docs[0]?.['_id']);
    expect(check.calls[0]?.accept?.({ salonId } as never)).toBe(true);
    expect(check.calls[0]?.accept?.({ salonId: 'other' } as never)).toBe(false);
  });
});
