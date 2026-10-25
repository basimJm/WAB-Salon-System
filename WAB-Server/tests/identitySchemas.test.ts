import { Types, type Model } from 'mongoose';
import { PERMISSIONS } from '../src/constants/enums';
import { AdminModel, type AdminRaw } from '../src/models/admin.model';
import { CustomerModel, type CustomerRaw } from '../src/models/customer.model';
import { InstallationModel, type InstallationRaw } from '../src/models/installation.model';
import { MemberModel, type MemberRaw } from '../src/models/member.model';
import { RefreshTokenModel, type RefreshTokenRaw } from '../src/models/refreshToken.model';
import {
  AdminsRepository,
  CustomersRepository,
  InstallationsRepository,
  MembersRepository,
  RefreshTokensRepository,
} from '../src/repositories/identity.repository';
import { createFakeModel } from './helpers/fakeModel';

type Doc = Record<string, unknown>;
interface Validatable {
  new (data: object): { validate(): Promise<unknown> };
}

/** Paths that fail validation (empty when valid). */
const failing = async (model: Validatable, data: object): Promise<string[]> => {
  try {
    await new model(data).validate();
    return [];
  } catch (error) {
    return Object.keys((error as { errors?: Record<string, unknown> }).errors ?? {}).sort();
  }
};
const oid = (): string => new Types.ObjectId().toHexString();
const indexes = (model: { schema: { indexes(): unknown[] } }): unknown[] => model.schema.indexes();

const customer = (): Doc => ({
  firstName: 'Lina',
  lastName: 'Haddad',
  email: 'lina@example.com',
  gender: 'FEMALE',
  phone: { countryCode: 'JO', dialCode: '+962', number: '791234567', e164: '+962791234567' },
  cityId: oid(),
  areaId: oid(),
});

describe('customer model', () => {
  it('accepts a full customer, with the documented defaults', async () => {
    expect(await failing(CustomerModel, customer())).toEqual([]);
    const doc = new CustomerModel(customer());
    expect([doc.language, doc.pushEnabled, doc.status]).toEqual(['ar', true, 'ACTIVE']);
    expect(CustomerModel.collection.name).toBe('customers');
  });

  it('requires name, email, gender, phone, city and area', async () => {
    expect(await failing(CustomerModel, {})).toEqual([
      'areaId',
      'cityId',
      'email',
      'firstName',
      'gender',
      'lastName',
      'phone',
    ]);
  });

  it('lowercases and trims the email and trims names', () => {
    const doc = new CustomerModel({
      ...customer(),
      email: '  Lina@Example.COM ',
      firstName: ' Lina ',
    });
    expect([doc.email, doc.firstName]).toEqual(['lina@example.com', 'Lina']);
  });

  it.each([
    ['email', 'not-an-email'],
    ['firstName', ''],
    ['firstName', '   '],
    ['firstName', 'x'.repeat(51)],
    ['gender', 'OTHER'],
    ['language', 'fr'],
    ['status', 'GONE'],
  ])('rejects %s = %j', async (field, value) => {
    expect(await failing(CustomerModel, { ...customer(), [field]: value })).toEqual([field]);
  });

  it('accepts names of exactly 1 and 50 characters and every status', async () => {
    expect(
      await failing(CustomerModel, { ...customer(), firstName: 'x'.repeat(50), lastName: 'y' }),
    ).toEqual([]);
    for (const status of ['ACTIVE', 'BLOCKED', 'DELETION_PENDING', 'DELETED']) {
      expect(await failing(CustomerModel, { ...customer(), status })).toEqual([]);
    }
  });

  it.each([
    [{ countryCode: 'jo' }, 'phone.countryCode'],
    [{ dialCode: '962' }, 'phone.dialCode'],
    [{ number: '79abc4567' }, 'phone.number'],
    [{ number: '123' }, 'phone.number'],
    [{ e164: '962791234567' }, 'phone.e164'],
    [{ e164: '+962799999999' }, 'phone.e164'],
  ])('rejects the phone change %j', async (change, path) => {
    const phone = { ...(customer()['phone'] as Doc), ...change };
    const paths = await failing(CustomerModel, { ...customer(), phone });
    expect(paths).toContain(path);
  });

  it('has the documented indexes', () => {
    expect(indexes(CustomerModel)).toEqual([
      [{ 'phone.e164': 1 }, expect.objectContaining({ unique: true })],
      [{ status: 1 }, expect.anything()],
      [{ createdAt: -1 }, expect.anything()],
      [
        { firstName: 'text', lastName: 'text', 'phone.e164': 'text' },
        expect.objectContaining({ default_language: 'none' }),
      ],
    ]);
  });
});

