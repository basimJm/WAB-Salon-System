import { createAnalytics } from '../src/analytics';
import { MemoryEventStore } from '../src/adapters/memory/eventStore';
import { ERROR_CODES } from '../src/constants/codes';
import { unavailableError } from '../src/errors';
import { assertActor, assertLink, buildEvent } from '../src/event';
import { resolveOptions } from '../src/config/options';
import type { EventStore } from '../src/ports';
import { createService } from '../src/service';
import { at, codeOf, codeOfAsync, sleepless } from './helpers';

const options = resolveOptions({ environment: 'dev' });
const now = at('2026-03-01T10:00:00Z');
const valid = {
  name: 'payment.failed',
  actorType: 'CUSTOMER',
  actorId: 'u1',
  params: { code: '05' },
};

describe('buildEvent', () => {
  it('stamps the time, keeps gateway codes and redacts secrets', () => {
    const event = buildEvent(
      { ...valid, params: { code: '05', otpCode: '1', nested: { token: 't' } } },
      options,
      now,
    );
    expect(event.ts).toBe(now);
    expect(event.params).toEqual({
      code: '05',
      otpCode: '[redacted]',
      nested: { token: '[redacted]' },
    });
  });

  it('defaults params to an empty object', () => {
    expect(buildEvent({ name: 'a.b', actorType: 'SYSTEM' }, options, now).params).toEqual({});
  });

  it.each([
    ['bad name', { ...valid, name: 'Bad Name' }],
    ['bad actor type', { ...valid, actorType: 'customer' }],
    ['bad id', { ...valid, actorId: 'has space' }],
    ['unknown key', { ...valid, extra: 1 }],
    ['not an object', 'x'],
  ])('rejects %s naming paths only', (_label, input) => {
    expect(codeOf(() => buildEvent(input, options, now))).toBe(ERROR_CODES.ANALYTICS_EVENT_INVALID);
  });

  it('rejects oversized params', () => {
    const params = { blob: 'x'.repeat(9000) };
    expect(codeOf(() => buildEvent({ ...valid, params }, options, now))).toBe(
      ERROR_CODES.ANALYTICS_EVENT_INVALID,
    );
  });

  it('validates actors and links', () => {
    expect(() => {
      assertActor({ actorType: 'CUSTOMER', actorId: 'u1' }, options);
    }).not.toThrow();
    expect(
      codeOf(() => {
        assertActor({ actorType: 'x', actorId: 'u1' }, options);
      }),
    ).toBe(ERROR_CODES.ANALYTICS_EVENT_INVALID);
    const link = { installationId: 'inst-0001', actorType: 'CUSTOMER', actorId: 'u1' };
    expect(() => {
      assertLink(link, options);
    }).not.toThrow();
    expect(
      codeOf(() => {
        assertLink({ ...link, installationId: 'short' }, options);
      }),
    ).toBe(ERROR_CODES.ANALYTICS_EVENT_INVALID);
  });
});

