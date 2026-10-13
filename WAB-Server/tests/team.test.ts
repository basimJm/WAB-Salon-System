import { Types } from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app';
import { PERMISSIONS } from '../src/constants/enums';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createAccountLifecycleService } from '../src/domain/auth/accountLifecycle.service';
import { createPhoneVerifier } from '../src/domain/auth/phoneVerifier';
import { createRefreshTokenService } from '../src/domain/auth/refreshTokens.service';
import { createTeamService } from '../src/domain/team/team.service';
import type { UploadVerifier } from '../src/domain/uploads/uploads.service';
import { requireAuth } from '../src/middlewares/auth';
import { loadMember } from '../src/middlewares/permission';
import { FakeOtpProvider } from '../src/providers/otp';
import { FakeStorageProvider } from '../src/providers/storage';
import {
  CustomersRepository,
  InstallationsRepository,
  MembersRepository,
  RefreshTokensRepository,
} from '../src/repositories/identity.repository';
import { CountriesRepository } from '../src/repositories/locations.repository';
import { signAccessToken } from '../src/utils/auth/accessToken';
import { ValidationError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const SECRET = 'a'.repeat(48);
const salonId = new Types.ObjectId();
const otherSalon = new Types.ObjectId();
const membersM = createFakeModel();
const installationsM = createFakeModel();
const tokensM = createFakeModel();
const countriesM = createFakeModel([
  { code: 'JO', dialCode: '+962', phoneRegex: '^7[789][0-9]{7}$', active: true },
]);
const members = new MembersRepository(membersM.model as never);
const refreshTokens = createRefreshTokenService({
  repository: new RefreshTokensRepository(tokensM.model as never),
  logger,
});
const checks: Parameters<UploadVerifier['assertConfirmed']>[0][] = [];
const verifier: { reject: string[] } & UploadVerifier = {
  reject: [],
  assertConfirmed(input) {
    checks.push(input);
    return input.keys.some((k) => this.reject.includes(k))
      ? Promise.reject(new ValidationError({ code: 'UPLOAD_INVALID' }))
      : Promise.resolve();
  },
};
const gate = {
  request: () => Promise.reject(new Error('x')),
  reportWrongAttempt: () => Promise.reject(new Error('x')),
  assertNotBlocked: () => Promise.resolve(),
  reset: () => Promise.resolve(),
};
const app = createApp({
  logger,
  services: {
    team: createTeamService({
      members,
      lifecycle: createAccountLifecycleService({
        customers: new CustomersRepository(createFakeModel().model as never),
        members,
        installations: new InstallationsRepository(installationsM.model as never),
        refreshTokens,
        storage: new FakeStorageProvider(),
        audit: { record: () => Promise.reject(new Error('unused')) },
        settings: { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) },
        logger,
      }),
      phones: createPhoneVerifier({
        countries: new CountriesRepository(countriesM.model as never),
        otp: new FakeOtpProvider(),
        otpGate: gate,
      }),
      storage: new FakeStorageProvider(),
      uploads: verifier,
    }),
    salonProfile: {
      service: undefined as never,
      guard: [requireAuth('merchant', SECRET), loadMember(members)],
    },
  },
});

interface Body {
  data: Record<string, unknown> & Record<string, unknown>[];
  meta?: { total: number };
  error: { code: string; details: { field: string; code: string }[] };
}
const bodyOf = (res: { body: unknown }): Body => res.body as Body;
const add = (
  role: string,
  permissions: string[] = [],
  over: Record<string, unknown> = {},
): { id: string; headers: Record<string, string> } => {
  const _id = new Types.ObjectId();
  membersM.docs.push({
    _id,
    salonId,
    firstName: role,
    lastName: 'X',
    phone: `+9627900000${String(membersM.docs.length).padStart(2, '0')}`,
    role,
    permissions,
    active: true,
    providesServices: false,
    ...over,
  });
  return {
    id: _id.toHexString(),
    headers: {
      Authorization: `Bearer ${signAccessToken({ secret: SECRET, subjectType: 'MEMBER', subjectId: _id.toHexString(), ttlSec: 600 }).token}`,
    },
  };
};
const NEW = {
  firstName: 'Lina',
  lastName: 'Odeh',
  phone: { countryCode: 'JO', number: '791234567' },
  role: 'EMPLOYEE',
};