const member = (): Doc => ({
  salonId: oid(),
  firstName: 'Omar',
  lastName: 'Nasser',
  phone: '+962781234567',
  role: 'OWNER',
});

describe('member model', () => {
  it('accepts an owner with the defaults', async () => {
    expect(await failing(MemberModel, member())).toEqual([]);
    const doc = new MemberModel(member());
    expect([doc.active, doc.providesServices, doc.permissions.length]).toEqual([true, false, 0]);
    expect(MemberModel.collection.name).toBe('members');
  });

  it('requires salon, names, phone and role', async () => {
    expect(await failing(MemberModel, {})).toEqual([
      'firstName',
      'lastName',
      'phone',
      'role',
      'salonId',
    ]);
  });

  it('knows exactly the 15 permissions of the Merchant PRD', () => {
    expect([...PERMISSIONS].sort()).toEqual(
      [
        'DASHBOARD_VIEW',
        'BOOKINGS_VIEW_ALL',
        'BOOKINGS_VIEW_OWN',
        'BOOKINGS_RESPOND',
        'BOOKINGS_OPERATE',
        'SALON_PROFILE_MANAGE',
        'GALLERY_MANAGE',
        'WORKING_HOURS_MANAGE',
        'SERVICES_MANAGE',
        'STAFF_MANAGE',
        'POLICIES_MANAGE',
        'REVIEWS_VIEW',
        'STATISTICS_VIEW',
        'FINANCE_VIEW',
        'SUBSCRIPTION_VIEW',
      ].sort(),
    );
  });

  it('accepts granted permissions but never an owner-only capability', async () => {
    expect(
      await failing(MemberModel, {
        ...member(),
        role: 'MANAGER',
        permissions: ['BOOKINGS_RESPOND', 'FINANCE_VIEW'],
      }),
    ).toEqual([]);
    for (const ownerOnly of ['TEAM_MANAGE', 'PAYOUT_DETAILS_MANAGE', 'SALON_DELETE_REQUEST']) {
      const paths = await failing(MemberModel, { ...member(), permissions: [ownerOnly] });
      expect(paths.length).toBeGreaterThan(0);
    }
  });

  it.each([
    ['phone', '0781234567'],
    ['role', 'BOSS'],
  ])('rejects %s = %j', async (field, value) => {
    expect(await failing(MemberModel, { ...member(), [field]: value })).toEqual([field]);
  });

  it('needs a staff profile when the member provides services', async () => {
    expect(await failing(MemberModel, { ...member(), providesServices: true })).toEqual(['staff']);
    expect(await failing(MemberModel, { ...member(), providesServices: true, staff: {} })).toEqual(
      [],
    );
    const doc = new MemberModel({ ...member(), providesServices: true, staff: {} });
    expect(doc.staff).toMatchObject({
      brideQualified: false,
      customersCount: 0,
      rating: { avg: 0, count: 0 },
    });
    expect(doc.staff?.serviceIds).toHaveLength(0);
  });

  const staffWith = (staff: Doc): Doc => ({ ...member(), providesServices: true, staff });

  it.each([
    [{ day: 'MON', start: '09:00', end: '17:30' }, true],
    [{ day: 'MON' }, true],
    [{ day: 'SAT', start: '00:00', end: '23:59' }, true],
    [{ day: 'MON', start: '17:00', end: '09:00' }, false],
    [{ day: 'MON', start: '09:00', end: '09:00' }, false],
    [{ day: 'MON', start: '09:00' }, false],
    [{ day: 'MON', end: '09:00' }, false],
    [{ day: 'MON', start: '24:00', end: '25:00' }, false],
    [{ day: 'MON', start: '9:00', end: '17:00' }, false],
    [{ day: 'FUNDAY', start: '09:00', end: '17:00' }, false],
  ])('working day %j is valid: %s', async (workingDay, valid) => {
    const paths = await failing(MemberModel, staffWith({ workingDays: [workingDay] }));
    expect(paths.length === 0).toBe(valid);
  });

  it.each([
    [{ rating: { avg: 5.1, count: 1 } }],
    [{ rating: { avg: -1, count: 1 } }],
    [{ rating: { avg: 4, count: 1.5 } }],
    [{ customersCount: -1 }],
    [{ yearsOfExperience: 1.5 }],
    [{ yearsOfExperience: 81 }],
  ])('rejects the staff change %j', async (change) => {
    expect((await failing(MemberModel, staffWith(change))).length).toBeGreaterThan(0);
  });

  it('accepts the staff limits', async () => {
    expect(
      await failing(
        MemberModel,
        staffWith({ rating: { avg: 5, count: 0 }, yearsOfExperience: 80 }),
      ),
    ).toEqual([]);
  });

  it('has the documented indexes, including one owner per salon', () => {
    expect(indexes(MemberModel)).toEqual([
      [{ phone: 1 }, expect.objectContaining({ unique: true })],
      [{ salonId: 1, active: 1 }, expect.anything()],
      [{ salonId: 1, providesServices: 1, 'staff.serviceIds': 1 }, expect.anything()],
      [
        { salonId: 1 },
        expect.objectContaining({ unique: true, partialFilterExpression: { role: 'OWNER' } }),
      ],
      [{ branchId: 1, active: 1 }, expect.anything()],
    ]);
  });
});

