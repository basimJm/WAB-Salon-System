import { Types } from 'mongoose';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import type { BookingRaw } from '../src/models/booking.model';
import type { Entity } from '../src/utils/database/plain';
import { createBookingActionsService } from '../src/domain/bookings/bookingActions.service';
import { createBookingJobs } from '../src/jobs/bookingJobs';
import type { DelayedJob, JobScheduler } from '../src/jobs/jobs';
import { BookingsRepository } from '../src/repositories/bookings.repository';
import { MembersRepository } from '../src/repositories/identity.repository';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const MIN = 60_000;
const HOUR = 60 * MIN;
let clock = new Date('2026-10-12T08:00:00Z');
const m = { bookings: createFakeModel(), members: createFakeModel() };
const repo = new BookingsRepository(m.bookings.model as never);

/** In-memory scheduler: same contract as the BullMQ one (an id is queued once). */
const queued = new Map<string, DelayedJob>();
const scheduler: Pick<JobScheduler, 'schedule' | 'remove'> = {
  schedule: (job) => {
    if (queued.has(job.id)) return Promise.resolve(false);
    queued.set(job.id, job);
    return Promise.resolve(true);
  },
  remove: (id) => Promise.resolve(queued.delete(id)),
};
const sent: string[] = [];
const changes: { status: string; refundDue: number | undefined }[] = [];
const settings = {
  get: ((key: string) => Promise.resolve(SETTING_DEFAULTS[key as never])) as never,
};
const actions = createBookingActionsService({
  redis: {} as never,
  bookings: repo,
  members: new MembersRepository(m.members.model as never),
  settings,
  hook: {
    changed: (booking, _previous, info) => {
      changes.push({ status: booking.status, refundDue: info?.refundDue });
      return Promise.resolve();
    },
  },
  now: () => clock,
});
const jobs = createBookingJobs({
  scheduler,
  bookings: repo,
  actions,
  notify: (event, booking, round) => {
    sent.push(
      round === undefined ? `${event}:${booking.id}` : `${event}:${booking.id}:${String(round)}`,
    );
    return Promise.resolve();
  },
  settings,
  logger,
  now: () => clock,
  alertCloseOverdue: (booking) => {
    adminAlerts.push(booking.id);
    return Promise.resolve();
  },
});
const adminAlerts: string[] = [];

const salonId = new Types.ObjectId();
const seed = (over: Record<string, unknown> = {}, startInMin = 24 * 60): string => {
  const _id = new Types.ObjectId();
  const start = new Date(clock.getTime() + startInMin * MIN);
  const end = new Date(start.getTime() + HOUR);
  m.bookings.docs.push({
    _id,
    referenceNumber: 'WAB-ABC234',
    customerId: new Types.ObjectId(),
    salonId,
    status: 'PENDING',
    statusHistory: [{ status: 'PENDING', actorType: 'CUSTOMER', at: clock }],
    persons: [{ staffId: new Types.ObjectId(), start, end, services: [] }],
    appointmentStart: start,
    appointmentEnd: end,
    respondBy: new Date(start.getTime() + HOUR),
    paymentMethod: 'DEPOSIT',
    paymentStatus: 'PAID_ONLINE',
    policySnapshot: { cancellationWindowHours: 2 },
    money: { total: 10_000, dueOnline: 3_000, paidOnline: 3_000, remaining: 7_000, refunded: 0 },
    ...over,
  });
  return _id.toHexString();
};
const load = async (id: string): Promise<Entity<BookingRaw>> => {
  const booking = await repo.findById(id);
  if (booking === null) throw new Error('missing');
  return booking;
};
const setStatus = (status: string): void => {
  const doc = m.bookings.docs[0];
  if (doc === undefined) throw new Error('no booking');
  doc['status'] = status;
};
const run = (name: string, data: Record<string, string | number>): Promise<void> => {
  const handler = jobs.handlers[name];
  if (handler === undefined) throw new Error('no handler');
  return handler({ id: 'x', name, data, attempt: 1 });
};

beforeEach(() => {
  m.bookings.docs.length = 0;
  queued.clear();
  sent.length = 0;
  changes.length = 0;
  adminAlerts.length = 0;
  clock = new Date('2026-10-12T08:00:00Z');
});

