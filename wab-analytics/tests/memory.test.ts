import { MemoryEventStore } from '../src/adapters/memory/eventStore';
import { MemoryIdentityStore } from '../src/adapters/memory/identityStore';
import { at, ev } from './helpers';

const range = { from: at('2026-03-01T00:00:00Z'), to: at('2026-03-03T00:00:00Z') };

describe('MemoryEventStore', () => {
  const build = async (): Promise<MemoryEventStore> => {
    const store = new MemoryEventStore();
    await store.append(ev('a.one', '2026-03-01T10:00:00Z', { actorId: 'u1' }));
    await store.append(ev('a.one', '2026-03-01T21:30:00Z', { actorId: 'u2' }));
    await store.append(ev('b.two', '2026-03-02T09:00:00Z', { actorId: 'u1' }));
    await store.append(ev('b.two', '2026-03-05T09:00:00Z', { actorId: 'u1' }));
    await store.append(ev('c.three', '2026-03-02T09:00:00Z'));
    return store;
  };

  it('counts by name inside the half-open range, sorted by key', async () => {
    const store = await build();
    expect(await store.count({ ...range, groupBy: 'NAME', timeZone: 'UTC' })).toEqual([
      { key: 'a.one', count: 2 },
      { key: 'b.two', count: 1 },
      { key: 'c.three', count: 1 },
    ]);
  });

  it('counts by local day (Amman rolls over at 21:00Z) and filters names', async () => {
    const store = await build();
    expect(
      await store.count({ ...range, names: ['a.one'], groupBy: 'DAY', timeZone: 'Asia/Amman' }),
    ).toEqual([
      { key: '2026-03-01', count: 1 },
      { key: '2026-03-02', count: 1 },
    ]);
  });

  it('finds ordered events, by actor, with limit and order', async () => {
    const store = await build();
    const base = { ...range, limit: 10, order: 'asc' as const };
    expect((await store.find(base)).map((e) => e.name)).toEqual([
      'a.one',
      'a.one',
      'b.two',
      'c.three',
    ]);
    expect((await store.find({ ...base, order: 'desc', limit: 2 })).map((e) => e.name)).toEqual([
      'c.three',
      'b.two',
    ]);
    const mine = await store.find({ ...base, actors: [{ actorType: 'CUSTOMER', actorId: 'u1' }] });
    expect(mine.map((e) => e.name)).toEqual(['a.one', 'b.two']);
    expect(await store.find({ ...base, actors: [{ actorType: 'MEMBER', actorId: 'u1' }] })).toEqual(
      [],
    );
  });

  it('counts distinct actors and ignores events without one', async () => {
    const store = await build();
    expect(await store.countActors(range)).toBe(2);
    expect(await store.countActors({ ...range, names: ['c.three'] })).toBe(0);
  });
});

describe('MemoryIdentityStore', () => {
  it('links idempotently and looks up both ways', async () => {
    const store = new MemoryIdentityStore();
    const link = { installationId: 'inst-0001', actorType: 'CUSTOMER', actorId: 'u1' };
    await store.link(link);
    await store.link(link);
    await store.link({ ...link, installationId: 'inst-0002' });
    expect(await store.linksOfActor(link)).toHaveLength(2);
    expect(await store.linksOfActor({ actorType: 'MEMBER', actorId: 'u1' })).toEqual([]);
    expect(await store.linksOfInstallations(['inst-0002', 'nope'])).toEqual([
      { ...link, installationId: 'inst-0002' },
    ]);
  });
});
