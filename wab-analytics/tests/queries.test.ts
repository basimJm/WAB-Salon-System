import { createAnalytics } from '../src/analytics';
import { MemoryEventStore } from '../src/adapters/memory/eventStore';
import { MemoryIdentityStore } from '../src/adapters/memory/identityStore';
import { MemoryWarehouse } from '../src/adapters/memory/warehouse';
import { ERROR_CODES } from '../src/constants/codes';
import type { AnalyticsOptions } from '../src/config/options';
import type { Analytics, StoredEvent } from '../src/types';
import { at, codeOfAsync, ev } from './helpers';

interface Rig {
  analytics: Analytics;
  events: MemoryEventStore;
  identity: MemoryIdentityStore;
  warehouse: MemoryWarehouse;
}

const rig = (options: Partial<AnalyticsOptions> = {}, withWarehouse = true): Rig => {
  const events = new MemoryEventStore();
  const identity = new MemoryIdentityStore();
  const warehouse = new MemoryWarehouse();
  const analytics = createAnalytics(
    { environment: 'dev', ...options },
    { events, identity, ...(withWarehouse ? { warehouse } : {}) },
  );
  return { analytics, events, identity, warehouse };
};

const add = async (events: MemoryEventStore, rows: StoredEvent[]): Promise<void> => {
  for (const row of rows) await events.append(row);
};
const by = (actorId: string, name: string, iso: string): StoredEvent => ev(name, iso, { actorId });

const range = { from: at('2026-03-01T00:00:00Z'), to: at('2026-03-08T00:00:00Z') };
const steps = ['signup.started', 'otp.verified', 'booking.created'];

