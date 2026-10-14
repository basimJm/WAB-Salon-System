import { Types } from 'mongoose';
import { createAlertsService } from '../src/domain/alerts/alerts.service';
import type { AlertRaw } from '../src/models/alert.model';
import { AlertsRepository } from '../src/repositories/alerts.repository';
import { CatalogRequestsRepository } from '../src/repositories/catalogRequests.repository';
import { RefundsRepository } from '../src/repositories/refunds.repository';
import { ReviewsRepository } from '../src/repositories/reviews.repository';
import { SalonsRepository } from '../src/repositories/salons.repository';
import { TransactionsRepository } from '../src/repositories/transactions.repository';
import type { Entity } from '../src/utils/database/plain';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const NOW = new Date('2026-10-13T12:00:00.000Z');
const minutesAgo = (m: number): Date => new Date(NOW.getTime() - m * 60_000);
const tx = createFakeModel();
const refunds = createFakeModel();
const salons = createFakeModel();
const reviews = createFakeModel();
const requests = createFakeModel();
const stored = new Map<string, Record<string, unknown>>();
let raisedFeed: string[] = [];
let feedFails = false;
let rule = { count: 5, windowMin: 15, ratePct: 20, rateWindowMin: 60 };

const alertsRepo = {
  createOnce: (data: Partial<AlertRaw>): Promise<Entity<AlertRaw> | null> => {
    const key = data.dedupeKey as string;
    if (stored.has(key)) return Promise.resolve(null);
    stored.set(key, data);
    return Promise.resolve({ id: String(stored.size), ...data } as unknown as Entity<AlertRaw>);
  },
} as unknown as AlertsRepository;

const service = createAlertsService({
  alerts: alertsRepo,
  transactions: new TransactionsRepository(tx.model as never),
  refunds: new RefundsRepository(refunds.model as never),
  salons: new SalonsRepository(salons.model as never),
  reviews: new ReviewsRepository(reviews.model as never),
  catalogRequests: new CatalogRequestsRepository(requests.model as never),
  settings: { get: (() => Promise.resolve(rule)) as never },
  onRaised: (alert) => {
    if (feedFails) throw new Error('socket down');
    raisedFeed.push(alert.kind);
  },
  logger,
});

const addTx = (status: string, ago: number): void => {
  tx.docs.push({ _id: new Types.ObjectId(), status, createdAt: minutesAgo(ago) });
};
const kinds = (): string[] => [...stored.values()].map((a) => a.kind as string).sort();

beforeEach(() => {
  for (const f of [tx, refunds, salons, reviews, requests]) f.docs.length = 0;
  stored.clear();
  raisedFeed = [];
  feedFails = false;
  rule = { count: 5, windowMin: 15, ratePct: 20, rateWindowMin: 60 };
});

describe('payment failure spike', () => {
  it('fires when the count limit is reached inside the window, once per window', async () => {
    for (let i = 0; i < 5; i += 1) addTx('FAILED', 3);
    expect(await service.evaluate(NOW)).toBeGreaterThanOrEqual(1);
    expect(kinds()).toContain('PAYMENT_FAILURE_SPIKE');
    expect(await service.evaluate(NOW)).toBe(0);
    expect(raisedFeed).toContain('PAYMENT_FAILURE_SPIKE');
  });

  it('stays quiet below the limit and ignores failures outside the window', async () => {
    for (let i = 0; i < 4; i += 1) addTx('FAILED', 3);
    for (let i = 0; i < 20; i += 1) addTx('SUCCEEDED', 3);
    for (let i = 0; i < 9; i += 1) addTx('FAILED', 120);
    await service.evaluate(NOW);
    expect(kinds()).toEqual([]);
  });

  it('fires on the failure rate with enough attempts, not on a tiny sample', async () => {
    for (let i = 0; i < 2; i += 1) addTx('FAILED', 40);
    for (let i = 0; i < 2; i += 1) addTx('SUCCEEDED', 40);
    await service.evaluate(NOW);
    expect(kinds()).toEqual([]);
    for (let i = 0; i < 6; i += 1) addTx('SUCCEEDED', 40);
    await service.evaluate(NOW);
    expect(kinds()).toEqual(['PAYMENT_FAILURE_SPIKE']);
    const data = [...stored.values()][0]?.data as Record<string, number>;
    expect(data.failed).toBe(2);
    expect(data.attempts).toBe(10);
  });

  it('uses the thresholds from settings', async () => {
    rule = { count: 2, windowMin: 15, ratePct: 90, rateWindowMin: 60 };
    addTx('FAILED', 1);
    addTx('FAILED', 2);
    await service.evaluate(NOW);
    expect(kinds()).toContain('PAYMENT_FAILURE_SPIKE');
  });

  it('a new window raises a new alert', async () => {
    for (let i = 0; i < 5; i += 1) addTx('FAILED', 3);
    await service.evaluate(NOW);
    const later = new Date(NOW.getTime() + 20 * 60_000);
    for (let i = 0; i < 5; i += 1)
      tx.docs.push({
        _id: new Types.ObjectId(),
        status: 'FAILED',
        createdAt: new Date(later.getTime() - 60_000),
      });
    expect(await service.evaluate(later)).toBeGreaterThanOrEqual(1);
  });
});

