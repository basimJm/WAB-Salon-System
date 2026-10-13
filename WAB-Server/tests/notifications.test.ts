import { Types } from 'mongoose';
import { createNotificationService } from '../src/domain/notifications/notifications.service';
import { createNotificationProducers } from '../src/domain/notifications/producers';
import { NOTIFICATION_EVENTS } from '../src/constants/notifications';
import { FakeNotifier } from '../src/providers/notifier/fake';
import {
  CustomersRepository,
  InstallationsRepository,
  MembersRepository,
} from '../src/repositories/identity.repository';
import { NotificationsRepository } from '../src/repositories/notifications.repository';
import { MESSAGES } from '../src/utils/i18n';
import { formatDateTime } from '../src/utils/format/localized';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const m = {
  notifications: createFakeModel(),
  customers: createFakeModel(),
  members: createFakeModel(),
  installations: createFakeModel(),
  salons: createFakeModel(),
  bookings: createFakeModel(),
};
const unread: { id: string; count: number }[] = [];
const notifier = new FakeNotifier();
const sent: {
  tokens: readonly string[];
  title: string;
  body: string;
  data: Record<string, string>;
}[] = [];
const realSend = notifier.sendPush.bind(notifier);
notifier.sendPush = (request) => {
  const target = 'tokens' in request.target ? request.target.tokens : [];
  sent.push({
    tokens: target,
    title: request.message.title ?? '',
    body: request.message.body ?? '',
    data: { ...request.message.data },
  });
  return realSend(request);
};

const service = createNotificationService({
  notifications: new NotificationsRepository(m.notifications.model as never),
  customers: new CustomersRepository(m.customers.model as never),
  members: new MembersRepository(m.members.model as never),
  installations: new InstallationsRepository(m.installations.model as never),
  notifier,
  access: {
    unreadChanged: (account, count) => {
      unread.push({ id: account.id, count });
      return Promise.resolve();
    },
  },
  logger,
});

const salon = new Types.ObjectId();
const customer = new Types.ObjectId();
const ids = {
  owner: new Types.ObjectId(),
  responder: new Types.ObjectId(),
  viewAll: new Types.ObjectId(),
  staff: new Types.ObjectId(),
  staffNoView: new Types.ObjectId(),
  finance: new Types.ObjectId(),
  inactive: new Types.ObjectId(),
  other: new Types.ObjectId(),
};
const member = (
  _id: Types.ObjectId,
  role: string,
  permissions: string[],
  over: Record<string, unknown> = {},
): void => {
  m.members.docs.push({
    _id,
    salonId: salon,
    role,
    permissions,
    active: true,
    firstName: 'M',
    ...over,
  });
};
const device = (
  owner: { customerId?: Types.ObjectId; memberId?: Types.ObjectId },
  token: string,
  language = 'ar',
): void => {
  m.installations.docs.push({
    _id: new Types.ObjectId(),
    fcmToken: token,
    language,
    lastSeenAt: new Date(),
    ...owner,
  });
};
const stored = (id: Types.ObjectId): Record<string, unknown>[] =>
  m.notifications.docs.filter((d) => String(d['recipientId']) === id.toHexString());

beforeEach(() => {
  for (const f of Object.values(m)) f.docs.length = 0;
  unread.length = 0;
  sent.length = 0;
  m.customers.docs.push({
    _id: customer,
    status: 'ACTIVE',
    language: 'en',
    pushEnabled: true,
    firstName: 'Rana',
  });
  member(ids.owner, 'OWNER', []);
  member(ids.responder, 'MANAGER', ['BOOKINGS_RESPOND']);
  member(ids.viewAll, 'MANAGER', ['BOOKINGS_VIEW_ALL']);
  member(ids.staff, 'EMPLOYEE', ['BOOKINGS_VIEW_OWN']);
  member(ids.staffNoView, 'EMPLOYEE', ['REVIEWS_VIEW']);
  member(ids.finance, 'MANAGER', ['FINANCE_VIEW']);
  member(ids.inactive, 'MANAGER', ['BOOKINGS_RESPOND'], { active: false });
  m.members.docs.push({
    _id: ids.other,
    salonId: new Types.ObjectId(),
    role: 'OWNER',
    permissions: [],
    active: true,
  });
  device({ customerId: customer }, 'tok-customer', 'en');
  device({ memberId: ids.responder }, 'tok-responder', 'en');
  device({ memberId: ids.owner }, 'tok-owner');
});