const installation = (): Doc => ({
  installationId: 'fb-instance-0001',
  app: 'CUSTOMER',
  platform: 'ANDROID',
  appVersion: '1.0.0',
});

describe('installation model', () => {
  it('accepts a minimal installation with defaults', async () => {
    expect(await failing(InstallationModel, installation())).toEqual([]);
    const doc = new InstallationModel(installation());
    expect(doc.language).toBe('ar');
    expect(doc.lastSeenAt).toBeInstanceOf(Date);
    expect(InstallationModel.collection.name).toBe('installations');
  });

  it('requires id, app, platform and version', async () => {
    expect(await failing(InstallationModel, {})).toEqual([
      'app',
      'appVersion',
      'installationId',
      'platform',
    ]);
  });

  it.each([
    ['installationId', 'short'],
    ['installationId', 'has space in it'],
    ['app', 'ADMIN'],
    ['platform', 'WINDOWS'],
    ['language', 'fr'],
  ])('rejects %s = %j', async (field, value) => {
    expect(await failing(InstallationModel, { ...installation(), [field]: value })).toEqual([
      field,
    ]);
  });

  it('has the documented indexes', () => {
    expect(indexes(InstallationModel)).toEqual([
      [{ app: 1, installationId: 1 }, expect.objectContaining({ unique: true })],
      [{ customerId: 1 }, expect.anything()],
      [{ memberId: 1 }, expect.anything()],
      [{ fcmToken: 1 }, expect.anything()],
    ]);
  });
});

const refreshToken = (): Doc => ({
  subjectType: 'CUSTOMER',
  subjectId: oid(),
  tokenHash: 'a'.repeat(64),
  familyId: 'family-1',
  expiresAt: new Date('2026-12-01T00:00:00.000Z'),
});

describe('refresh token model', () => {
  it('accepts a token record and keeps the collection name of the domain', async () => {
    expect(await failing(RefreshTokenModel, refreshToken())).toEqual([]);
    expect(RefreshTokenModel.collection.name).toBe('refreshTokens');
  });

  it('requires subject, hash, family and expiry', async () => {
    expect(await failing(RefreshTokenModel, {})).toEqual([
      'expiresAt',
      'familyId',
      'subjectId',
      'subjectType',
      'tokenHash',
    ]);
  });

  it.each([
    'a'.repeat(63),
    'a'.repeat(65),
    'A'.repeat(64),
    'g'.repeat(64),
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln',
  ])('only stores a SHA-256 hex digest, not %j', async (tokenHash) => {
    expect(await failing(RefreshTokenModel, { ...refreshToken(), tokenHash })).toEqual([
      'tokenHash',
    ]);
  });

  it('rejects an unknown subject type', async () => {
    expect(await failing(RefreshTokenModel, { ...refreshToken(), subjectType: 'GUEST' })).toEqual([
      'subjectType',
    ]);
  });

  it('has a unique hash, a subject index and an expiry (TTL) index', () => {
    expect(indexes(RefreshTokenModel)).toEqual([
      [{ tokenHash: 1 }, expect.objectContaining({ unique: true })],
      [{ subjectType: 1, subjectId: 1 }, expect.anything()],
      [{ expiresAt: 1 }, expect.objectContaining({ expireAfterSeconds: 0 })],
    ]);
  });
});