describe('planning jobs by status', () => {
  it('a PENDING booking gets the pending alert (start − 30 min) and the auto-cancel (respondBy)', async () => {
    const id = await load(seed());
    await jobs.sync(id);
    expect([...queued.keys()].sort()).toEqual([
      `booking.auto-cancel.${id.id}`,
      `booking.pending-alert.${id.id}`,
    ]);
    expect(queued.get(`booking.pending-alert.${id.id}`)?.runAt).toEqual(
      new Date(id.appointmentStart.getTime() - 30 * MIN),
    );
    expect(queued.get(`booking.auto-cancel.${id.id}`)?.runAt).toEqual(id.respondBy);
  });

  it('an APPROVED booking gets reminders at 60 and 15 minutes, the close jobs, and loses the pending jobs', async () => {
    const booking = await load(seed());
    await jobs.sync(booking);
    setStatus('APPROVED');
    await jobs.sync(await load(booking.id));
    expect([...queued.keys()].sort()).toEqual([
      `booking.close-overdue.${booking.id}`,
      `booking.close-reminder.${booking.id}.1`,
      `booking.reminder.${booking.id}.15`,
      `booking.reminder.${booking.id}.60`,
    ]);
    // §5.21: first round one interval after the end; the overdue alert 24 h after it.
    expect(queued.get(`booking.close-reminder.${booking.id}.1`)?.runAt).toEqual(
      new Date(booking.appointmentEnd.getTime() + HOUR),
    );
    expect(queued.get(`booking.close-overdue.${booking.id}`)?.runAt).toEqual(
      new Date(booking.appointmentEnd.getTime() + 24 * HOUR),
    );
    expect(queued.get(`booking.reminder.${booking.id}.60`)?.runAt).toEqual(
      new Date(booking.appointmentStart.getTime() - HOUR),
    );
  });

  it.each([
    'REJECTED',
    'CANCELLED_BY_CUSTOMER',
    'CANCELLED_BY_SALON',
    'AUTO_CANCELLED',
    'COMPLETED',
    'NO_SHOW',
  ])('a %s booking has no jobs left', async (status) => {
    const booking = await load(seed());
    await jobs.sync(booking);
    setStatus(status);
    await jobs.sync(await load(booking.id));
    expect(queued.size).toBe(0);
  });

  it('skips reminders and the alert whose time has passed, but still plans an overdue auto-cancel', async () => {
    // Starts in 20 minutes: the 60-minute reminder and the 30-minute alert are already late.
    const soon = await load(seed({}, 20));
    await jobs.sync(soon);
    expect([...queued.keys()]).toEqual([`booking.auto-cancel.${soon.id}`]);
    queued.clear();
    m.bookings.docs.length = 0;
    const overdue = await load(seed({ respondBy: new Date(clock.getTime() - MIN) }, -120));
    await jobs.sync(overdue);
    expect(queued.get(`booking.auto-cancel.${overdue.id}`)?.runAt.getTime()).toBeLessThan(
      clock.getTime(),
    );
  });

  it('is idempotent: planning twice queues each job once', async () => {
    const booking = await load(seed());
    await jobs.sync(booking);
    await jobs.sync(booking);
    expect(queued.size).toBe(2);
  });

  it('the hook plans on create and on change, and never throws when the queue is down', async () => {
    const booking = await load(seed());
    await jobs.hook.created(booking);
    expect(queued.size).toBe(2);
    const broken = createBookingJobs({
      scheduler: {
        schedule: () => Promise.reject(new Error('redis down')),
        remove: () => Promise.resolve(false),
      },
      bookings: repo,
      actions,
      notify: () => Promise.resolve(),
      settings,
      logger,
      now: () => clock,
    });
    await expect(broken.hook.changed(booking, 'PENDING')).resolves.toBeUndefined();
  });

  it('reconcile rebuilds the jobs of every active booking and ignores finished ones', async () => {
    const pending = await load(seed());
    const approved = await load(seed({ status: 'APPROVED' }));
    seed({ status: 'COMPLETED' });
    // Approved and already over: still needs its close reminders (§5.21).
    const over = seed({ status: 'APPROVED' }, -120);
    expect(await jobs.reconcile()).toBe(3);
    expect(queued.has(`booking.auto-cancel.${pending.id}`)).toBe(true);
    expect(queued.has(`booking.reminder.${approved.id}.15`)).toBe(true);
    expect(queued.has(`booking.close-reminder.${over}.1`)).toBe(true);
    expect(queued.has(`booking.reminder.${over}.15`)).toBe(false);
  });
});

