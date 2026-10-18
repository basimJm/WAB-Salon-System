import { createAnalytics } from '../src/analytics';
import { MemoryIdentityStore } from '../src/adapters/memory/identityStore';
import { MemoryEventStore } from '../src/adapters/memory/eventStore';
import { MemoryWarehouse } from '../src/adapters/memory/warehouse';
import { ERROR_CODES } from '../src/constants/codes';
import { resolveAppSubjects } from '../src/queries/subjects';
import type { AppEvent } from '../src/ports';
import type { Analytics } from '../src/types';
import { at, codeOfAsync, ev } from './helpers';

const range = { from: at('2026-03-01T00:00:00Z'), to: at('2026-03-08T00:00:00Z') };
const customer = (actorId: string): { actorType: string; actorId: string } => ({
  actorType: 'CUSTOMER',
  actorId,
});

interface Rig {
  analytics: Analytics;
  events: MemoryEventStore;
  warehouse: MemoryWarehouse;
}

const rig = (limits: object = {}): Rig => {
  const events = new MemoryEventStore();
  const warehouse = new MemoryWarehouse();
  const analytics = createAnalytics(
    { environment: 'dev', trackIdentityEvent: false, limits },
    { events, warehouse },
  );
  return { analytics, events, warehouse };
};

const app = (
  warehouse: MemoryWarehouse,
  name: string,
  iso: string,
  installationId: string,
  userId?: string,
): void => {
  warehouse.addAppEvent({
    ts: at(iso),
    name,
    installationId,
    params: {},
    ...(userId === undefined ? {} : { userId }),
  });
};

describe('guest and registered history are one actor', () => {
  const steps = ['screen.opened', 'user.registered'];

  it('a funnel across app and server events needs the link', async () => {
    const r = rig();
    app(r.warehouse, 'screen.opened', '2026-03-01T10:00:00Z', 'inst-0001');
    await r.events.append(ev('user.registered', '2026-03-01T10:05:00Z', { actorId: 'u1' }));

    const unlinked = await r.analytics.funnel({ steps, ...range, source: 'ALL' });
    expect(unlinked.steps.map((s) => s.users)).toEqual([1, 0]);

    await r.analytics.linkIdentity({ ...customer('u1'), installationId: 'inst-0001' });
    const linked = await r.analytics.funnel({ steps, ...range, source: 'ALL' });
    expect(linked.steps.map((s) => s.users)).toEqual([1, 1]);
    expect(linked.steps[1]?.medianMsFromPrevious).toBe(300_000);
  });

  it('cohorts start in the app as a guest and return on the server', async () => {
    const r = rig();
    app(r.warehouse, 'app.first_open', '2026-03-01T10:00:00Z', 'inst-0001');
    await r.events.append(ev('booking.created', '2026-03-02T10:00:00Z', { actorId: 'u1' }));
    await r.analytics.linkIdentity({ ...customer('u1'), installationId: 'inst-0001' });
    const result = await r.analytics.cohorts({
      startEvent: 'app.first_open',
      returnEvent: 'booking.created',
      from: at('2026-03-01T00:00:00Z'),
      to: at('2026-03-02T00:00:00Z'),
      unit: 'DAY',
      periods: 1,
      source: 'ALL',
    });
    expect(result.cohorts).toEqual([{ cohort: '2026-03-01', size: 1, retained: [1] }]);
  });

  it('keeps unlinked installations apart and splits shared devices by Firebase user', async () => {
    const identityLinks = [
      { installationId: 'inst-0001', ...customer('u1') },
      { installationId: 'inst-0001', ...customer('u2') },
    ];
    const events: AppEvent[] = [
      {
        ts: at('2026-03-01T00:00:00Z'),
        name: 'a.b',
        installationId: 'inst-0001',
        userId: 'u2',
        params: {},
      },
      { ts: at('2026-03-01T00:00:00Z'), name: 'a.b', installationId: 'inst-0001', params: {} },
      {
        ts: at('2026-03-01T00:00:00Z'),
        name: 'a.b',
        installationId: 'inst-0009',
        userId: 'u3',
        params: {},
      },
      { ts: at('2026-03-01T00:00:00Z'), name: 'a.b', installationId: 'inst-0008', params: {} },
    ];
    const links = new MemoryIdentityStore();
    for (const link of identityLinks) await links.link(link);
    expect(await resolveAppSubjects(links, events)).toEqual([
      'CUSTOMER:u2',
      'CUSTOMER:u1',
      'user:u3',
      'inst:inst-0008',
    ]);
    expect(await resolveAppSubjects(links, [])).toEqual([]);
  });

  it('a journey merges every installation of the actor and no stranger', async () => {
    const r = rig();
    app(r.warehouse, 'screen_view', '2026-03-01T10:00:00Z', 'inst-phone');
    app(r.warehouse, 'screen_view', '2026-03-01T11:00:00Z', 'inst-tablet');
    app(r.warehouse, 'screen_view', '2026-03-01T12:00:00Z', 'inst-other');
    await r.analytics.linkIdentity({ ...customer('u1'), installationId: 'inst-phone' });
    await r.analytics.linkIdentity({ ...customer('u1'), installationId: 'inst-tablet' });
    await r.events.append(ev('booking.created', '2026-03-01T13:00:00Z', { actorId: 'u1' }));
    const items = await r.analytics.journey(customer('u1'), range);
    expect(items.map((i) => i.ts.slice(11, 13))).toEqual(['10', '11', '13']);
  });
});

