import { Types } from 'mongoose';
import { createNotificationService } from '../src/domain/notifications/notifications.service';
import type { BookingRaw } from '../src/models/booking.model';
import { FakeNotifier } from '../src/providers/notifier';
import {
  CustomersRepository,
  InstallationsRepository,
  MembersRepository,
} from '../src/repositories/identity.repository';
import { NotificationsRepository } from '../src/repositories/notifications.repository';
import { createBookingEvents, type SocketRelay } from '../src/sockets/bookingEvents';
import { salonRoomsOf } from '../src/sockets/rooms';
import type { Entity } from '../src/utils/database/plain';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const salonId = new Types.ObjectId();
const mecca = new Types.ObjectId();
const abdoun = new Types.ObjectId();

describe('socket rooms per branch (§7)', () => {
  it('the owner sits in the salon rooms, a branch member in their branch rooms', () => {
    const owner = salonRoomsOf({ salonId: salonId.toHexString(), role: 'OWNER', permissions: [] });
    expect(owner.granted).toEqual([
      `salon:${salonId.toHexString()}:respond`,
      `salon:${salonId.toHexString()}:all`,
    ]);
    const manager = salonRoomsOf({
      salonId: salonId.toHexString(),
      branchId: mecca.toHexString(),
      role: 'MANAGER',
      permissions: ['BOOKINGS_RESPOND', 'BOOKINGS_VIEW_ALL'],
    });
    expect(manager.granted).toEqual([
      `branch:${mecca.toHexString()}:respond`,
      `branch:${mecca.toHexString()}:all`,
    ]);
    // A refresh leaves the salon rooms too, so a role change never leaves a stale room behind.
    expect(manager.all).toEqual(
      expect.arrayContaining([
        `salon:${salonId.toHexString()}:all`,
        `branch:${mecca.toHexString()}:all`,
      ]),
    );
    const employee = salonRoomsOf({
      salonId: salonId.toHexString(),
      branchId: mecca.toHexString(),
      role: 'EMPLOYEE',
      permissions: ['BOOKINGS_VIEW_OWN'],
    });
    expect(employee.granted).toEqual([]);
  });

  it('a new booking request reaches the owner and the responders of its branch only', async () => {
    const emits: string[] = [];
    const relay: SocketRelay = {
      current: {
        emit: (_scope: string, room: string, event: string) => {
          emits.push(`${room}|${event}`);
        },
      } as never,
    };
    const events = createBookingEvents({
      relay,
      customers: new CustomersRepository(createFakeModel().model as never),
      members: new MembersRepository(createFakeModel().model as never),
      logger,
    });
    const booking = {
      id: new Types.ObjectId().toHexString(),
      salonId: salonId.toHexString(),
      branchId: mecca.toHexString(),
      customerId: new Types.ObjectId().toHexString(),
      referenceNumber: 'WAB-AAAAAA',
      status: 'PENDING',
      appointmentStart: new Date(),
      appointmentEnd: new Date(),
      respondBy: new Date(),
      persons: [],
      money: { total: 0, dueOnline: 0, paidOnline: 0, remaining: 0, refunded: 0 },
    } as unknown as Entity<BookingRaw>;
    await events.created(booking);
    expect(emits).toEqual(
      expect.arrayContaining([
        `salon:${salonId.toHexString()}:respond|booking.requested`,
        `branch:${mecca.toHexString()}:respond|booking.requested`,
        `branch:${mecca.toHexString()}:all|booking.updated`,
      ]),
    );
    expect(emits.some((e) => e.startsWith(`branch:${abdoun.toHexString()}`))).toBe(false);
  });
});

describe('notifications per branch (§8)', () => {
  const m = {
    notifications: createFakeModel(),
    customers: createFakeModel(),
    members: createFakeModel(),
    installations: createFakeModel(),
  };
  const service = createNotificationService({
    notifications: new NotificationsRepository(m.notifications.model as never),
    customers: new CustomersRepository(m.customers.model as never),
    members: new MembersRepository(m.members.model as never),
    installations: new InstallationsRepository(m.installations.model as never),
    notifier: new FakeNotifier(),
    access: { unreadChanged: () => Promise.resolve() },
    logger,
  });
  const ids = {
    owner: new Types.ObjectId(),
    meccaManager: new Types.ObjectId(),
    abdounManager: new Types.ObjectId(),
  };
  const storedFor = (id: Types.ObjectId): string[] =>
    m.notifications.docs
      .filter((n) => String(n['recipientId']) === id.toHexString())
      .map((n) => String(n['event']));

  beforeEach(() => {
    for (const model of Object.values(m)) model.docs.length = 0;
    const manager = (id: Types.ObjectId, branchId: Types.ObjectId): Record<string, unknown> => ({
      _id: id,
      salonId,
      branchId,
      role: 'MANAGER',
      permissions: ['BOOKINGS_RESPOND', 'SALON_PROFILE_MANAGE'],
      active: true,
      firstName: 'M',
      lastName: 'M',
      phone: `+96278${id.toHexString().slice(-7)}`,
    });
    m.members.docs.push(
      {
        _id: ids.owner,
        salonId,
        role: 'OWNER',
        permissions: [],
        active: true,
        firstName: 'O',
        lastName: 'O',
        phone: '+962780000000',
      },
      manager(ids.meccaManager, mecca),
      manager(ids.abdounManager, abdoun),
    );
  });

  it('a booking request goes to the owner and the responders of that branch', async () => {
    await service.notify('booking.requested', {
      key: 'booking.requested:b1',
      salonId: salonId.toHexString(),
      branchId: mecca.toHexString(),
      params: { reference: 'WAB-AAAAAA', customer: 'Rana', salon: 'Hifa', when: 'now' },
    });
    expect(storedFor(ids.owner)).toEqual(['booking.requested']);
    expect(storedFor(ids.meccaManager)).toEqual(['booking.requested']);
    expect(storedFor(ids.abdounManager)).toEqual([]);
  });

  it('branch events reach the owner and that branch’s managers', async () => {
    await service.notify('branch.offline', {
      key: 'branch.offline:x',
      salonId: salonId.toHexString(),
      branchId: abdoun.toHexString(),
      params: { salon: 'Hifa', branch: 'Abdoun', reason: 'Renovation' },
    });
    expect(storedFor(ids.owner)).toEqual(['branch.offline']);
    expect(storedFor(ids.abdounManager)).toEqual(['branch.offline']);
    expect(storedFor(ids.meccaManager)).toEqual([]);
  });
});
