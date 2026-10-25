import { Types } from 'mongoose';
import { createNotificationService } from '../src/domain/notifications/notifications.service';
import { createInstallationService } from '../src/domain/installations/installations.service';
import { createMemberSelfService } from '../src/domain/team/memberSelf.service';
import type { PhoneVerifier } from '../src/domain/auth/phoneVerifier';
import { FakeNotifier } from '../src/providers/notifier';
import { FakeStorageProvider } from '../src/providers/storage';
import {
  CustomersRepository,
  InstallationsRepository,
  MembersRepository,
} from '../src/repositories/identity.repository';
import { NotificationsRepository } from '../src/repositories/notifications.repository';
import { ValidationError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';
import { updateMeSchema } from '../src/modules/merchant/me/me.validation';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const m = {
  members: createFakeModel(),
  customers: createFakeModel(),
  installations: createFakeModel(),
  notifications: createFakeModel(),
};
const members = new MembersRepository(m.members.model as never);
const salonId = new Types.ObjectId();
const lina = new Types.ObjectId();
const rana = new Types.ObjectId();
const s = (id: Types.ObjectId): string => id.toHexString();
const verified: string[] = [];
const resets: string[] = [];
const uploaded = new Map<string, { ownerType: string; ownerId: string }>();

const phones: PhoneVerifier = {
  resolve: (phone) =>
    Promise.resolve({
      countryCode: phone.countryCode,
      dialCode: '+962',
      number: phone.number,
      e164: `+962${phone.number}`,
    }),
  verify: (phone, _token, purpose) => {
    verified.push(`${phone.e164}:${purpose}`);
    return Promise.resolve();
  },
};
const service = createMemberSelfService({
  members,
  storage: new FakeStorageProvider(),
  uploads: {
    assertConfirmed: ({ keys, accept }) => {
      const upload = uploaded.get(keys[0] ?? '');
      if (upload === undefined || accept?.(upload as never) === false) {
        return Promise.reject(new ValidationError());
      }
      return Promise.resolve();
    },
  },
  phones,
  otpGate: {
    reset: (e164) => {
      resets.push(e164);
      return Promise.resolve();
    },
  },
});

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  verified.length = 0;
  resets.length = 0;
  uploaded.clear();
  const member = (
    _id: Types.ObjectId,
    phone: string,
    over: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    _id,
    salonId,
    branchId: new Types.ObjectId(),
    firstName: 'Lina',
    lastName: 'Haddad',
    phone,
    role: 'MANAGER',
    permissions: ['BOOKINGS_RESPOND'],
    active: true,
    providesServices: false,
    photoKey: 'members/old.jpg',
    ...over,
  });
  m.members.docs.push(member(lina, '+962790000001'), member(rana, '+962790000002'));
});

describe('my account (M25, SRV-129)', () => {
  it('shows my profile with photo, branch and push switch (on by default)', async () => {
    const me = await service.get(s(lina));
    expect(me).toMatchObject({
      id: s(lina),
      firstName: 'Lina',
      role: 'MANAGER',
      pushEnabled: true,
    });
    expect(me.photoUrl).toContain('members/old.jpg');
    expect(me.branchId).not.toBeNull();
  });

  it('changes my name and photo; only a photo I uploaded; null removes it', async () => {
    uploaded.set('members/mine.jpg', { ownerType: 'MEMBER', ownerId: s(lina) });
    uploaded.set('members/hers.jpg', { ownerType: 'MEMBER', ownerId: s(rana) });
    const renamed = await service.update({
      memberId: s(lina),
      patch: { firstName: 'Leena', photoKey: 'members/mine.jpg' },
    });
    expect(renamed).toMatchObject({ firstName: 'Leena', photoKey: 'members/mine.jpg' });
    await expect(
      service.update({ memberId: s(lina), patch: { photoKey: 'members/hers.jpg' } }),
    ).rejects.toBeInstanceOf(ValidationError);
    const removed = await service.update({ memberId: s(lina), patch: { photoKey: null } });
    expect(removed.photoUrl).toBeNull();
    expect(updateMeSchema.safeParse({}).success).toBe(false);
  });

  it('changes my phone after OTP to the new number; a number in use is refused', async () => {
    const changed = await service.changePhone({
      memberId: s(lina),
      phone: { countryCode: 'JO', number: '791234567' },
      idToken: 'token',
    });
    expect(changed.phone).toBe('+962791234567');
    expect(verified).toEqual(['+962791234567:CHANGE_PHONE']);
    expect(resets).toEqual(['+962791234567']);
    await expect(
      service.changePhone({
        memberId: s(lina),
        phone: { countryCode: 'JO', number: '790000002' },
        idToken: 'token',
      }),
    ).rejects.toMatchObject({ code: 'PHONE_ALREADY_REGISTERED' });
  });

  it('a deactivated member is treated as signed out', async () => {
    m.members.docs[0] = { ...m.members.docs[0], active: false };
    await expect(service.get(s(lina))).rejects.toMatchObject({ httpStatus: 401 });
  });
});

describe('member push switch (§8)', () => {
  it('off: the request is stored in-app but no push is sent; on again: push resumes', async () => {
    const installations = createInstallationService({
      installations: new InstallationsRepository(m.installations.model as never),
      customers: new CustomersRepository(m.customers.model as never),
      members,
      analytics: { track: () => Promise.resolve(), linkIdentity: () => Promise.resolve() } as never,
      logger,
    });
    const notifier = new FakeNotifier();
    const notify = createNotificationService({
      notifications: new NotificationsRepository(m.notifications.model as never),
      customers: new CustomersRepository(m.customers.model as never),
      members,
      installations: new InstallationsRepository(m.installations.model as never),
      notifier,
      access: { unreadChanged: () => Promise.resolve() },
      logger,
    });
    m.members.docs[0] = { ...m.members.docs[0], role: 'OWNER', branchId: undefined };
    m.installations.docs.push({
      _id: new Types.ObjectId(),
      installationId: 'device-1',
      app: 'MERCHANT',
      platform: 'ANDROID',
      language: 'en',
      memberId: lina,
      fcmToken: 'token-1',
      lastSeenAt: new Date(),
    });
    await installations.setMemberPushEnabled({ memberId: s(lina), enabled: false });
    expect(m.members.docs[0]['pushEnabled']).toBe(false);
    const send = (key: string): Promise<unknown> =>
      notify.notify('booking.requested', {
        key,
        salonId: s(salonId),
        params: { reference: 'WAB-AAAAAA', customer: 'Rana', salon: 'Hifa', when: 'now' },
      });
    await send('booking.requested:b1');
    expect(m.notifications.docs.filter((n) => String(n['recipientId']) === s(lina))).toHaveLength(
      1,
    );
    expect(notifier.pushes).toHaveLength(0);
    await installations.setMemberPushEnabled({ memberId: s(lina), enabled: true });
    await send('booking.requested:b2');
    expect(notifier.pushes.length).toBeGreaterThan(0);
  });
});