describe('source ALL', () => {
  it('adds server and app counts by key', async () => {
    const r = rig();
    await r.events.append(ev('a.one', '2026-03-01T10:00:00Z'));
    await r.events.append(ev('b.two', '2026-03-01T10:00:00Z'));
    app(r.warehouse, 'a.one', '2026-03-01T10:00:00Z', 'inst-0001');
    app(r.warehouse, 'c.three', '2026-03-01T10:00:00Z', 'inst-0001');
    const q = { ...range, groupBy: 'NAME' as const };
    expect(await r.analytics.countEvents({ ...q, source: 'ALL' })).toEqual([
      { key: 'a.one', count: 2 },
      { key: 'b.two', count: 1 },
      { key: 'c.three', count: 1 },
    ]);
    expect(await r.analytics.countEvents({ ...q, source: 'APP' })).toHaveLength(2);
    expect(await r.analytics.countEvents({ ...q, source: 'SERVER' })).toHaveLength(2);
  });

  it('needs a warehouse and a known source', async () => {
    const analytics = createAnalytics({ environment: 'dev' });
    const q = { ...range, groupBy: 'NAME' as const };
    expect(await codeOfAsync(analytics.countEvents({ ...q, source: 'ALL' }))).toBe(
      ERROR_CODES.ANALYTICS_NOT_CONFIGURED,
    );
    expect(await codeOfAsync(analytics.countEvents({ ...q, source: 'BOTH' as never }))).toBe(
      ERROR_CODES.VALIDATION_FAILED,
    );
    expect(
      await codeOfAsync(analytics.funnel({ steps: ['a.b', 'c.d'], ...range, source: 'ALL' })),
    ).toBe(ERROR_CODES.ANALYTICS_NOT_CONFIGURED);
  });

  it('reports truncation when either source exceeds the scan limit', async () => {
    const r = rig({ maxScannedEvents: 1 });
    app(r.warehouse, 'screen.opened', '2026-03-01T10:00:00Z', 'inst-0001');
    app(r.warehouse, 'screen.opened', '2026-03-01T10:01:00Z', 'inst-0002');
    await r.events.append(ev('user.registered', '2026-03-01T10:05:00Z', { actorId: 'u1' }));
    const result = await r.analytics.funnel({
      steps: ['screen.opened', 'user.registered'],
      ...range,
      source: 'ALL',
    });
    expect(result.truncated).toBe(true);
  });
});