describe('catalog and templates', () => {
  it('every event/audience has a title and a body in both languages with matching placeholders', () => {
    for (const [event, definition] of Object.entries(NOTIFICATION_EVENTS)) {
      for (const audience of definition.audiences) {
        for (const part of ['title', 'body']) {
          const key = `notifications.${event}.${audience.who}.${part}`;
          const ar = MESSAGES.ar[key];
          const en = MESSAGES.en[key];
          expect([key, typeof ar, (ar ?? '').length > 0]).toEqual([key, 'string', true]);
          expect([key, typeof en, (en ?? '').length > 0]).toEqual([key, 'string', true]);
          const names = (t: string): string[] =>
            [...t.matchAll(/\{(\w+)\}/g)].map((x) => x[1] ?? '').sort();
          expect([key, names(ar ?? '')]).toEqual([key, names(en ?? '')]);
        }
      }
    }
  });
  it('prints dates in the salon’s time zone, 12-hour, with the numerals of the language', () => {
    const at = new Date('2026-10-12T08:00:00Z'); // 11:00 in Amman
    expect(formatDateTime(at, 'Asia/Amman', 'en')).toBe('12/10/2026, 11:00 am');
    const ar = formatDateTime(at, 'Asia/Amman', 'ar');
    expect(ar).toContain('١١:٠٠');
    expect(ar).toContain('ص');
    expect(ar).not.toMatch(/[0-9]/);
  });
});