beforeEach(() => {
  for (const f of [membersM, installationsM, tokensM]) f.docs.length = 0;
  checks.length = 0;
  verifier.reject = [];
});

describe('team: access', () => {
  it('reading needs STAFF_MANAGE; everything else is owner-only, even for a fully granted manager', async () => {
    const manager = add('MANAGER', [...PERMISSIONS]);
    const staffOnly = add('MANAGER', ['STAFF_MANAGE']);
    const employee = add('EMPLOYEE', ['REVIEWS_VIEW']);
    expect((await request(app).get('/merchant/v1/team/members').set(employee.headers)).status).toBe(
      403,
    );
    expect(
      (await request(app).get('/merchant/v1/team/members').set(staffOnly.headers)).status,
    ).toBe(200);
    for (const who of [manager, staffOnly]) {
      const created = await request(app)
        .post('/merchant/v1/team/members')
        .set(who.headers)
        .send(NEW);
      expect(created.status).toBe(403);
      expect(bodyOf(created).error.code).toBe('OWNER_REQUIRED');
      expect(
        (
          await request(app)
            .patch(`/merchant/v1/team/members/${employee.id}`)
            .set(who.headers)
            .send({ firstName: 'Z' })
        ).status,
      ).toBe(403);
      expect(
        (
          await request(app)
            .post(`/merchant/v1/team/members/${employee.id}/deactivate`)
            .set(who.headers)
        ).status,
      ).toBe(403);
    }
    expect((await request(app).get('/merchant/v1/team/members')).status).toBe(401);
  });

  it('lists only this salon’s members with effective permissions, paginated', async () => {
    const owner = add('OWNER');
    add('EMPLOYEE', ['REVIEWS_VIEW']);
    add('EMPLOYEE', [], { salonId: otherSalon });
    const res = await request(app).get('/merchant/v1/team/members?pageSize=10').set(owner.headers);
    expect(bodyOf(res).data).toHaveLength(2);
    expect(bodyOf(res).meta?.total).toBe(2);
    expect(bodyOf(res).data[0]?.['permissions']).toEqual(PERMISSIONS);
    expect(bodyOf(res).data[1]?.['permissions']).toEqual(['REVIEWS_VIEW']);
    const other = membersM.docs[2]?.['_id'];
    expect(
      (
        await request(app)
          .get(`/merchant/v1/team/members/${String(other)}`)
          .set(owner.headers)
      ).status,
    ).toBe(404);
  });
});

