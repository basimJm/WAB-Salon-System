import { PERIODIC_JOBS } from '../src/constants/jobs';
import type { RecurringJob } from '../src/jobs/jobs';
import { createPeriodicJobs, type PeriodicJobsDeps } from '../src/jobs/periodicJobs';
import { createLogger } from '../src/utils/logger';

const logger = createLogger({ level: 'silent' });
const calls: string[] = [];
const registered: RecurringJob[] = [];
const alert = (id: string): never =>
  ({ salonId: `s-${id}`, subscriptionId: id, status: 'TRIAL', endsAt: new Date(0) }) as never;
let delayed: unknown[] = [];
const delayedSeen: unknown[][] = [];

const build = (over: Partial<PeriodicJobsDeps> = {}): ReturnType<typeof createPeriodicJobs> =>
  createPeriodicJobs({
    scheduler: {
      repeat: (job) => {
        registered.push(job);
        return Promise.resolve();
      },
    },
    settings: {
      get: ((key: string) =>
        Promise.resolve(key === 'timezone' ? 'Asia/Amman' : undefined)) as never,
    },
    subscriptions: {
      expireDue: () => {
        calls.push('expireDue');
        return Promise.resolve([alert('a')]);
      },
      endingSoon: () => {
        calls.push('endingSoon');
        return Promise.resolve([alert('b'), alert('c')]);
      },
    },
    accounts: {
      purgeDueCustomers: () => {
        calls.push('purge');
        return Promise.resolve(3);
      },
    },
    refunds: {
      runDue: () => {
        calls.push('runDue');
        return Promise.resolve(2);
      },
      delayed: () => Promise.resolve(delayed as never),
    },
    payments: {
      reconcilePending: () => {
        calls.push('reconcilePending');
        return Promise.resolve(1);
      },
      refundOrphans: () => {
        calls.push('refundOrphans');
        return Promise.resolve(0);
      },
    },
    ledger: {
      reconcile: () => {
        calls.push('ledger');
        return Promise.resolve(0);
      },
    },
    bookingJobs: {
      reconcile: () => {
        calls.push('bookingJobs');
        return Promise.resolve(5);
      },
    },
    notifySubscription: (event, subscription) => {
      calls.push(`${event}:${subscription.subscriptionId}`);
      return Promise.resolve();
    },
    onDelayedRefunds: (refunds) => {
      delayedSeen.push(refunds);
      return Promise.resolve();
    },
    logger,
    ...over,
  });
const run = (jobs: ReturnType<typeof createPeriodicJobs>, name: string): Promise<void> => {
  const handler = jobs.handlers[name];
  if (handler === undefined) throw new Error(`no handler ${name}`);
  return handler({ id: name, name, data: {}, attempt: 1 });
};

beforeEach(() => {
  calls.length = 0;
  registered.length = 0;
  delayed = [];
  delayedSeen.length = 0;
});

describe('periodic jobs', () => {
  it('registers every schedule in the business time zone, one id per job', async () => {
    await build().register();
    expect(registered.map((j) => j.id).sort()).toEqual(
      Object.values(PERIODIC_JOBS)
        .map((j) => j.name)
        .sort(),
    );
    expect(new Set(registered.map((j) => j.timeZone))).toEqual(new Set(['Asia/Amman']));
    expect(registered.find((j) => j.id === PERIODIC_JOBS.subscriptionsCheck.name)?.cron).toBe(
      '0 9 * * *',
    );
    expect(registered.find((j) => j.id === PERIODIC_JOBS.accountsPurge.name)?.cron).toBe(
      '0 3 * * *',
    );
  });

  it('has a handler for every registered job and nothing else', () => {
    expect(Object.keys(build().handlers).sort()).toEqual(
      Object.values(PERIODIC_JOBS)
        .map((j) => j.name)
        .sort(),
    );
  });

  it('every cron is a valid 5-field expression', () => {
    for (const job of Object.values(PERIODIC_JOBS)) {
      expect(job.cron.split(' ')).toHaveLength(5);
    }
  });

  it('subscriptions check expires first, then warns, and tells the owners', async () => {
    await run(build(), PERIODIC_JOBS.subscriptionsCheck.name);
    expect(calls).toEqual([
      'expireDue',
      'subscription.expired:a',
      'endingSoon',
      'subscription.ending_7d:b',
      'subscription.ending_7d:c',
    ]);
  });

  it('runs the purge, the refund retry, the payment and ledger reconciliations and the booking-job rebuild', async () => {
    const jobs = build();
    await run(jobs, PERIODIC_JOBS.accountsPurge.name);
    await run(jobs, PERIODIC_JOBS.refundsRetry.name);
    await run(jobs, PERIODIC_JOBS.paymentsReconcile.name);
    await run(jobs, PERIODIC_JOBS.ledgerReconcile.name);
    await run(jobs, PERIODIC_JOBS.bookingJobsReconcile.name);
    expect(calls).toEqual([
      'purge',
      'runDue',
      'reconcilePending',
      'refundOrphans',
      'ledger',
      'bookingJobs',
    ]);
  });

  it('reports delayed refunds only when there are some', async () => {
    const jobs = build();
    await run(jobs, PERIODIC_JOBS.refundsDelayed.name);
    expect(delayedSeen).toEqual([]);
    delayed = [{ id: 'r1' }];
    await run(jobs, PERIODIC_JOBS.refundsDelayed.name);
    expect(delayedSeen).toEqual([[{ id: 'r1' }]]);
  });

  it('evaluates the alerts when an engine is wired and does nothing otherwise', async () => {
    await run(build(), PERIODIC_JOBS.alertsEvaluate.name);
    await run(
      build({
        evaluateAlerts: () => {
          calls.push('alerts');
          return Promise.resolve(2);
        },
      }),
      PERIODIC_JOBS.alertsEvaluate.name,
    );
    expect(calls).toEqual(['alerts']);
  });

  it('lets a failure reach the queue so it is retried', async () => {
    const jobs = build({
      accounts: { purgeDueCustomers: () => Promise.reject(new Error('db down')) },
    });
    await expect(run(jobs, PERIODIC_JOBS.accountsPurge.name)).rejects.toThrow('db down');
  });

  it('a failed notification is logged and the remaining alerts still go out', async () => {
    const told: string[] = [];
    const jobs = build({
      notifySubscription: (event, subscription) => {
        told.push(`${event}:${subscription.subscriptionId}`);
        return subscription.subscriptionId === 'a'
          ? Promise.reject(new Error('push down'))
          : Promise.resolve();
      },
    });
    await run(jobs, PERIODIC_JOBS.subscriptionsCheck.name);
    expect(told).toEqual([
      'subscription.expired:a',
      'subscription.ending_7d:b',
      'subscription.ending_7d:c',
    ]);
  });
});