describe('recipients and delivery', () => {
  it('a booking request reaches only members who can respond, in their language, and stores both languages', async () => {
    await service.notify('booking.requested', {
      key: 'booking.requested:b1',
      salonId: salon.toHexString(),
      params: { reference: 'WAB-ABC234', customer: 'Rana', when: () => '11:00' },
      data: { bookingId: 'b1', deepLink: '/bookings/b1' },
    });
    expect(stored(ids.responder)).toHaveLength(1);
    expect(stored(ids.owner)).toHaveLength(1); // the owner holds every permission
    for (const id of [
      ids.viewAll,
      ids.staff,
      ids.staffNoView,
      ids.finance,
      ids.inactive,
      ids.other,
    ]) {
      expect(stored(id)).toHaveLength(0);
    }
    expect(stored(ids.responder)[0]).toMatchObject({
      recipientType: 'MEMBER',
      type: 'BOOKING',
      event: 'booking.requested',
      title: { en: 'New booking request', ar: 'طلب حجز جديد' },
      data: { bookingId: 'b1' },
      pushSent: true,
      pushResult: 'SENT',
    });
    const push = sent.find((p) => p.tokens.includes('tok-responder'));
    expect(push?.title).toBe('New booking request');
    expect(push?.body).toBe('Rana requested WAB-ABC234 for 11:00.');
    expect(sent.find((p) => p.tokens.includes('tok-owner'))?.title).toBe('طلب حجز جديد');
    expect(push?.data).toMatchObject({ event: 'booking.requested', bookingId: 'b1' });
  });
  it('the customer gets the message in their own language; push respects the switch and missing tokens', async () => {
    const base = {
      key: 'booking.approved:b1',
      customerId: customer.toHexString(),
      params: { salon: 'Glow', reference: 'R', when: () => 'W' },
    };
    await service.notify('booking.approved', base);
    expect(stored(customer)[0]).toMatchObject({ recipientType: 'CUSTOMER', pushSent: true });
    expect(sent[0]?.title).toBe('Booking approved');
    m.customers.docs[0] = { ...m.customers.docs[0], pushEnabled: false };
    await service.notify('booking.approved', { ...base, key: 'booking.approved:b2' });
    expect(stored(customer)).toHaveLength(2);
    expect(stored(customer)[1]).toMatchObject({ pushSent: false, pushResult: 'PUSH_OFF' });
    expect(sent).toHaveLength(1);
    m.customers.docs[0] = { ...m.customers.docs[0], pushEnabled: true };
    m.installations.docs.length = 0;
    await service.notify('booking.approved', { ...base, key: 'booking.approved:b3' });
    expect(stored(customer)[2]).toMatchObject({ pushSent: false, pushResult: 'NO_TOKEN' });
  });
  it('assigned staff are told only when they may see bookings; VIEW_ALL gets cancellations', async () => {
    await service.notify('booking.cancelled_by_customer', {
      key: 'x:1',
      customerId: customer.toHexString(),
      salonId: salon.toHexString(),
      staffIds: [ids.staff.toHexString(), ids.staffNoView.toHexString()],
      params: { reference: 'R', salon: 'Glow', customer: 'Rana', when: () => 'W' },
    });
    expect(stored(customer)).toHaveLength(1);
    expect(stored(ids.viewAll)).toHaveLength(1);
    expect(stored(ids.staff)).toHaveLength(1);
    expect(stored(ids.staffNoView)).toHaveLength(0);
    expect(stored(ids.responder)).toHaveLength(0);
  });
  it('owner-only and finance events', async () => {
    await service.notify('payout.transferred', {
      key: 'p:1',
      salonId: salon.toHexString(),
      params: { amount: '7.300', reference: 'BANK-1' },
    });
    expect(stored(ids.owner)).toHaveLength(1);
    expect(stored(ids.finance)).toHaveLength(1);
    expect(stored(ids.staff)).toHaveLength(0);
    await service.notify('application.approved', {
      key: 'a:1',
      salonId: salon.toHexString(),
      params: { salon: 'Glow' },
    });
    expect(stored(ids.owner)).toHaveLength(2);
    expect(stored(ids.finance)).toHaveLength(1);
  });
  it('the same occurrence is delivered once; a different key is a new notification', async () => {
    const input = {
      key: 'booking.approved:b1',
      customerId: customer.toHexString(),
      params: { salon: 'S', reference: 'R', when: () => 'W' },
    };
    await service.notify('booking.approved', input);
    await service.notify('booking.approved', input);
    expect(stored(customer)).toHaveLength(1);
    expect(sent).toHaveLength(1);
  });
  it('keeps the unread counter live and countable', async () => {
    const input = (key: string): Parameters<typeof service.notify>[1] => ({
      key,
      customerId: customer.toHexString(),
      params: { salon: 'S', reference: 'R', when: () => 'W' },
    });
    await service.notify('booking.approved', input('a'));
    await service.notify('booking.rejected', input('b'));
    expect(unread.map((u) => u.count)).toEqual([1, 2]);
    expect(await service.unreadCount('CUSTOMER', customer.toHexString())).toBe(2);
    m.notifications.docs[0] = { ...m.notifications.docs[0], readAt: new Date() };
    expect(await service.unreadCount('CUSTOMER', customer.toHexString())).toBe(1);
    expect(await service.unreadCount('CUSTOMER', 'bad id')).toBe(0);
  });
  it('unknown, deleted customers and salons without members are skipped quietly; a failing push still stores the message', async () => {
    await service.notify('booking.approved', {
      key: 'k',
      customerId: new Types.ObjectId().toHexString(),
      params: {},
    });
    m.customers.docs[0] = { ...m.customers.docs[0], status: 'DELETED' };
    await service.notify('booking.approved', {
      key: 'k',
      customerId: customer.toHexString(),
      params: {},
    });
    await service.notify('payout.transferred', {
      key: 'k',
      salonId: new Types.ObjectId().toHexString(),
      params: {},
    });
    await service.notify('booking.approved', { key: 'k' });
    expect(m.notifications.docs).toHaveLength(0);
    m.customers.docs[0] = { ...m.customers.docs[0], status: 'ACTIVE' };
    notifier.sendPush = () => Promise.reject(new Error('fcm down'));
    await service.notify('booking.approved', {
      key: 'z',
      customerId: customer.toHexString(),
      params: {},
    });
    expect(stored(customer)[0]).toMatchObject({ pushSent: false, pushResult: 'FAILED' });
    notifier.sendPush = realSend;
  });
  it('forgets push tokens the provider says are invalid', async () => {
    device({ customerId: customer }, 'dead-token');
    notifier.markTokenInvalid('dead-token');
    await service.notify('booking.approved', {
      key: 'inv',
      customerId: customer.toHexString(),
      params: {},
    });
    expect(m.installations.docs.map((d) => d['fcmToken'])).not.toContain('dead-token');
    expect(m.installations.docs.map((d) => d['fcmToken'])).toContain('tok-customer');
    expect(stored(customer)[0]).toMatchObject({ pushSent: true });
  });
});