describe('team: add member', () => {
  it('creates a member from the role template with the normalized phone', async () => {
    const owner = add('OWNER');
    const res = await request(app).post('/merchant/v1/team/members').set(owner.headers).send(NEW);
    expect(res.status).toBe(201);
    expect(membersM.docs.at(-1)).toMatchObject({
      phone: '+962791234567',
      role: 'EMPLOYEE',
      active: true,
      providesServices: false,
      permissions: ['BOOKINGS_VIEW_OWN', 'REVIEWS_VIEW'],
    });
    expect(String(membersM.docs.at(-1)?.['salonId'])).toBe(salonId.toHexString());
    const manager = await request(app)
      .post('/merchant/v1/team/members')
      .set(owner.headers)
      .send({ ...NEW, role: 'MANAGER', phone: { countryCode: 'JO', number: '781234567' } });
    expect(bodyOf(manager).data['permissions']).toHaveLength(13);
  });

  it('accepts an explicit grant but never owner-only or unknown keys', async () => {
    const owner = add('OWNER');
    const ok = await request(app)
      .post('/merchant/v1/team/members')
      .set(owner.headers)
      .send({ ...NEW, permissions: ['FINANCE_VIEW', 'DASHBOARD_VIEW', 'FINANCE_VIEW'] });
    expect(bodyOf(ok).data['permissions']).toEqual(['DASHBOARD_VIEW', 'FINANCE_VIEW']);
    const before = membersM.docs.length;
    const bad = await request(app)
      .post('/merchant/v1/team/members')
      .set(owner.headers)
      .send({
        ...NEW,
        phone: { countryCode: 'JO', number: '771234567' },
        permissions: ['TEAM_MANAGE'],
      });
    expect(bad.status).toBe(400);
    expect(bodyOf(bad).error.details[0]?.code).toBe('OWNER_REQUIRED');
    expect(
      (
        await request(app)
          .post('/merchant/v1/team/members')
          .set(owner.headers)
          .send({
            ...NEW,
            phone: { countryCode: 'JO', number: '771234567' },
            permissions: ['NOPE'],
          })
      ).status,
    ).toBe(400);
    expect(membersM.docs).toHaveLength(before);
  });

  it.each([
    ['the OWNER role', { role: 'OWNER' }],
    ['an unknown country', { phone: { countryCode: 'XX', number: '791234567' } }],
    ['a bad number', { phone: { countryCode: 'JO', number: '123' } }],
    ['a blank name', { firstName: ' ' }],
  ])('rejects %s', async (_n, over) => {
    const owner = add('OWNER');
    const before = membersM.docs.length;
    expect(
      (
        await request(app)
          .post('/merchant/v1/team/members')
          .set(owner.headers)
          .send({ ...NEW, ...over })
      ).status,
    ).toBe(400);
    expect(membersM.docs).toHaveLength(before);
  });

  it('a number already used by any member of any salon is 409', async () => {
    const owner = add('OWNER');
    add('EMPLOYEE', [], { phone: '+962791234567', salonId: otherSalon });
    const res = await request(app).post('/merchant/v1/team/members').set(owner.headers).send(NEW);
    expect(res.status).toBe(409);
    expect(bodyOf(res).error.code).toBe('PHONE_ALREADY_REGISTERED');
  });

  it('a photo must be a confirmed MEMBER_PHOTO upload of this salon', async () => {
    const owner = add('OWNER');
    verifier.reject = ['members/bad.jpg'];
    expect(
      (
        await request(app)
          .post('/merchant/v1/team/members')
          .set(owner.headers)
          .send({ ...NEW, photoKey: 'members/bad.jpg' })
      ).status,
    ).toBe(400);
    const ok = await request(app)
      .post('/merchant/v1/team/members')
      .set(owner.headers)
      .send({ ...NEW, photoKey: 'members/good.jpg' });
    expect(ok.status).toBe(201);
    expect(checks.at(-1)).toMatchObject({ purpose: 'MEMBER_PHOTO' });
    expect(checks.at(-1)?.accept?.({ salonId: salonId.toHexString() } as never)).toBe(true);
    expect(checks.at(-1)?.accept?.({ salonId: 'x' } as never)).toBe(false);
    expect(String(bodyOf(ok).data['photoUrl'])).toContain('members/good.jpg');
  });
});

describe('team: change member', () => {
  it('changes name, photo, permissions; a new role without permissions resets to its template', async () => {
    const owner = add('OWNER');
    const member = add('EMPLOYEE', ['REVIEWS_VIEW']);
    const url = `/merchant/v1/team/members/${member.id}`;
    const named = await request(app)
      .patch(url)
      .set(owner.headers)
      .send({ firstName: 'Mona', permissions: ['STATISTICS_VIEW', 'DASHBOARD_VIEW'] });
    expect(named.status).toBe(200);
    expect(membersM.docs[1]).toMatchObject({
      firstName: 'Mona',
      permissions: ['DASHBOARD_VIEW', 'STATISTICS_VIEW'],
      role: 'EMPLOYEE',
    });
    const promoted = await request(app).patch(url).set(owner.headers).send({ role: 'MANAGER' });
    expect(promoted.status).toBe(200);
    expect(membersM.docs[1]?.['role']).toBe('MANAGER');
    expect((membersM.docs[1]?.['permissions'] as string[]).length).toBe(13);
    const both = await request(app)
      .patch(url)
      .set(owner.headers)
      .send({ role: 'EMPLOYEE', permissions: ['REVIEWS_VIEW'] });
    expect(bodyOf(both).data['permissions']).toEqual(['REVIEWS_VIEW']);
    await request(app).patch(url).set(owner.headers).send({ photoKey: 'members/p.jpg' });
    expect(membersM.docs[1]?.['photoKey']).toBe('members/p.jpg');
    await request(app).patch(url).set(owner.headers).send({ photoKey: null });
    expect(membersM.docs[1]?.['photoKey']).toBeUndefined();
  });

  it('a permission change applies on the very next request of that member', async () => {
    const owner = add('OWNER');
    const member = add('EMPLOYEE', []);
    expect((await request(app).get('/merchant/v1/team/members').set(member.headers)).status).toBe(
      403,
    );
    await request(app)
      .patch(`/merchant/v1/team/members/${member.id}`)
      .set(owner.headers)
      .send({ permissions: ['STAFF_MANAGE'] });
    expect((await request(app).get('/merchant/v1/team/members').set(member.headers)).status).toBe(
      200,
    );
  });

  it('the OWNER can change name and photo but never role or permissions (LAST_OWNER)', async () => {
    const owner = add('OWNER');
    const url = `/merchant/v1/team/members/${owner.id}`;
    expect(
      (await request(app).patch(url).set(owner.headers).send({ lastName: 'Boss' })).status,
    ).toBe(200);
    for (const body of [{ role: 'MANAGER' }, { permissions: [] }]) {
      const res = await request(app).patch(url).set(owner.headers).send(body);
      expect(res.status).toBe(422);
      expect(bodyOf(res).error.code).toBe('LAST_OWNER');
    }
    expect(membersM.docs[0]).toMatchObject({ role: 'OWNER', lastName: 'Boss' });
  });

  it('rejects an empty patch, bad values and members of other salons', async () => {
    const owner = add('OWNER');
    const member = add('EMPLOYEE');
    const url = `/merchant/v1/team/members/${member.id}`;
    expect((await request(app).patch(url).set(owner.headers).send({})).status).toBe(400);
    expect((await request(app).patch(url).set(owner.headers).send({ role: 'OWNER' })).status).toBe(
      400,
    );
    expect(
      (
        await request(app)
          .patch(url)
          .set(owner.headers)
          .send({ permissions: ['TEAM_MANAGE'] })
      ).status,
    ).toBe(400);
    const foreign = add('EMPLOYEE', [], { salonId: otherSalon });
    expect(
      (
        await request(app)
          .patch(`/merchant/v1/team/members/${foreign.id}`)
          .set(owner.headers)
          .send({ firstName: 'Z' })
      ).status,
    ).toBe(404);
    expect(membersM.docs[2]?.['firstName']).toBe('EMPLOYEE');
  });
});