describe('closing finished bookings (§5.21)', () => {
  it('reminds each interval after the end until closed, one round per job', async () => {
    const id = seed({ status: 'APPROVED' }, -120); // ended an hour ago
    await jobs.sync(await load(id));
    await run('booking.close-reminder', { bookingId: id, round: 1 });
    expect(sent).toEqual([`booking.close_reminder:${id}:1`]);
    expect((await load(id)).closeReminders).toMatchObject({ count: 1, lastAt: clock });
    // The next round is queued one interval later, the first one is gone from the plan.
    expect(queued.get(`booking.close-reminder.${id}.2`)?.runAt).toEqual(
      new Date((await load(id)).appointmentEnd.getTime() + 2 * HOUR),
    );
    // A repeated or stale round sends nothing.
    await run('booking.close-reminder', { bookingId: id, round: 1 });
    expect(sent).toHaveLength(1);
    clock = new Date(clock.getTime() + HOUR);
    await run('booking.close-reminder', { bookingId: id, round: 2 });
    expect(sent).toEqual([`booking.close_reminder:${id}:1`, `booking.close_reminder:${id}:2`]);
  });

  it('stops once completed and never runs before the end', async () => {
    const early = seed({ status: 'APPROVED' }, 30);
    await run('booking.close-reminder', { bookingId: early, round: 1 });
    expect(sent).toEqual([]);
    m.bookings.docs.length = 0;
    const id = seed({ status: 'APPROVED' }, -120);
    await jobs.sync(await load(id));
    setStatus('COMPLETED');
    await jobs.sync(await load(id));
    expect(queued.size).toBe(0);
    await run('booking.close-reminder', { bookingId: id, round: 1 });
    expect(sent).toEqual([]);
  });

  it('alerts the merchant and the admin once when still open after the overdue hours', async () => {
    const id = seed({ status: 'APPROVED' }, -26 * 60);
    await run('booking.close-overdue', { bookingId: id });
    await run('booking.close-overdue', { bookingId: id });
    expect(sent).toEqual([`booking.close_overdue:${id}`]);
    expect(adminAlerts).toEqual([id]);
    // Once alerted, planning no longer queues the overdue job; reminders go on.
    await jobs.sync(await load(id));
    expect(queued.has(`booking.close-overdue.${id}`)).toBe(false);
    expect(queued.has(`booking.close-reminder.${id}.1`)).toBe(true);
  });
});

describe('job handlers', () => {
  it('sends the 1 h and 15 min reminders only for a still-upcoming APPROVED booking', async () => {
    const id = seed({ status: 'APPROVED' });
    await run('booking.reminder', { bookingId: id, minutes: 60 });
    await run('booking.reminder', { bookingId: id, minutes: 15 });
    expect(sent).toEqual([`booking.reminder_1h:${id}`, `booking.reminder_15m:${id}`]);
    sent.length = 0;
    setStatus('CANCELLED_BY_CUSTOMER');
    await run('booking.reminder', { bookingId: id, minutes: 60 });
    setStatus('APPROVED');
    clock = new Date(clock.getTime() + 48 * HOUR);
    await run('booking.reminder', { bookingId: id, minutes: 60 });
    await run('booking.reminder', { bookingId: 'missing', minutes: 60 });
    await run('booking.reminder', { bookingId: id, minutes: 7 });
    expect(sent).toEqual([]);
  });

  it('sends the pending alert only while the booking is still PENDING and not started', async () => {
    const id = seed();
    await run('booking.pending-alert', { bookingId: id });
    expect(sent).toEqual([`booking.pending_30m:${id}`]);
    sent.length = 0;
    setStatus('APPROVED');
    await run('booking.pending-alert', { bookingId: id });
    expect(sent).toEqual([]);
  });

  it('auto-cancels an unanswered booking after respondBy with a full refund', async () => {
    const id = seed();
    const booking = await load(id);
    clock = new Date(booking.respondBy.getTime() + MIN);
    await run('booking.auto-cancel', { bookingId: id });
    const after = await load(id);
    expect(after.status).toBe('AUTO_CANCELLED');
    expect(after.statusHistory.at(-1)).toMatchObject({
      status: 'AUTO_CANCELLED',
      actorType: 'SYSTEM',
    });
    expect(after.cancellation).toMatchObject({ by: 'SYSTEM', reasonCode: 'AUTO_CANCEL' });
    expect(changes).toEqual([{ status: 'AUTO_CANCELLED', refundDue: 3_000 }]);
  });

  it('does nothing when the booking was answered meanwhile, and retries when run too early', async () => {
    const id = seed({ status: 'APPROVED' });
    clock = new Date(clock.getTime() + 48 * HOUR);
    await run('booking.auto-cancel', { bookingId: id });
    expect(changes).toEqual([]);
    clock = new Date('2026-10-12T08:00:00Z');
    const pending = seed();
    await expect(run('booking.auto-cancel', { bookingId: pending })).rejects.toThrow('early');
    expect((await load(pending)).status).toBe('PENDING');
  });

  it('a lost race with an approval is not an error', async () => {
    const id = seed();
    const booking = await load(id);
    clock = new Date(booking.respondBy.getTime() + MIN);
    // The booking is approved between the job's read and its write.
    const original = repo.transition.bind(repo);
    repo.transition = () => Promise.resolve(null);
    await expect(run('booking.auto-cancel', { bookingId: id })).resolves.toBeUndefined();
    repo.transition = original;
    expect(changes).toEqual([]);
  });
});