describe('producers', () => {
  const producers = createNotificationProducers({
    notifications: service,
    salons: { findById: () => Promise.resolve({ id: salon.toHexString(), name: 'Glow' } as never) },
    customers: new CustomersRepository(m.customers.model as never),
    members: new MembersRepository(m.members.model as never),
    bookings: {
      findById: () => Promise.resolve({ id: 'b', referenceNumber: 'WAB-ABC234' } as never),
    },
    settings: {
      get: ((k: string) => Promise.resolve(k === 'timezone' ? 'Asia/Amman' : undefined)) as never,
    },
    logger,
  });
  const booking = (status: string, staffId = ids.staff): never =>
    ({
      id: new Types.ObjectId().toHexString(),
      referenceNumber: 'WAB-ABC234',
      customerId: customer.toHexString(),
      salonId: salon.toHexString(),
      status,
      statusHistory: [{}, {}],
      appointmentStart: new Date('2026-10-12T08:00:00Z'),
      persons: [{ staffId: staffId.toHexString() }],
    }) as never;

  it('a new booking tells the customer and the members who can respond', async () => {
    await producers.bookingCreated.created(booking('PENDING'));
    expect(stored(customer)[0]).toMatchObject({ event: 'booking.created' });
    expect(stored(ids.responder)[0]).toMatchObject({ event: 'booking.requested' });
    expect(stored(customer)[0]?.['body']).toMatchObject({
      en: expect.stringContaining('WAB-ABC234') as unknown,
    });
    expect(stored(customer)[0]?.['body']).toMatchObject({
      en: expect.stringContaining('11:00 am') as unknown,
    });
  });
  it('status changes map to events; PENDING announces nothing; each transition is its own occurrence', async () => {
    const b = booking('APPROVED');
    await producers.bookingChanged.changed(b, 'PENDING');
    await producers.bookingChanged.changed(b, 'PENDING');
    expect(stored(customer).map((n) => n['event'])).toEqual(['booking.approved']);
    await producers.bookingChanged.changed(booking('PENDING'), 'APPROVED');
    await producers.bookingChanged.changed(booking('AUTO_CANCELLED'), 'PENDING');
    expect(stored(customer).map((n) => n['event'])).toEqual([
      'booking.approved',
      'booking.auto_cancelled',
    ]);
    expect(stored(ids.viewAll).map((n) => n['event'])).toEqual(['booking.auto_cancelled']);
  });
  it('a reassignment tells the customer and the old and new staff', async () => {
    await producers.bookingChanged.reassigned(booking('APPROVED'), {
      from: ids.staff.toHexString(),
      to: ids.staffNoView.toHexString(),
    });
    expect(stored(customer)[0]).toMatchObject({ event: 'booking.reassigned' });
    expect(stored(ids.staff)).toHaveLength(1);
  });
  it('a failing lookup is logged, never thrown', async () => {
    const broken = createNotificationProducers({
      notifications: { notify: () => Promise.reject(new Error('boom')) },
      salons: { findById: () => Promise.reject(new Error('db')) },
      customers: { findById: () => Promise.reject(new Error('db')) },
      members: { findById: () => Promise.reject(new Error('db')) },
      bookings: { findById: () => Promise.reject(new Error('db')) },
      settings: { get: () => Promise.reject(new Error('db')) },
      logger,
    });
    await expect(broken.bookingCreated.created(booking('PENDING'))).resolves.toBeUndefined();
    await expect(
      broken.payoutNotifier.transferred({ id: 'p', salonId: 's', net: 1 } as never),
    ).resolves.toBeUndefined();
  });
  it('refunds, payouts, applications, salon state and catalog requests', async () => {
    const refund = {
      id: 'r1',
      bookingId: 'b',
      customerId: customer.toHexString(),
      salonId: salon.toHexString(),
      amount: 2_500,
    } as never;
    await producers.refundHooks.started(refund);
    await producers.refundHooks.refunded(refund);
    await producers.refundHooks.failed(refund);
    expect(stored(customer).map((n) => n['event'])).toEqual(['refund.pending', 'refund.refunded']);
    expect(stored(ids.finance).map((n) => n['event'])).toEqual([
      'refund.refunded',
      'refund.failed',
    ]);
    expect(stored(customer)[1]?.['body']).toMatchObject({
      en: 'JOD'.length > 0 ? (expect.stringContaining('2.500') as unknown) : '',
    });
    await producers.refundHooks.started({ ...(refund as object), bookingId: undefined } as never);
    expect(stored(customer)).toHaveLength(2); // a payment without a booking has nothing to show
    await producers.payoutNotifier.transferred({
      id: 'p1',
      salonId: salon.toHexString(),
      net: 7_300,
      transferReference: 'B-1',
    } as never);
    expect(stored(ids.owner).map((n) => n['event'])).toContain('payout.transferred');
    await producers.applicationNotifier.reviewed({
      salonId: salon.toHexString(),
      decision: 'approved',
      reason: 'ok',
    });
    await producers.applicationNotifier.reviewed({
      salonId: salon.toHexString(),
      decision: 'rejected',
      reason: 'blurry',
    });
    await producers.salonStateNotifier.changed({
      salonId: salon.toHexString(),
      event: 'salon.offline',
      reason: 'fraud',
    });
    await producers.catalogRequestNotifier.decided({
      salonId: salon.toHexString(),
      requestId: 'q',
      decision: 'rejected',
      note: 'dup',
    });
    const events = stored(ids.owner).map((n) => n['event']);
    expect(events).toEqual(
      expect.arrayContaining(['application.approved', 'application.rejected', 'salon.offline']),
    );
    const decided = m.notifications.docs.find((n) => n['event'] === 'catalog_request.decided');
    expect(decided?.['body']).toMatchObject({
      en: 'Your request for a new service was rejected. dup',
    });
  });
});