describe('team: deactivate / reactivate', () => {
  it('deactivating ends every session and detaches devices; the member is locked out; reactivate restores', async () => {
    const owner = add('OWNER');
    const member = add('EMPLOYEE', ['STAFF_MANAGE']);
    await refreshTokens.issue({ subjectType: 'MEMBER', subjectId: member.id, ttlDays: 30 });
    installationsM.docs.push({
      _id: new Types.ObjectId(),
      app: 'MERCHANT',
      memberId: new Types.ObjectId(member.id),
      fcmToken: 't',
    });
    const off = await request(app)
      .post(`/merchant/v1/team/members/${member.id}/deactivate`)
      .set(owner.headers);
    expect(off.status).toBe(200);
    expect(bodyOf(off).data['active']).toBe(false);
    expect(tokensM.docs).toHaveLength(1);
    expect(tokensM.docs[0]?.['revokedAt']).toBeInstanceOf(Date);
    expect(installationsM.docs[0]?.['memberId']).toBeUndefined();
    const locked = await request(app).get('/merchant/v1/team/members').set(member.headers);
    expect(locked.status).toBe(403);
    expect(bodyOf(locked).error.code).toBe('MEMBER_INACTIVE');
    const on = await request(app)
      .post(`/merchant/v1/team/members/${member.id}/reactivate`)
      .set(owner.headers);
    expect(bodyOf(on).data['active']).toBe(true);
    expect((await request(app).get('/merchant/v1/team/members').set(member.headers)).status).toBe(
      200,
    );
  });

  it('the OWNER cannot be deactivated, other salons’ members are 404', async () => {
    const owner = add('OWNER');
    const res = await request(app)
      .post(`/merchant/v1/team/members/${owner.id}/deactivate`)
      .set(owner.headers);
    expect(res.status).toBe(422);
    expect(bodyOf(res).error.code).toBe('LAST_OWNER');
    const foreign = add('EMPLOYEE', [], { salonId: otherSalon });
    expect(
      (
        await request(app)
          .post(`/merchant/v1/team/members/${foreign.id}/deactivate`)
          .set(owner.headers)
      ).status,
    ).toBe(404);
    expect(membersM.docs[0]?.['active']).toBe(true);
  });

  it('answers 503 when unconfigured', async () => {
    expect((await request(createApp({ logger })).get('/merchant/v1/team/members')).status).toBe(
      503,
    );
  });
});