describe('refunds, subscriptions and new submissions', () => {
  it('alerts a failed refund once', async () => {
    const id = new Types.ObjectId();
    refunds.docs.push({
      _id: id,
      status: 'REFUND_FAILED',
      amount: 5000,
      transactionId: new Types.ObjectId(),
      updatedAt: minutesAgo(5),
      createdAt: minutesAgo(50),
    });
    refunds.docs.push({
      _id: new Types.ObjectId(),
      status: 'REFUNDED',
      amount: 1000,
      transactionId: new Types.ObjectId(),
      updatedAt: minutesAgo(5),
      createdAt: minutesAgo(50),
    });
    await service.evaluate(NOW);
    await service.evaluate(NOW);
    expect(kinds()).toEqual(['REFUND_FAILED']);
    expect([...stored.values()][0]?.entityId?.toString()).toBe(id.toHexString());
  });

  it('delayed refunds and subscription events are idempotent per occurrence', async () => {
    const refund = {
      id: new Types.ObjectId().toHexString(),
      amount: 1,
      transactionId: 't',
    } as never;
    await service.refundsDelayed([refund]);
    await service.refundsDelayed([refund]);
    const endsAt = new Date('2026-10-20T00:00:00.000Z');
    const sub = {
      salonId: new Types.ObjectId().toHexString(),
      subscriptionId: 'sub1',
      status: 'TRIAL',
      endsAt,
    } as never;
    await service.subscription('subscription.ending_7d', sub);
    await service.subscription('subscription.ending_7d', sub);
    await service.subscription('subscription.expired', sub);
    expect(kinds()).toEqual(['REFUND_DELAYED', 'SUBSCRIPTION_ENDING', 'SUBSCRIPTION_EXPIRED']);
  });

  it('announces recent pending applications, reviews and catalog requests only', async () => {
    const submitted = minutesAgo(10);
    salons.docs.push({
      _id: new Types.ObjectId(),
      state: 'APPLICATION_PENDING',
      application: { submittedAt: submitted },
    });
    salons.docs.push({
      _id: new Types.ObjectId(),
      state: 'APPLICATION_PENDING',
      application: { submittedAt: minutesAgo(300) },
    });
    salons.docs.push({
      _id: new Types.ObjectId(),
      state: 'LIVE',
      application: { submittedAt: submitted },
    });
    reviews.docs.push({ _id: new Types.ObjectId(), status: 'PENDING', createdAt: minutesAgo(5) });
    reviews.docs.push({ _id: new Types.ObjectId(), status: 'APPROVED', createdAt: minutesAgo(5) });
    requests.docs.push({ _id: new Types.ObjectId(), status: 'PENDING', createdAt: minutesAgo(5) });
    await service.evaluate(NOW);
    await service.evaluate(NOW);
    expect(kinds()).toEqual(['CATALOG_REQUEST', 'REVIEW_PENDING', 'SALON_APPLICATION']);
  });

  it('a resubmitted application is announced again', async () => {
    const id = new Types.ObjectId();
    salons.docs.push({
      _id: id,
      state: 'APPLICATION_PENDING',
      application: { submittedAt: minutesAgo(20) },
    });
    await service.evaluate(NOW);
    salons.docs[0] = {
      _id: id,
      state: 'APPLICATION_PENDING',
      application: { submittedAt: minutesAgo(2) },
    };
    await service.evaluate(NOW);
    expect(kinds()).toEqual(['SALON_APPLICATION', 'SALON_APPLICATION']);
  });
});

describe('robustness', () => {
  it('a failing live feed does not lose the alert', async () => {
    feedFails = true;
    reviews.docs.push({ _id: new Types.ObjectId(), status: 'PENDING', createdAt: minutesAgo(1) });
    expect(await service.evaluate(NOW)).toBe(1);
    expect(kinds()).toEqual(['REVIEW_PENDING']);
  });

  it('one failing check does not hide the others', async () => {
    reviews.docs.push({ _id: new Types.ObjectId(), status: 'PENDING', createdAt: minutesAgo(1) });
    const broken = createAlertsService({
      alerts: alertsRepo,
      transactions: { count: () => Promise.reject(new Error('db')) } as never,
      refunds: new RefundsRepository(refunds.model as never),
      salons: new SalonsRepository(salons.model as never),
      reviews: new ReviewsRepository(reviews.model as never),
      catalogRequests: new CatalogRequestsRepository(requests.model as never),
      settings: { get: (() => Promise.resolve(rule)) as never },
      logger,
    });
    expect(await broken.evaluate(NOW)).toBe(1);
  });
});

describe('alerts repository', () => {
  it('turns a duplicate key into null', async () => {
    const dup = Object.assign(new Error('dup'), { code: 11000 });
    const repo = new AlertsRepository({ create: () => Promise.reject(dup) } as never);
    expect(await repo.createOnce({ dedupeKey: 'x' })).toBeNull();
    const other = new AlertsRepository({
      create: () => Promise.reject(new Error('boom')),
    } as never);
    await expect(other.createOnce({ dedupeKey: 'x' })).rejects.toThrow('boom');
  });
});
