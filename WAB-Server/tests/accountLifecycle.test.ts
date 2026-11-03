import { Types } from 'mongoose';
import { PURGE_BATCH_SIZE } from '../src/constants/accountLifecycle';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { MS_PER_DAY } from '../src/constants/time';
import {
  createAccountLifecycleService,
  type AdminActor,
} from '../src/domain/auth/accountLifecycle.service';
import { createRefreshTokenService } from '../src/domain/auth/refreshTokens.service';
import { createAuditWriter } from '../src/domain/audit';
import { FakeStorageProvider } from '../src/providers/storage';
import { fileSlotsKit, type FileSlotsKit } from './helpers/fileSlots';
import { AuditLogsRepository } from '../src/repositories/auditLogs.repository';
import {
  CustomersRepository,
  InstallationsRepository,
  MembersRepository,
  RefreshTokensRepository,
} from '../src/repositories/identity.repository';
import { createLogger } from '../src/utils/logger';
import { createFakeModel, type FakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const NOW = new Date('2026-10-12T10:00:00.000Z');
const ACTOR: AdminActor = {
  adminId: new Types.ObjectId().toHexString(),
  ip: '203.0.113.7',
  userAgent: 'jest',
};

interface Rig {
  service: ReturnType<typeof createAccountLifecycleService>;
  customers: FakeModel;
  members: FakeModel;
  installations: FakeModel;
  tokens: FakeModel;
  audit: FakeModel;
  storage: FakeStorageProvider;
  kit: FileSlotsKit;
  clock: { now: Date };
  revoked: string[];
  issue: (subjectType: 'CUSTOMER' | 'MEMBER', subjectId: string) => Promise<string>;
}

const setup = (): Rig => {
  const clock = { now: NOW };
  const customers = createFakeModel();
  const members = createFakeModel();
  const installations = createFakeModel();
  const tokens = createFakeModel();
  const audit = createFakeModel();
  const storage = new FakeStorageProvider();
  const kit = fileSlotsKit(storage);
  const revoked: string[] = [];
  const refreshTokens = createRefreshTokenService({
    repository: new RefreshTokensRepository(tokens.model as never),
    logger,
    now: () => clock.now,
  });
  const service = createAccountLifecycleService({
    customers: new CustomersRepository(customers.model as never),
    members: new MembersRepository(members.model as never),
    installations: new InstallationsRepository(installations.model as never),
    refreshTokens,
    files: kit.slots,
    audit: createAuditWriter(new AuditLogsRepository(audit.model as never)),
    settings: { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) },
    logger,
    access: {
      accessRevoked: (account) => {
        revoked.push(`${account.scope}:${account.id}`);
        return Promise.resolve();
      },
    },
    now: () => clock.now,
  });
  return {
    service,
    customers,
    members,
    installations,
    tokens,
    audit,
    storage,
    kit,
    clock,
    revoked,
    issue: async (subjectType, subjectId) =>
      (await refreshTokens.issue({ subjectType, subjectId, ttlDays: 90 })).token,
  };
};

const addCustomer = (rig: Rig, override: Record<string, unknown> = {}): string => {
  const _id = new Types.ObjectId();
  rig.customers.docs.push({
    _id,
    firstName: 'Lina',
    lastName: 'Haddad',
    email: 'lina@example.com',
    businessType: 'SALON',
    audience: 'FEMALE',
    phone: { countryCode: 'JO', dialCode: '+962', number: '791234567', e164: '+962791234567' },
    cityId: new Types.ObjectId(),
    areaId: new Types.ObjectId(),
    language: 'ar',
    pushEnabled: true,
    status: 'ACTIVE',
    ...override,
  });
  return _id.toHexString();
};
const addMember = (
  rig: Rig,
  salonId: Types.ObjectId,
  override: Record<string, unknown> = {},
): string => {
  const _id = new Types.ObjectId();
  rig.members.docs.push({
    _id,
    salonId,
    firstName: 'Sami',
    lastName: 'Nasser',
    phone: '+962781234567',
    role: 'EMPLOYEE',
    permissions: [],
    active: true,
    providesServices: false,
    ...override,
  });
  return _id.toHexString();
};
const doc = (model: FakeModel, id: string): Record<string, unknown> =>
  model.docs.find((d) => String(d['_id']) === id) ?? {};
const failure = async (promise: Promise<unknown>): Promise<Record<string, unknown>> =>
  await promise.then(
    () => ({}),
    (error: unknown) => error as Record<string, unknown>,
  );
const allRevoked = (rig: Rig, subjectId: string): boolean => {
  const mine = rig.tokens.docs.filter((d) => String(d['subjectId']) === subjectId);
  return mine.length > 0 && mine.every((d) => d['revokedAt'] !== undefined);
};

