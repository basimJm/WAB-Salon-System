import { FakeAnalyticsProvider } from '../src/providers/analytics';

const ACTOR = '64b7f0f2a1b2c3d4e5f60718';
const at =
  (iso: string): (() => Date) =>
  () =>
    new Date(iso);

const track = async (iso: string, name: string): Promise<FakeAnalyticsProvider> => {
  const analytics = new FakeAnalyticsProvider(at(iso));
  await analytics.track({ name, actorType: 'CUSTOMER', actorId: ACTOR });
  return analytics;
};

describe('fake analytics provider: track', () => {
  it('stores a valid event with defaults and the clock time', async () => {
    const analytics = await track('2026-10-12T10:00:00.000Z', 'booking.created');
    expect(analytics.events).toHaveLength(1);
    expect(analytics.events[0]).toMatchObject({
      name: 'booking.created',
      params: {},
      at: new Date('2026-10-12T10:00:00.000Z'),
    });
  });

  it.each([
    { name: 'Bad Name', actorType: 'CUSTOMER' as const },
    { name: 'otp.requested', actorType: 'ROBOT' as never },
    { name: 'otp.requested', actorType: 'CUSTOMER' as const, actorId: 'nope' },
  ])('never throws for the invalid event %j and reports false', async (event) => {
    const analytics = new FakeAnalyticsProvider();
    await expect(analytics.track(event)).resolves.toBe(false);
    expect(analytics.events).toHaveLength(0);
  });
});

describe('fake analytics provider: identity links', () => {
  const link = {
    installationId: 'installation-0001',
    actorType: 'CUSTOMER' as const,
    actorId: ACTOR,
  };

  it('records a link once', async () => {
    const analytics = new FakeAnalyticsProvider();
    await analytics.linkIdentity(link);
    await analytics.linkIdentity(link);
    expect(analytics.links).toEqual([link]);
  });

  it.each([{ installationId: 'short' }, { actorId: 'nope' }])('rejects %j', async (override) => {
    await expect(
      new FakeAnalyticsProvider().linkIdentity({ ...link, ...override }),
    ).rejects.toBeInstanceOf(RangeError);
  });
});

describe('fake analytics provider: countEvents', () => {
  const build = async (): Promise<FakeAnalyticsProvider> => {
    let now = new Date('2026-10-12T10:00:00.000Z');
    const analytics = new FakeAnalyticsProvider(() => now);
    const emit = async (iso: string, name: string): Promise<void> => {
      now = new Date(iso);
      await analytics.track({ name, actorType: 'SYSTEM' });
    };
    await emit('2026-10-12T10:00:00.000Z', 'booking.created');
    await emit('2026-10-12T20:59:59.999Z', 'booking.created'); // still 12 Oct in Amman
    await emit('2026-10-12T21:00:00.000Z', 'booking.created'); // 13 Oct in Amman
    await emit('2026-10-13T08:00:00.000Z', 'payment.failed');
    return analytics;
  };
  const range = {
    from: new Date('2026-10-12T00:00:00.000Z'),
    to: new Date('2026-10-14T00:00:00.000Z'),
    timeZone: 'Asia/Amman',
  };

  it('groups by Amman day, switching at 21:00 UTC', async () => {
    const analytics = await build();
    await expect(analytics.countEvents({ ...range, groupBy: 'DAY' })).resolves.toEqual([
      { key: '2026-10-12', count: 2 },
      { key: '2026-10-13', count: 2 },
    ]);
  });

  it('groups by name and filters by names', async () => {
    const analytics = await build();
    await expect(analytics.countEvents({ ...range, groupBy: 'NAME' })).resolves.toEqual([
      { key: 'booking.created', count: 3 },
      { key: 'payment.failed', count: 1 },
    ]);
    await expect(
      analytics.countEvents({ ...range, groupBy: 'NAME', names: ['payment.failed'] }),
    ).resolves.toEqual([{ key: 'payment.failed', count: 1 }]);
  });

  it('treats the range as half-open [from, to)', async () => {
    const analytics = await build();
    const rows = await analytics.countEvents({
      ...range,
      from: new Date('2026-10-12T21:00:00.000Z'),
      to: new Date('2026-10-13T08:00:00.000Z'),
      groupBy: 'NAME',
    });
    expect(rows).toEqual([{ key: 'booking.created', count: 1 }]);
  });

  it('returns no rows when nothing matches', async () => {
    const analytics = await build();
    await expect(
      analytics.countEvents({ ...range, groupBy: 'DAY', names: ['nothing.here'] }),
    ).resolves.toEqual([]);
  });

  it.each([
    { timeZone: 'Not/AZone' },
    { from: new Date('2026-10-14T00:00:00.000Z'), to: new Date('2026-10-12T00:00:00.000Z') },
    { from: new Date('2026-10-12T00:00:00.000Z'), to: new Date('2026-10-12T00:00:00.000Z') },
  ])('rejects the invalid query %j', async (override) => {
    const analytics = await build();
    await expect(
      analytics.countEvents({ ...range, groupBy: 'DAY', ...override }),
    ).rejects.toBeInstanceOf(RangeError);
  });
});
