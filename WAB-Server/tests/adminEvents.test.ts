import { Types } from 'mongoose';
import { PERIODIC_JOBS } from '../src/constants/jobs';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { createReviewsService } from '../src/domain/reviews/reviews.service';
import { createPeriodicJobs } from '../src/jobs/periodicJobs';
import { CustomersRepository, MembersRepository } from '../src/repositories/identity.repository';
import { ReviewsRepository } from '../src/repositories/reviews.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { createAdminEvents } from '../src/sockets/adminEvents';
import type { SocketRelay } from '../src/sockets/bookingEvents';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const NOW = new Date('2026-10-26T09:00:00.000Z');
const emits: { scope: string; room: string; event: string; payload: Record<string, unknown> }[] =
  [];
const relay: SocketRelay = {
  current: {
    emit: (scope: string, room: string, event: string, payload: Record<string, unknown>) => {
      emits.push({ scope, room, event, payload });
    },
  } as never,
};
const events = createAdminEvents({ relay, logger, now: () => NOW });

beforeEach(() => {
  emits.length = 0;
});

describe('admin room events (§7, SRV-124)', () => {
  it('emits small summaries to the admin room', () => {
    events.applicationCreated({ id: 's1', name: 'Hifa', gender: 'FEMALE' } as never);
    events.reviewCreated({ id: 'r1', salonId: 's1', target: 'SALON', rating: 4 } as never);
    events.refundUpdated({
      id: 'f1',
      bookingId: 'b1',
      status: 'REFUNDED',
      amount: 12_500,
    } as never);
    events.overviewTick();
    expect(emits.map((e) => [e.scope, e.room, e.event])).toEqual([
      ['admin', 'admin', 'application.created'],
      ['admin', 'admin', 'review.created'],
      ['admin', 'admin', 'refund.updated'],
      ['admin', 'admin', 'overview.tick'],
    ]);
    expect(emits[2]?.payload).toEqual({
      id: 'f1',
      bookingId: 'b1',
      status: 'REFUNDED',
      amount: '12.500',
    });
    expect(emits[3]?.payload).toEqual({ at: NOW.toISOString() });
  });

  it('never throws when the socket fails, and is quiet before the server starts', () => {
    const broken = createAdminEvents({
      relay: {
        current: {
          emit: () => {
            throw new Error('socket down');
          },
        } as never,
      },
      logger,
    });
    expect(() => {
      broken.overviewTick();
    }).not.toThrow();
    expect(() => {
      createAdminEvents({ relay: {}, logger }).overviewTick();
    }).not.toThrow();
  });

  it('a submitted review reaches the admin queue live', async () => {
    const m = {
      reviews: createFakeModel(),
      salons: createFakeModel(),
      members: createFakeModel(),
      customers: createFakeModel(),
    };
    const salonId = new Types.ObjectId();
    const customerId = new Types.ObjectId();
    m.salons.docs.push({
      _id: salonId,
      state: 'LIVE',
      completeness: { isComplete: true, missing: [] },
      rating: { avg: 0, count: 0 },
    });
    m.customers.docs.push({ _id: customerId, status: 'ACTIVE', firstName: 'Rana' });
    const created: string[] = [];
    const reviews = createReviewsService({
      reviews: new ReviewsRepository(m.reviews.model as never),
      salons: new SalonsRepository(m.salons.model as never),
      members: new MembersRepository(m.members.model as never),
      customers: new CustomersRepository(m.customers.model as never),
      settings: { get: (k: string) => Promise.resolve(SETTING_DEFAULTS[k as never]) },
      onCreated: (review) => {
        created.push(review.id);
        events.reviewCreated(review);
      },
    });
    const { id } = await reviews.submit({
      customerId: customerId.toHexString(),
      salonId: salonId.toHexString(),
      rating: 5,
    });
    expect(created).toEqual([id]);
    expect(emits.map((e) => e.event)).toEqual(['review.created']);
  });

  it('the overview tick runs every minute as a periodic job', async () => {
    let ticks = 0;
    const jobs = createPeriodicJobs({
      scheduler: { repeat: () => Promise.resolve() },
      settings: { get: () => Promise.resolve('Asia/Amman') } as never,
      subscriptions: {} as never,
      accounts: {} as never,
      refunds: {} as never,
      payments: {} as never,
      ledger: {} as never,
      bookingJobs: { reconcile: () => Promise.resolve(0) },
      notifySubscription: () => Promise.resolve(),
      overviewTick: () => {
        ticks += 1;
      },
      logger,
    });
    expect(PERIODIC_JOBS.overviewTick.cron).toBe('* * * * *');
    await jobs.handlers[PERIODIC_JOBS.overviewTick.name]?.({} as never);
    expect(ticks).toBe(1);
  });
});