describe('account lifecycle: blocking', () => {
  it('blocks a customer, ends every session and writes the audit entry with the reason', async () => {
    const rig = setup();
    const id = addCustomer(rig);
    await rig.issue('CUSTOMER', id);
    await rig.issue('CUSTOMER', id);
    await rig.service.blockCustomer({ customerId: id, reason: 'fraud report', actor: ACTOR });
    expect(doc(rig.customers, id)).toMatchObject({
      status: 'BLOCKED',
      blockedReason: 'fraud report',
      blockedAt: NOW,
    });
    expect(allRevoked(rig, id)).toBe(true);
    expect(rig.revoked).toEqual([`customer:${id}`]);
    expect(rig.tokens.docs.every((d) => d['revokedReason'] === 'ACCOUNT_BLOCKED')).toBe(true);
    expect(rig.audit.docs).toHaveLength(1);
    expect(rig.audit.docs[0]).toMatchObject({
      adminId: ACTOR.adminId,
      action: 'CUSTOMER_BLOCK',
      entityType: 'customer',
      entityId: id,
      before: { status: 'ACTIVE' },
      after: { status: 'BLOCKED' },
      reason: 'fraud report',
      ip: ACTOR.ip,
    });
  });

  it('does not touch other customers', async () => {
    const rig = setup();
    const id = addCustomer(rig);
    const other = addCustomer(rig);
    await rig.issue('CUSTOMER', other);
    await rig.service.blockCustomer({ customerId: id, reason: 'x', actor: ACTOR });
    expect(doc(rig.customers, other)['status']).toBe('ACTIVE');
    expect(rig.tokens.docs[0]?.['revokedAt']).toBeUndefined();
  });

  it('is a no-op the second time (no second audit entry) and refuses a deleted account', async () => {
    const rig = setup();
    const id = addCustomer(rig);
    await rig.service.blockCustomer({ customerId: id, reason: 'x', actor: ACTOR });
    await rig.service.blockCustomer({ customerId: id, reason: 'again', actor: ACTOR });
    expect(rig.audit.docs).toHaveLength(1);
    const gone = addCustomer(rig, { status: 'DELETED' });
    expect(
      await failure(rig.service.blockCustomer({ customerId: gone, reason: 'x', actor: ACTOR })),
    ).toMatchObject({
      httpStatus: 409,
    });
  });

  it('blocks a customer who is waiting for deletion, and unblocking returns an active account', async () => {
    const rig = setup();
    const id = addCustomer(rig, {
      status: 'DELETION_PENDING',
      deletionRequestedAt: NOW,
      deletionScheduledAt: new Date(NOW.getTime() + 30 * MS_PER_DAY),
    });
    await rig.service.blockCustomer({ customerId: id, reason: 'x', actor: ACTOR });
    expect(doc(rig.customers, id)['status']).toBe('BLOCKED');
    await rig.service.unblockCustomer({ customerId: id, reason: 'appeal accepted', actor: ACTOR });
    expect(doc(rig.customers, id)['status']).toBe('ACTIVE');
    for (const field of [
      'blockedReason',
      'blockedAt',
      'deletionRequestedAt',
      'deletionScheduledAt',
    ]) {
      expect(doc(rig.customers, id)[field]).toBeUndefined();
    }
    expect(rig.audit.docs.map((d) => d['action'])).toEqual(['CUSTOMER_BLOCK', 'CUSTOMER_UNBLOCK']);
  });

  it('refuses to unblock an account that is not blocked, and unknown customers are 404', async () => {
    const rig = setup();
    const id = addCustomer(rig);
    expect(
      await failure(rig.service.unblockCustomer({ customerId: id, reason: 'x', actor: ACTOR })),
    ).toMatchObject({
      httpStatus: 409,
    });
    expect(
      await failure(
        rig.service.blockCustomer({
          customerId: new Types.ObjectId().toHexString(),
          reason: 'x',
          actor: ACTOR,
        }),
      ),
    ).toMatchObject({ httpStatus: 404 });
    expect(
      await failure(rig.service.blockCustomer({ customerId: 'bad', reason: 'x', actor: ACTOR })),
    ).toMatchObject({
      httpStatus: 404,
    });
  });

  it('a blank reason is rejected by the audit rules (an admin write needs a reason)', async () => {
    const rig = setup();
    const id = addCustomer(rig);
    expect(
      await failure(rig.service.blockCustomer({ customerId: id, reason: '  ', actor: ACTOR })),
    ).toBeDefined();
    expect(rig.audit.docs).toHaveLength(0);
  });
});