describe('admin model', () => {
  const admin = (): Doc => ({
    email: 'Admin@Example.com',
    passwordHash: '$2b$12$abcdefghijklmnopqrstuv',
  });

  it('accepts an admin, lowercases the email and applies the defaults', async () => {
    expect(await failing(AdminModel, admin())).toEqual([]);
    const doc = new AdminModel(admin());
    expect([doc.email, doc.failedLoginCount, doc.alertEmails.length]).toEqual([
      'admin@example.com',
      0,
      0,
    ]);
    expect(AdminModel.collection.name).toBe('admins');
  });

  it('requires email and password hash', async () => {
    expect(await failing(AdminModel, {})).toEqual(['email', 'passwordHash']);
  });

  it('validates every alert address and keeps them lowercase', async () => {
    const doc = new AdminModel({ ...admin(), alertEmails: ['Ops@Example.com'] });
    expect(doc.alertEmails).toEqual(['ops@example.com']);
    expect(
      (await failing(AdminModel, { ...admin(), alertEmails: ['ok@example.com', 'bad'] })).length,
    ).toBeGreaterThan(0);
  });

  it.each([
    ['email', 'nope'],
    ['failedLoginCount', -1],
  ])('rejects %s = %j', async (field, value) => {
    expect(await failing(AdminModel, { ...admin(), [field]: value })).toEqual([field]);
  });

  it('has a unique email index', () => {
    expect(indexes(AdminModel)).toEqual([
      [{ email: 1 }, expect.objectContaining({ unique: true })],
    ]);
  });
});

describe('identity repositories', () => {
  it('finds a customer by E.164 number, whatever the status', async () => {
    const fake = createFakeModel();
    const repository = new CustomersRepository(fake.model as unknown as Model<CustomerRaw>);
    await repository.create({ status: 'BLOCKED', phone: { e164: '+962791234567' } } as never);
    await repository.create({ phone: { e164: '+962781234567' } } as never);
    expect(await repository.findByPhone('+962791234567')).toMatchObject({ status: 'BLOCKED' });
    expect(await repository.findByPhone('+962770000000')).toBeNull();
  });

  it('finds a member by phone', async () => {
    const repository = new MembersRepository(
      createFakeModel().model as unknown as Model<MemberRaw>,
    );
    const created = await repository.create({ phone: '+962781234567' });
    expect((await repository.findByPhone('+962781234567'))?.id).toBe(created.id);
    expect(await repository.findByPhone('+962791234567')).toBeNull();
  });

  it('finds an installation by app and installation id together', async () => {
    const repository = new InstallationsRepository(
      createFakeModel().model as unknown as Model<InstallationRaw>,
    );
    await repository.create({ app: 'CUSTOMER', installationId: 'fb-instance-0001' } as never);
    expect(await repository.findByInstallation('CUSTOMER', 'fb-instance-0001')).not.toBeNull();
    expect(await repository.findByInstallation('MERCHANT', 'fb-instance-0001')).toBeNull();
    expect(await repository.findByInstallation('CUSTOMER', 'fb-instance-0002')).toBeNull();
  });

  it('finds a refresh token by its hash only', async () => {
    const repository = new RefreshTokensRepository(
      createFakeModel().model as unknown as Model<RefreshTokenRaw>,
    );
    await repository.create({ tokenHash: 'b'.repeat(64) });
    expect(await repository.findByTokenHash('b'.repeat(64))).not.toBeNull();
    expect(await repository.findByTokenHash('c'.repeat(64))).toBeNull();
  });

  it('finds an admin by email, ignoring case and spaces', async () => {
    const repository = new AdminsRepository(createFakeModel().model as unknown as Model<AdminRaw>);
    await repository.create({ email: 'admin@example.com' });
    expect(await repository.findByEmail('  Admin@Example.COM ')).not.toBeNull();
    expect(await repository.findByEmail('other@example.com')).toBeNull();
  });
});
