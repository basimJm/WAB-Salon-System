import { createAnalytics } from '../../src/analytics';
import { MemoryEventStore } from '../../src/adapters/memory/eventStore';
import { MemoryWarehouse } from '../../src/adapters/memory/warehouse';
import { MemoryCache } from '../../src/cache/stores';
import { unavailableError } from '../../src/errors';
import type { EventStore } from '../../src/ports';

/**
 * Loop test: track -> count -> funnel -> journey, 1 000 iterations, 20 at a time, with injected
 * (retryable) store failures. Asserts: track never throws, counts are exact, cached answers equal
 * fresh ones, and the cache stays bounded.
 */
const ITERATIONS = 1000;
const CONCURRENCY = 20;
const FAIL_EVERY = 7;
const HOUR_MS = 3_600_000;
const range = {
  from: new Date(Date.now() - HOUR_MS),
  to: new Date(Date.now() + HOUR_MS),
};
const steps = ['signup.started', 'otp.verified', 'booking.created'];

describe('analytics loop', () => {
  it('stays exact, never throws and stays bounded', async () => {
    const memory = new MemoryEventStore();
    const seen = new Set<string>();
    let fresh = 0;
    const flaky: EventStore = {
      append: (event) => {
        // The first attempt of every 7th distinct event fails; its retry succeeds.
        const key = `${event.actorId ?? ''}:${event.name}`;
        if (!seen.has(key)) {
          seen.add(key);
          fresh += 1;
          if (fresh % FAIL_EVERY === 0) {
            return Promise.reject(unavailableError('injected failure'));
          }
        }
        return memory.append(event);
      },
      count: (query) => memory.count(query),
      find: (query) => memory.find(query),
      countActors: (query) => memory.countActors(query),
    };
    const warehouse = new MemoryWarehouse();
    const cache = new MemoryCache(50);
    const analytics = createAnalytics(
      {
        environment: 'dev',
        retry: { attempts: 3, baseDelayMs: 0, maxDelayMs: 0 },
        cache: { store: 'custom', custom: cache, ttlSec: 60 },
      },
      { events: flaky, warehouse },
    );

    let stored = 0;
    for (let start = 0; start < ITERATIONS; start += CONCURRENCY) {
      const batch = Array.from({ length: CONCURRENCY }, async (_, offset) => {
        const i = start + offset;
        const actorId = `u${String(i)}`;
        let storedHere = 0;
        for (const name of steps) {
          if (await analytics.track({ name, actorType: 'CUSTOMER', actorId })) storedHere += 1;
        }
        await analytics.linkIdentity({
          installationId: `inst-${String(i).padStart(6, '0')}`,
          actorType: 'CUSTOMER',
          actorId,
        });
        return storedHere;
      });
      for (const count of await Promise.all(batch)) stored += count;
    }
    expect(stored).toBe(ITERATIONS * steps.length);

    const counts = await analytics.countEvents({ ...range, groupBy: 'NAME', names: steps });
    expect(counts.map((row) => row.count)).toEqual([ITERATIONS, ITERATIONS, ITERATIONS]);

    const funnel = await analytics.funnel({ steps, ...range });
    expect(funnel.truncated).toBe(false);
    expect(funnel.steps.map((step) => step.users)).toEqual([ITERATIONS, ITERATIONS, ITERATIONS]);

    const first = await analytics.overview(range);
    const cached = await analytics.overview(range);
    expect(cached).toEqual(first);
    expect(first.uniqueActors).toBe(ITERATIONS);

    const items = await analytics.journey({ actorType: 'CUSTOMER', actorId: 'u5' }, range);
    expect(items.filter((item) => steps.includes(item.name))).toHaveLength(steps.length);

    for (let i = 0; i < ITERATIONS; i += 1) {
      await analytics.countEvents({
        from: new Date(range.from.getTime() + i * 1000),
        to: range.to,
        groupBy: 'NAME',
      });
    }
    expect(cache.size).toBeLessThanOrEqual(50);
  });

  it('track never throws when the store is down for good', async () => {
    const dead: EventStore = {
      append: () => Promise.reject(new Error('down')),
      count: () => Promise.resolve([]),
      find: () => Promise.resolve([]),
      countActors: () => Promise.resolve(0),
    };
    const analytics = createAnalytics(
      { environment: 'dev', retry: { attempts: 2, baseDelayMs: 0, maxDelayMs: 0 } },
      { events: dead },
    );
    const results = await Promise.all(
      Array.from({ length: 200 }, (_, i) =>
        analytics.track({
          name: 'payment.failed',
          actorType: 'CUSTOMER',
          actorId: `u${String(i)}`,
        }),
      ),
    );
    expect(results.every((stored) => !stored)).toBe(true);
  });
});