describe('funnel', () => {
  const seed = async (events: MemoryEventStore): Promise<void> => {
    await add(events, [
      by('u1', 'signup.started', '2026-03-01T10:00:00Z'),
      by('u1', 'otp.verified', '2026-03-01T10:01:00Z'),
      by('u1', 'booking.created', '2026-03-01T10:10:00Z'),
      by('u2', 'signup.started', '2026-03-01T11:00:00Z'),
      by('u2', 'otp.verified', '2026-03-01T11:02:00Z'),
      by('u3', 'signup.started', '2026-03-01T12:00:00Z'),
      by('u4', 'otp.verified', '2026-03-01T12:00:00Z'),
      by('u5', 'signup.started', '2026-03-01T01:00:00Z'),
      by('u5', 'otp.verified', '2026-03-07T23:00:00Z'),
      by('u6', 'signup.started', '2026-03-02T09:00:00Z'),
      by('u6', 'signup.started', '2026-03-02T09:05:00Z'),
      by('u6', 'otp.verified', '2026-03-02T09:05:30Z'),
      ev('signup.started', '2026-03-02T10:00:00Z'),
    ]);
  };

  it('computes users, conversion, drop-off, medians and drop-off lists', async () => {
    const { analytics, events } = rig();
    await seed(events);
    const result = await analytics.funnel({
      steps,
      ...range,
      dropOffUsers: 5,
      windowMs: 5 * 86_400_000,
    });
    expect(result.truncated).toBe(false);
    expect(result.steps.map((s) => s.users)).toEqual([5, 3, 1]);
    expect(result.steps[0]).toMatchObject({
      conversionFromPrevious: 1,
      conversionFromFirst: 1,
      dropOff: 0,
      medianMsFromPrevious: null,
    });
    expect(result.steps[1]).toMatchObject({
      conversionFromPrevious: 0.6,
      conversionFromFirst: 0.6,
      dropOff: 2,
      medianMsFromPrevious: 60_000,
    });
    expect(result.steps[2]).toMatchObject({
      conversionFromPrevious: 0.3333,
      conversionFromFirst: 0.2,
      dropOff: 2,
    });
    expect(result.steps[1]?.dropOffUsers).toEqual(['CUSTOMER:u3', 'CUSTOMER:u5']);
    expect(result.steps[2]?.dropOffUsers).toEqual(['CUSTOMER:u2', 'CUSTOMER:u6']);
  });

  it('averages the two middle gaps and omits lists by default', async () => {
    const { analytics, events } = rig();
    await add(events, [
      by('a', 'signup.started', '2026-03-01T10:00:00Z'),
      by('a', 'otp.verified', '2026-03-01T10:00:01Z'),
      by('b', 'signup.started', '2026-03-01T10:00:00Z'),
      by('b', 'otp.verified', '2026-03-01T10:00:04Z'),
    ]);
    const result = await analytics.funnel({ steps: steps.slice(0, 2), ...range });
    expect(result.steps[1]?.medianMsFromPrevious).toBe(2500);
    expect(result.steps[1]?.dropOffUsers).toEqual([]);
  });

  it('answers zeros for an empty range and honours the window', async () => {
    const { analytics, events } = rig();
    const empty = await analytics.funnel({ steps, ...range });
    expect(
      empty.steps.map((s) => [s.users, s.conversionFromPrevious, s.conversionFromFirst]),
    ).toEqual([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
    await add(events, [
      by('a', 'signup.started', '2026-03-01T10:00:00Z'),
      by('a', 'otp.verified', '2026-03-01T10:30:00Z'),
    ]);
    const tight = await analytics.funnel({ steps: steps.slice(0, 2), ...range, windowMs: 60_000 });
    expect(tight.steps.map((s) => s.users)).toEqual([1, 0]);
  });

  it('marks truncated results instead of dropping silently', async () => {
    const { analytics, events } = rig({ limits: { maxScannedEvents: 2 } });
    await seed(events);
    const result = await analytics.funnel({ steps, ...range });
    expect(result.truncated).toBe(true);
  });

  it('reads app events of the warehouse (user id, else installation)', async () => {
    const { analytics, warehouse } = rig();
    const app = (name: string, iso: string, extra: object): void => {
      warehouse.addAppEvent({
        ts: at(iso),
        name,
        installationId: 'inst-0001',
        params: {},
        ...extra,
      });
    };
    app('signup.started', '2026-03-01T10:00:00Z', {});
    app('otp.verified', '2026-03-01T10:01:00Z', {});
    app('signup.started', '2026-03-01T10:00:00Z', { userId: 'u9', installationId: 'inst-0002' });
    const result = await analytics.funnel({
      steps: steps.slice(0, 2),
      ...range,
      source: 'APP',
      dropOffUsers: 2,
    });
    expect(result.steps.map((s) => s.users)).toEqual([2, 1]);
    expect(result.steps[1]?.dropOffUsers).toEqual(['user:u9']);
  });

  it('needs a warehouse for app funnels', async () => {
    const { analytics } = rig({}, false);
    expect(await codeOfAsync(analytics.funnel({ steps, ...range, source: 'APP' }))).toBe(
      ERROR_CODES.ANALYTICS_NOT_CONFIGURED,
    );
  });

  it('validates the definition', async () => {
    const { analytics } = rig();
    const code = (def: object): Promise<string> =>
      codeOfAsync(analytics.funnel({ steps, ...range, ...def }));
    expect(await code({ steps: ['a.b'] })).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(await code({ steps: Array.from({ length: 11 }, (_, i) => `a.n${String(i)}`) })).toBe(
      ERROR_CODES.VALIDATION_FAILED,
    );
    expect(await code({ steps: ['a.b', 'Bad Name'] })).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(await code({ dropOffUsers: -1 })).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(await code({ dropOffUsers: 101 })).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(await code({ dropOffUsers: 1.5 })).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(await code({ windowMs: 0 })).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(await code({ to: range.from })).toBe(ERROR_CODES.ANALYTICS_RANGE_INVALID);
  });
});

describe('cohorts', () => {
  const def = {
    startEvent: 'user.registered',
    returnEvent: 'app.opened',
    from: at('2026-03-01T00:00:00Z'),
    to: at('2026-03-04T00:00:00Z'),
    unit: 'DAY' as const,
    periods: 2,
  };

  it('builds daily retention in the business time zone', async () => {
    const { analytics, events } = rig();
    await add(events, [
      by('a', 'app.opened', '2026-03-01T08:00:00Z'),
      by('a', 'user.registered', '2026-03-01T10:00:00Z'),
      by('a', 'app.opened', '2026-03-02T10:00:00Z'),
      by('a', 'app.opened', '2026-03-02T11:00:00Z'),
      by('a', 'app.opened', '2026-03-03T10:00:00Z'),
      by('b', 'user.registered', '2026-03-01T10:00:00Z'),
      by('b', 'app.opened', '2026-03-03T10:00:00Z'),
      by('c', 'user.registered', '2026-03-01T21:30:00Z'),
      by('c', 'app.opened', '2026-03-03T10:00:00Z'),
      by('d', 'user.registered', '2026-03-10T10:00:00Z'),
      by('e', 'app.opened', '2026-03-02T10:00:00Z'),
      by('b', 'app.opened', '2026-03-09T10:00:00Z'),
    ]);
    const result = await analytics.cohorts(def);
    expect(result.unit).toBe('DAY');
    expect(result.truncated).toBe(false);
    expect(result.cohorts).toEqual([
      { cohort: '2026-03-01', size: 2, retained: [1, 2] },
      { cohort: '2026-03-02', size: 1, retained: [1, 0] },
    ]);
  });

  it('groups by week starting on Monday', async () => {
    const { analytics, events } = rig();
    await add(events, [
      by('a', 'user.registered', '2026-03-01T10:00:00Z'),
      by('a', 'app.opened', '2026-03-03T10:00:00Z'),
      by('b', 'user.registered', '2026-03-04T10:00:00Z'),
      by('b', 'app.opened', '2026-03-10T10:00:00Z'),
    ]);
    const result = await analytics.cohorts({
      ...def,
      unit: 'WEEK',
      periods: 1,
      to: at('2026-03-08T00:00:00Z'),
    });
    expect(result.cohorts).toEqual([
      { cohort: '2026-02-23', size: 1, retained: [1] },
      { cohort: '2026-03-02', size: 1, retained: [1] },
    ]);
  });

  it('reads app events and needs a warehouse for them', async () => {
    const { analytics, warehouse } = rig();
    const app = (name: string, iso: string): void => {
      warehouse.addAppEvent({
        ts: at(iso),
        name,
        installationId: 'inst-0001',
        userId: 'u1',
        params: {},
      });
    };
    app('user.registered', '2026-03-01T10:00:00Z');
    app('app.opened', '2026-03-02T10:00:00Z');
    expect((await analytics.cohorts({ ...def, source: 'APP' })).cohorts[0]?.retained).toEqual([
      1, 0,
    ]);
    expect(await codeOfAsync(rig({}, false).analytics.cohorts({ ...def, source: 'APP' }))).toBe(
      ERROR_CODES.ANALYTICS_NOT_CONFIGURED,
    );
  });

  it('validates the definition', async () => {
    const { analytics } = rig();
    const code = (change: object): Promise<string> =>
      codeOfAsync(analytics.cohorts({ ...def, ...change }));
    expect(await code({ startEvent: 'Bad' })).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(await code({ returnEvent: 'Bad' })).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(await code({ unit: 'MONTH' })).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(await code({ periods: 0 })).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(await code({ periods: 13 })).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(await code({ periods: 1.5 })).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(await code({ timeZone: 'Mars/Base' })).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(await code({ to: def.from })).toBe(ERROR_CODES.ANALYTICS_RANGE_INVALID);
  });
});

describe('journey', () => {
  const actor = { actorType: 'CUSTOMER', actorId: 'u1' };
  const seed = async (r: Rig): Promise<void> => {
    await r.identity.link({ ...actor, installationId: 'inst-0001' });
    await add(r.events, [
      by('u1', 'user.registered', '2026-03-01T10:05:00Z'),
      by('u1', 'booking.created', '2026-03-01T12:00:00Z'),
      by('u2', 'booking.created', '2026-03-01T10:00:00Z'),
    ]);
    r.warehouse.addAppEvent({
      ts: at('2026-03-01T10:00:00Z'),
      name: 'screen_view',
      installationId: 'inst-0001',
      screen: 'Home',
      params: { a: 1 },
    });
    r.warehouse.addAppEvent({
      ts: at('2026-03-01T11:59:00Z'),
      name: 'tap',
      installationId: 'inst-0009',
      userId: 'u1',
      params: {},
    });
    r.warehouse.addAppEvent({
      ts: at('2026-03-01T10:01:00Z'),
      name: 'screen_view',
      installationId: 'inst-0777',
      params: {},
    });
    r.warehouse.addCrash({
      ts: at('2026-03-01T12:01:00Z'),
      issueId: 'i1',
      title: 'NPE',
      appVersion: '1.0',
      installationId: 'inst-0001',
    });
    r.warehouse.addCrash({ ts: at('2026-03-01T12:02:00Z'), issueId: 'i2', userId: 'u1' });
  };

  it('merges guest app events, server events and crashes into sessions', async () => {
    const r = rig();
    await seed(r);
    const items = await r.analytics.journey(actor, range);
    expect(items.map((i) => [i.source, i.name, i.sessionId])).toEqual([
      ['APP', 'screen_view', 's1'],
      ['SERVER', 'user.registered', 's1'],
      ['APP', 'tap', 's2'],
      ['SERVER', 'booking.created', 's2'],
      ['CRASH', 'app.crash', 's2'],
      ['CRASH', 'app.crash', 's2'],
    ]);
    expect(items[0]).toMatchObject({
      screen: 'Home',
      params: { a: 1 },
      ts: '2026-03-01T10:00:00.000Z',
    });
    expect(items[4]?.params).toEqual({ issueId: 'i1', title: 'NPE', appVersion: '1.0' });
    expect(items[5]?.params).toEqual({ issueId: 'i2' });
  });

  it('pages the timeline', async () => {
    const r = rig();
    await seed(r);
    const page = await r.analytics.journey(actor, range, { limit: 2, offset: 1 });
    expect(page.map((i) => i.name)).toEqual(['user.registered', 'tap']);
    expect(await r.analytics.journey(actor, range, { limit: 5, offset: 50 })).toEqual([]);
  });

  it('works with server events only', async () => {
    const r = rig({}, false);
    await seed(r);
    expect((await r.analytics.journey(actor, range)).map((i) => i.source)).toEqual([
      'SERVER',
      'SERVER',
    ]);
  });

  it('validates actor, range and paging', async () => {
    const { analytics } = rig();
    expect(await codeOfAsync(analytics.journey({ actorType: 'x', actorId: 'u1' }, range))).toBe(
      ERROR_CODES.ANALYTICS_EVENT_INVALID,
    );
    expect(await codeOfAsync(analytics.journey(actor, { from: range.to, to: range.from }))).toBe(
      ERROR_CODES.ANALYTICS_RANGE_INVALID,
    );
    for (const page of [
      { limit: 0 },
      { limit: 501 },
      { limit: 1.5 },
      { offset: -1 },
      { offset: 0.5 },
    ]) {
      expect(await codeOfAsync(analytics.journey(actor, range, page))).toBe(
        ERROR_CODES.VALIDATION_FAILED,
      );
    }
  });
});

describe('overview', () => {
  it('summarizes the range with and without a warehouse', async () => {
    const r = rig();
    await add(r.events, [
      by('u1', 'a.one', '2026-03-01T10:00:00Z'),
      by('u2', 'a.one', '2026-03-01T21:30:00Z'),
      by('u1', 'b.two', '2026-03-02T10:00:00Z'),
      ev('c.three', '2026-03-02T10:00:00Z'),
      ev('d.four', '2026-03-02T10:00:00Z'),
    ]);
    r.warehouse.addAppEvent({
      ts: at('2026-03-01T10:00:00Z'),
      name: 'x',
      installationId: 'inst-0001',
      params: {},
    });
    r.warehouse.addAppEvent({
      ts: at('2026-03-01T10:00:00Z'),
      name: 'x',
      installationId: 'inst-0001',
      userId: 'u1',
      params: {},
    });
    const result = await r.analytics.overview(range);
    expect(result).toMatchObject({
      totalEvents: 5,
      uniqueActors: 2,
      activeInstallations: 2,
      from: '2026-03-01T00:00:00.000Z',
    });
    expect(result.topEvents.map((t) => t.key)).toEqual(['a.one', 'b.two', 'c.three', 'd.four']);
    expect(result.daily).toEqual([
      { key: '2026-03-01', count: 1 },
      { key: '2026-03-02', count: 4 },
    ]);
    const lonely = rig({ limits: { topEvents: 1 } }, false);
    await add(lonely.events, [by('u1', 'a.one', '2026-03-01T10:00:00Z')]);
    const solo = await lonely.analytics.overview(range);
    expect(solo.activeInstallations).toBeNull();
    expect(solo.topEvents).toHaveLength(1);
  });

  it('validates the range', async () => {
    expect(await codeOfAsync(rig().analytics.overview({ from: range.to, to: range.from }))).toBe(
      ERROR_CODES.ANALYTICS_RANGE_INVALID,
    );
  });
});

describe('memory warehouse', () => {
  it('counts by name/day, filters ownership and limits', async () => {
    const warehouse = new MemoryWarehouse();
    const app = (name: string, iso: string, extra: object = {}): void => {
      warehouse.addAppEvent({
        ts: at(iso),
        name,
        installationId: 'inst-0001',
        params: {},
        ...extra,
      });
    };
    app('a.one', '2026-03-01T10:00:00Z');
    app('a.one', '2026-03-01T21:30:00Z');
    app('b.two', '2026-03-02T10:00:00Z', { userId: 'u1' });
    const q = { ...range, timeZone: 'Asia/Amman' };
    expect(await warehouse.countAppEvents({ ...q, groupBy: 'NAME' })).toEqual([
      { key: 'a.one', count: 2 },
      { key: 'b.two', count: 1 },
    ]);
    expect(await warehouse.countAppEvents({ ...q, groupBy: 'DAY', names: ['a.one'] })).toEqual([
      { key: '2026-03-01', count: 1 },
      { key: '2026-03-02', count: 1 },
    ]);
    expect(await warehouse.findAppEvents({ ...range, limit: 10 })).toHaveLength(3);
    expect(await warehouse.findAppEvents({ ...range, limit: 1, userIds: ['u1'] })).toHaveLength(1);
    expect(
      await warehouse.findAppEvents({
        ...range,
        limit: 10,
        installationIds: ['nope'],
        userIds: ['nope'],
      }),
    ).toHaveLength(0);
    expect(await warehouse.findCrashes({ ...range, limit: 5 })).toEqual([]);
    expect(await warehouse.countAppActors({ ...range, names: ['a.one'] })).toBe(1);
  });
});