describe('account lifecycle: deletion request', () => {
  it('starts a 30-day grace period, ends every session and detaches the devices', async () => {
    const rig = setup();
    const id = addCustomer(rig);
    await rig.issue('CUSTOMER', id);
    rig.installations.docs.push({
      _id: new Types.ObjectId(),
      customerId: new Types.ObjectId(id),
      app: 'CUSTOMER',
    });
    rig.installations.docs.push({
      _id: new Types.ObjectId(),
      customerId: new Types.ObjectId(),
      app: 'CUSTOMER',
    });
    const { deletionScheduledAt } = await rig.service.requestCustomerDeletion({ customerId: id });
    expect(deletionScheduledAt).toEqual(new Date(NOW.getTime() + 30 * MS_PER_DAY));
    expect(doc(rig.customers, id)).toMatchObject({
      status: 'DELETION_PENDING',
      deletionRequestedAt: NOW,
      deletionScheduledAt,
    });
    expect(allRevoked(rig, id)).toBe(true);
    expect(rig.revoked).toEqual([`customer:${id}`]);
    expect(rig.installations.docs[0]?.['customerId']).toBeUndefined();
    expect(rig.installations.docs[1]?.['customerId']).toBeDefined();
  });

  it('refuses a customer who is not active (already pending, blocked, deleted)', async () => {
    const rig = setup();
    for (const status of ['DELETION_PENDING', 'BLOCKED', 'DELETED']) {
      const id = addCustomer(rig, { status });
      expect(await failure(rig.service.requestCustomerDeletion({ customerId: id }))).toMatchObject({
        httpStatus: 409,
      });
    }
  });

  it('two simultaneous requests: one wins', async () => {
    const rig = setup();
    const id = addCustomer(rig);
    const results = await Promise.allSettled([
      rig.service.requestCustomerDeletion({ customerId: id }),
      rig.service.requestCustomerDeletion({ customerId: id }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled').length).toBeGreaterThanOrEqual(1);
    expect(doc(rig.customers, id)['status']).toBe('DELETION_PENDING');
  });

  it('reads the grace period from the settings', async () => {
    const rig = setup();
    const id = addCustomer(rig);
    const service = createAccountLifecycleService({
      customers: new CustomersRepository(rig.customers.model as never),
      members: new MembersRepository(rig.members.model as never),
      installations: new InstallationsRepository(rig.installations.model as never),
      refreshTokens: createRefreshTokenService({
        repository: new RefreshTokensRepository(rig.tokens.model as never),
        logger,
      }),
      files: rig.kit.slots,
      audit: createAuditWriter(new AuditLogsRepository(rig.audit.model as never)),
      settings: { get: () => Promise.resolve(7 as never) },
      logger,
      now: () => NOW,
    });
    const { deletionScheduledAt } = await service.requestCustomerDeletion({ customerId: id });
    expect(deletionScheduledAt).toEqual(new Date(NOW.getTime() + 7 * MS_PER_DAY));
  });
});

describe('account lifecycle: purge', () => {
  const pending = (
    rig: Rig,
    scheduledInDays: number,
    override: Record<string, unknown> = {},
  ): string =>
    addCustomer(rig, {
      status: 'DELETION_PENDING',
      deletionRequestedAt: new Date(NOW.getTime() - 30 * MS_PER_DAY),
      deletionScheduledAt: new Date(NOW.getTime() + scheduledInDays * MS_PER_DAY),
      ...override,
    });

  it('anonymizes accounts whose grace period ended and leaves the others alone', async () => {
    const rig = setup();
    const due = pending(rig, -1);
    const stillWaiting = pending(rig, 1);
    const active = addCustomer(rig);
    expect(await rig.service.purgeDueCustomers()).toBe(1);
    expect(doc(rig.customers, due)).toMatchObject({
      status: 'DELETED',
      firstName: 'Deleted',
      lastName: 'User',
      email: `${due}@deleted.invalid`,
      pushEnabled: false,
      phone: { e164: `deleted:${due}`, number: 'deleted', countryCode: 'JO', dialCode: '+962' },
    });
    expect(doc(rig.customers, stillWaiting)['status']).toBe('DELETION_PENDING');
    expect(doc(rig.customers, active)['status']).toBe('ACTIVE');
  });

  it('is exact at the boundary: due at the scheduled instant, not before', async () => {
    const rig = setup();
    const id = pending(rig, 0);
    rig.clock.now = new Date(NOW.getTime() - 1);
    expect(await rig.service.purgeDueCustomers()).toBe(0);
    rig.clock.now = NOW;
    expect(await rig.service.purgeDueCustomers()).toBe(1);
    expect(doc(rig.customers, id)['status']).toBe('DELETED');
  });

  it('removes the personal data and the avatar, frees the phone number and ends devices and sessions', async () => {
    const rig = setup();
    const id = pending(rig, -1, { avatarKey: 'avatars/lina.jpg', lastActiveAt: NOW });
    await rig.issue('CUSTOMER', id);
    rig.installations.docs.push({ _id: new Types.ObjectId(), customerId: new Types.ObjectId(id) });
    await rig.service.purgeDueCustomers();
    expect(doc(rig.customers, id)['avatarKey']).toBeUndefined();
    expect(doc(rig.customers, id)['lastActiveAt']).toBeUndefined();
    expect(rig.kit.queued()).toEqual(
      expect.arrayContaining(['avatars/lina.jpg', 'avatars/lina_thumb.webp']),
    );
    expect(rig.installations.docs[0]?.['customerId']).toBeUndefined();
    expect(allRevoked(rig, id)).toBe(true);
    const everything = JSON.stringify(doc(rig.customers, id));
    expect(everything).not.toContain('791234567');
    expect(everything).not.toContain('lina@example.com');
  });

  it('a failing avatar delete does not undo the anonymization', async () => {
    const rig = setup();
    const id = pending(rig, -1, { avatarKey: 'avatars/lina.jpg' });
    jest.spyOn(rig.kit.slots, 'remove').mockRejectedValueOnce(new Error('mongo down'));
    expect(await rig.service.purgeDueCustomers()).toBe(1);
    expect(doc(rig.customers, id)['status']).toBe('DELETED');
  });

  it('runs again without effect, and works through more than one batch', async () => {
    const rig = setup();
    for (let i = 0; i < PURGE_BATCH_SIZE + 5; i += 1) pending(rig, -1);
    expect(await rig.service.purgeDueCustomers()).toBe(PURGE_BATCH_SIZE + 5);
    expect(await rig.service.purgeDueCustomers()).toBe(0);
    expect(rig.customers.docs.every((d) => d['status'] === 'DELETED')).toBe(true);
    const emails = new Set(rig.customers.docs.map((d) => d['email']));
    expect(emails.size).toBe(PURGE_BATCH_SIZE + 5);
  });

  it('never touches blocked accounts, even with a deletion date in the past', async () => {
    const rig = setup();
    const id = pending(rig, -1, { status: 'BLOCKED' });
    expect(await rig.service.purgeDueCustomers()).toBe(0);
    expect(doc(rig.customers, id)['status']).toBe('BLOCKED');
  });
});

describe('account lifecycle: members', () => {
  it('deactivates a member: access off, sessions ended, devices detached; repeating is harmless', async () => {
    const rig = setup();
    const salon = new Types.ObjectId();
    const id = addMember(rig, salon);
    await rig.issue('MEMBER', id);
    rig.installations.docs.push({ _id: new Types.ObjectId(), memberId: new Types.ObjectId(id) });
    await rig.service.deactivateMember({ memberId: id, salonId: salon.toHexString() });
    await rig.service.deactivateMember({ memberId: id, salonId: salon.toHexString() });
    expect(doc(rig.members, id)['active']).toBe(false);
    expect(rig.revoked).toEqual([`merchant:${id}`]);
    expect(allRevoked(rig, id)).toBe(true);
    expect(rig.installations.docs[0]?.['memberId']).toBeUndefined();
  });

  it('never deactivates the owner', async () => {
    const rig = setup();
    const salon = new Types.ObjectId();
    const id = addMember(rig, salon, { role: 'OWNER' });
    expect(
      await failure(rig.service.deactivateMember({ memberId: id, salonId: salon.toHexString() })),
    ).toMatchObject({ code: 'LAST_OWNER', httpStatus: 422 });
    expect(doc(rig.members, id)['active']).toBe(true);
  });

  it('a member of another salon looks like a missing one', async () => {
    const rig = setup();
    const id = addMember(rig, new Types.ObjectId());
    expect(
      await failure(
        rig.service.deactivateMember({ memberId: id, salonId: new Types.ObjectId().toHexString() }),
      ),
    ).toMatchObject({ httpStatus: 404 });
    expect(doc(rig.members, id)['active']).toBe(true);
  });

  it('reactivates a member of the same salon only', async () => {
    const rig = setup();
    const salon = new Types.ObjectId();
    const id = addMember(rig, salon, { active: false });
    expect(
      await failure(
        rig.service.reactivateMember({ memberId: id, salonId: new Types.ObjectId().toHexString() }),
      ),
    ).toMatchObject({ httpStatus: 404 });
    await rig.service.reactivateMember({ memberId: id, salonId: salon.toHexString() });
    expect(doc(rig.members, id)['active']).toBe(true);
  });
});