describe('service', () => {
  const build = (events: EventStore = new MemoryEventStore()): ReturnType<typeof createAnalytics> =>
    createAnalytics({ environment: 'dev' }, { events });

  it('tracks a valid event and counts it', async () => {
    const analytics = createAnalytics({ environment: 'dev' });
    expect(await analytics.track(valid)).toBe(true);
    const rows = await analytics.countEvents({
      from: new Date(Date.now() - 60_000),
      to: new Date(Date.now() + 60_000),
      groupBy: 'NAME',
    });
    expect(rows).toEqual([{ key: 'payment.failed', count: 1 }]);
  });

  it('track never throws: invalid input and store failures give false', async () => {
    const warnings: string[] = [];
    const failing: EventStore = {
      append: () => Promise.reject(new Error('disk')),
      count: () => Promise.resolve([]),
      find: () => Promise.resolve([]),
      countActors: () => Promise.resolve(0),
    };
    const analytics = createAnalytics(
      {
        environment: 'dev',
        retry: { attempts: 1 },
        logger: {
          debug: () => undefined,
          info: () => undefined,
          error: () => undefined,
          warn: (m: string) => {
            warnings.push(m);
          },
        },
      },
      { events: failing },
    );
    expect(await analytics.track(valid)).toBe(false);
    expect(await analytics.track({ name: 'BAD' } as never)).toBe(false);
    expect(await analytics.track({ name: 5 } as never)).toBe(false);
    expect(warnings).toHaveLength(3);
  });

  it('retries a retryable store failure then stores', async () => {
    const hooks = sleepless();
    const memory = new MemoryEventStore();
    let calls = 0;
    const flaky: EventStore = {
      append: (event) => {
        calls += 1;
        return calls < 3 ? Promise.reject(unavailableError('down')) : memory.append(event);
      },
      count: (q) => memory.count(q),
      find: (q) => memory.find(q),
      countActors: (q) => memory.countActors(q),
    };
    const analytics = createService({
      options,
      events: flaky,
      identity: {
        link: () => Promise.resolve(),
        linksOfActor: () => Promise.resolve([]),
        linksOfInstallations: () => Promise.resolve([]),
      },
      retryHooks: { sleep: hooks.sleep, random: () => 0 },
      now: () => now,
    });
    expect(await analytics.track(valid)).toBe(true);
    expect(calls).toBe(3);
    expect(hooks.slept).toHaveLength(2);
  });

  it('links identities and records the identity event unless disabled', async () => {
    const events = new MemoryEventStore();
    const link = { installationId: 'inst-0001', actorType: 'CUSTOMER', actorId: 'u1' };
    const analytics = build(events);
    await analytics.linkIdentity(link);
    const found = await events.find({
      from: at('2020-01-01'),
      to: at('2100-01-01'),
      limit: 5,
      order: 'asc',
    });
    expect(found.map((e) => e.name)).toEqual(['identity.linked']);
    expect(found[0]?.params).toEqual({ installationId: 'inst-0001' });

    const quiet = new MemoryEventStore();
    const silent = createAnalytics(
      { environment: 'dev', trackIdentityEvent: false },
      { events: quiet },
    );
    await silent.linkIdentity(link);
    expect(await quiet.countActors({ from: at('2020-01-01'), to: at('2100-01-01') })).toBe(0);
  });

  it('rejects an invalid link', async () => {
    const analytics = build();
    expect(
      await codeOfAsync(
        analytics.linkIdentity({ installationId: 'x', actorType: 'CUSTOMER', actorId: 'u1' }),
      ),
    ).toBe(ERROR_CODES.ANALYTICS_EVENT_INVALID);
  });

  it('validates count queries and needs a warehouse for APP', async () => {
    const analytics = build();
    const range = { from: at('2026-03-01T00:00:00Z'), to: at('2026-03-02T00:00:00Z') };
    expect(
      await codeOfAsync(analytics.countEvents({ ...range, to: range.from, groupBy: 'NAME' })),
    ).toBe(ERROR_CODES.ANALYTICS_RANGE_INVALID);
    expect(await codeOfAsync(analytics.countEvents({ ...range, groupBy: 'HOUR' as never }))).toBe(
      ERROR_CODES.VALIDATION_FAILED,
    );
    expect(
      await codeOfAsync(analytics.countEvents({ ...range, groupBy: 'DAY', timeZone: 'Mars/Base' })),
    ).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(
      await codeOfAsync(analytics.countEvents({ ...range, groupBy: 'NAME', names: ['BAD'] })),
    ).toBe(ERROR_CODES.VALIDATION_FAILED);
    const many = Array.from({ length: 21 }, (_, i) => `a.n${String(i)}`);
    expect(
      await codeOfAsync(analytics.countEvents({ ...range, groupBy: 'NAME', names: many })),
    ).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(
      await codeOfAsync(analytics.countEvents({ ...range, groupBy: 'NAME', source: 'APP' })),
    ).toBe(ERROR_CODES.ANALYTICS_NOT_CONFIGURED);
  });

  it('wraps foreign store errors as typed errors', async () => {
    const broken: EventStore = {
      append: () => Promise.resolve(),
      count: () => Promise.reject(new Error('boom')),
      find: () => Promise.resolve([]),
      countActors: () => Promise.resolve(0),
    };
    const analytics = build(broken);
    expect(
      await codeOfAsync(
        analytics.countEvents({ from: at('2026-03-01'), to: at('2026-03-02'), groupBy: 'NAME' }),
      ),
    ).toBe(ERROR_CODES.UNKNOWN);
  });

  it('init and close call the adapters that have them', async () => {
    const calls: string[] = [];
    const events: EventStore = {
      append: () => Promise.resolve(),
      count: () => Promise.resolve([]),
      find: () => Promise.resolve([]),
      countActors: () => Promise.resolve(0),
      init: () => {
        calls.push('init');
        return Promise.resolve();
      },
      close: () => {
        calls.push('close');
        return Promise.resolve();
      },
    };
    const analytics = build(events);
    await analytics.init();
    await analytics.close();
    expect(calls).toEqual(['init', 'close']);
    await build().init();
  });
});
