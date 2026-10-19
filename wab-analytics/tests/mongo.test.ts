import { createAnalytics } from '../src/analytics';
import { MongoEventStore } from '../src/adapters/mongo/eventStore';
import { MongoIdentityStore } from '../src/adapters/mongo/identityStore';
import { isDuplicateKey, mapMongoError, MONGO_CODES } from '../src/adapters/mongo/errors';
import { identityCodec, type IdCodec } from '../src/adapters/mongo/types';
import { ERROR_CODES } from '../src/constants/codes';
import { unavailableError } from '../src/errors';
import { at, codeOfAsync, ev } from './helpers';
import { FakeCollection } from './fakeMongo';

const range = { from: at('2026-03-01T00:00:00Z'), to: at('2026-03-04T00:00:00Z') };
const named = (name: string, code?: number): Error & { code?: number } =>
  Object.assign(new Error('vendor secret text'), { name, ...(code === undefined ? {} : { code }) });

const objectIdLike: IdCodec = {
  encode: (id) => ({ oid: id }),
  decode: (value) => (value as { oid: string }).oid,
};

const store = (collection = new FakeCollection(), ids?: IdCodec): MongoEventStore =>
  new MongoEventStore({
    collection,
    maxTimeMs: 5000,
    ensureIndexes: true,
    ...(ids === undefined ? {} : { ids }),
  });

describe('mapMongoError', () => {
  it.each([
    ['MongoNetworkError', undefined, ERROR_CODES.ANALYTICS_UNAVAILABLE],
    ['MongoServerSelectionError', undefined, ERROR_CODES.ANALYTICS_UNAVAILABLE],
    ['MongoOperationTimeoutError', undefined, ERROR_CODES.TIMEOUT],
    ['MongoServerError', MONGO_CODES.maxTimeExpired, ERROR_CODES.TIMEOUT],
    ['MongoServerError', MONGO_CODES.unauthorized, ERROR_CODES.AUTH_FAILED],
    ['MongoServerError', MONGO_CODES.authenticationFailed, ERROR_CODES.AUTH_FAILED],
    ['MongoServerError', 2, ERROR_CODES.VENDOR_ERROR],
    ['TypeError', undefined, ERROR_CODES.UNKNOWN],
  ])('%s/%s -> %s', (name, code, expected) => {
    const mapped = mapMongoError(named(name, code));
    expect(mapped.code).toBe(expected);
    expect(mapped.message).not.toContain('secret');
  });

  it('passes analytics errors through, wraps non-objects, detects duplicates', () => {
    const own = unavailableError('x');
    expect(mapMongoError(own)).toBe(own);
    expect(mapMongoError('weird').code).toBe(ERROR_CODES.UNKNOWN);
    expect(isDuplicateKey(named('MongoServerError', MONGO_CODES.duplicateKey))).toBe(true);
    expect(isDuplicateKey(null)).toBe(false);
  });
});

describe('MongoEventStore', () => {
  it('writes the layout WAB-Server uses, encoding ids and omitting absent fields', async () => {
    const collection = new FakeCollection();
    const events = store(collection, objectIdLike);
    await events.append(
      ev('payment.failed', '2026-03-01T10:00:00Z', {
        actorId: 'a1',
        salonId: 's1',
        bookingId: 'b1',
        params: { code: '05' },
        platform: 'ANDROID',
        appVersion: '1.0.0',
      }),
    );
    await events.append(ev('a.b', '2026-03-01T11:00:00Z'));
    expect(collection.docs[0]).toEqual({
      ts: at('2026-03-01T10:00:00Z'),
      name: 'payment.failed',
      actorType: 'CUSTOMER',
      actorId: { oid: 'a1' },
      salonId: { oid: 's1' },
      bookingId: { oid: 'b1' },
      params: { code: '05' },
      platform: 'ANDROID',
      appVersion: '1.0.0',
    });
    expect(Object.keys(collection.docs[1] ?? {})).toEqual(['ts', 'name', 'actorType', 'params']);
  });

  it('creates the indexes the server also declares, or none when disabled', async () => {
    const collection = new FakeCollection();
    await store(collection).init();
    expect(collection.indexes.map((i) => Object.keys(i.spec).join('+'))).toEqual([
      'ts',
      'name+ts',
      'actorId+ts',
      'bookingId+ts',
    ]);
    const quiet = new FakeCollection();
    await new MongoEventStore({ collection: quiet, maxTimeMs: 1, ensureIndexes: false }).init();
    expect(quiet.indexes).toEqual([]);
  });

  it('counts by name and by Amman day with the time limit', async () => {
    const collection = new FakeCollection();
    const events = store(collection);
    await events.append(ev('a.one', '2026-03-01T10:00:00Z'));
    await events.append(ev('a.one', '2026-03-01T21:30:00Z'));
    await events.append(ev('b.two', '2026-03-02T09:00:00Z'));
    expect(await events.count({ ...range, groupBy: 'NAME', timeZone: 'UTC' })).toEqual([
      { key: 'a.one', count: 2 },
      { key: 'b.two', count: 1 },
    ]);
    expect(
      await events.count({ ...range, names: ['a.one'], groupBy: 'DAY', timeZone: 'Asia/Amman' }),
    ).toEqual([
      { key: '2026-03-01', count: 1 },
      { key: '2026-03-02', count: 1 },
    ]);
    const call = collection.calls.find((c) => c.method === 'aggregate');
    expect(call?.args[1]).toEqual({ maxTimeMS: 5000 });
  });

  it('finds events of actors in order and decodes ids', async () => {
    const events = store(new FakeCollection(), objectIdLike);
    await events.append(
      ev('a.one', '2026-03-01T10:00:00Z', { actorId: 'a1', salonId: 's1', platform: 'IOS' }),
    );
    await events.append(ev('b.two', '2026-03-02T10:00:00Z', { actorId: 'a2', appVersion: '2' }));
    await events.append(ev('c.three', '2026-03-03T10:00:00Z', { actorId: 'a1' }));
    const base = { ...range, limit: 10, order: 'asc' as const };
    const mine = await events.find({ ...base, actors: [{ actorType: 'CUSTOMER', actorId: 'a1' }] });
    expect(mine.map((e) => e.name)).toEqual(['a.one', 'c.three']);
    expect(mine[0]).toMatchObject({ actorId: 'a1', salonId: 's1', platform: 'IOS' });
    expect((await events.find({ ...base, order: 'desc', limit: 1 })).map((e) => e.name)).toEqual([
      'c.three',
    ]);
    expect((await events.find({ ...base, names: ['b.two'] }))[0]?.appVersion).toBe('2');
    expect(await events.find({ ...base, actors: [] })).toEqual([]);
  });

  it('bounds the actor filter', async () => {
    const actors = Array.from({ length: 201 }, (_, i) => ({
      actorType: 'CUSTOMER',
      actorId: `u${String(i)}`,
    }));
    expect(await codeOfAsync(store().find({ ...range, limit: 1, order: 'asc', actors }))).toBe(
      ERROR_CODES.VALIDATION_FAILED,
    );
  });

  it('counts distinct actors and returns 0 when nothing matches', async () => {
    const events = store();
    expect(await events.countActors(range)).toBe(0);
    await events.append(ev('a.one', '2026-03-01T10:00:00Z', { actorId: 'a1' }));
    await events.append(ev('a.one', '2026-03-01T11:00:00Z', { actorId: 'a1' }));
    await events.append(ev('a.one', '2026-03-01T12:00:00Z', { actorId: 'a2' }));
    await events.append(ev('a.one', '2026-03-01T13:00:00Z'));
    expect(await events.countActors({ ...range, names: ['a.one'] })).toBe(2);
  });

  it('rejects malformed stored documents', async () => {
    const collection = new FakeCollection();
    collection.docs.push({ ts: at('2026-03-01T00:00:00Z'), name: 5, actorType: 'CUSTOMER' });
    expect(await codeOfAsync(store(collection).find({ ...range, limit: 1, order: 'asc' }))).toBe(
      ERROR_CODES.MALFORMED_RESPONSE,
    );
    collection.docs[0] = {
      ts: at('2026-03-01T00:00:00Z'),
      name: 'a.b',
      actorType: 'X',
      params: 5,
      salonId: null,
    };
    const [event] = await store(collection).find({ ...range, limit: 1, order: 'asc' });
    expect(event?.params).toEqual({});
    expect(event?.salonId).toBeUndefined();
  });

  it('maps every driver failure', async () => {
    const collection = new FakeCollection();
    collection.failure = named('MongoNetworkError');
    const events = store(collection);
    const code = ERROR_CODES.ANALYTICS_UNAVAILABLE;
    expect(await codeOfAsync(events.init())).toBe(code);
    expect(await codeOfAsync(events.append(ev('a.b', '2026-03-01T00:00:00Z')))).toBe(code);
    expect(await codeOfAsync(events.count({ ...range, groupBy: 'NAME', timeZone: 'UTC' }))).toBe(
      code,
    );
    expect(await codeOfAsync(events.find({ ...range, limit: 1, order: 'asc' }))).toBe(code);
    expect(await codeOfAsync(events.countActors(range))).toBe(code);
  });
});

describe('MongoIdentityStore', () => {
  const identity = (collection = new FakeCollection()): MongoIdentityStore =>
    new MongoIdentityStore({
      collection,
      maxTimeMs: 5000,
      ensureIndexes: true,
      now: () => at('2026-03-01T00:00:00Z'),
    });
  const link = { installationId: 'inst-0001', actorType: 'CUSTOMER', actorId: 'u1' };

  it('upserts links once and reads both ways', async () => {
    const collection = new FakeCollection();
    const links = identity(collection);
    await links.link(link);
    await links.link(link);
    await links.link({ ...link, installationId: 'inst-0002' });
    expect(collection.docs).toHaveLength(2);
    expect(collection.docs[0]).toMatchObject({ linkedAt: at('2026-03-01T00:00:00Z') });
    expect(await links.linksOfActor(link)).toHaveLength(2);
    expect(await links.linksOfInstallations(['inst-0002'])).toEqual([
      { ...link, installationId: 'inst-0002' },
    ]);
    expect(await links.linksOfInstallations([])).toEqual([]);
  });

  it('creates a unique index and honours ensureIndexes=false', async () => {
    const collection = new FakeCollection();
    await identity(collection).init();
    expect(collection.indexes[0]?.options).toEqual({ unique: true });
    expect(collection.indexes).toHaveLength(2);
    const quiet = new FakeCollection();
    await new MongoIdentityStore({ collection: quiet, maxTimeMs: 1, ensureIndexes: false }).init();
    expect(quiet.indexes).toEqual([]);
  });

  it('treats a duplicate-key race as success and maps other failures', async () => {
    const collection = new FakeCollection();
    collection.failure = named('MongoServerError', MONGO_CODES.duplicateKey);
    await expect(identity(collection).link(link)).resolves.toBeUndefined();
    collection.failure = named('MongoNetworkError');
    const links = identity(collection);
    expect(await codeOfAsync(links.link(link))).toBe(ERROR_CODES.ANALYTICS_UNAVAILABLE);
    expect(await codeOfAsync(links.init())).toBe(ERROR_CODES.ANALYTICS_UNAVAILABLE);
    expect(await codeOfAsync(links.linksOfActor(link))).toBe(ERROR_CODES.ANALYTICS_UNAVAILABLE);
  });

  it('rejects malformed stored links', async () => {
    const collection = new FakeCollection();
    collection.docs.push({ installationId: 5, actorType: 'CUSTOMER', actorId: 'u1' });
    expect(await codeOfAsync(identity(collection).linksOfActor(link))).toBe(
      ERROR_CODES.MALFORMED_RESPONSE,
    );
  });
});

describe('createAnalytics with mongo', () => {
  it('builds the mongo adapters from injected collections (default ids and custom codec)', async () => {
    const events = new FakeCollection();
    const links = new FakeCollection();
    const analytics = createAnalytics({
      environment: 'prod',
      mongo: { events, identityLinks: links, ids: objectIdLike },
    });
    await analytics.init();
    expect(
      await analytics.track({ name: 'otp.failed', actorType: 'CUSTOMER', actorId: 'u1' }),
    ).toBe(true);
    await analytics.linkIdentity({
      installationId: 'inst-0001',
      actorType: 'CUSTOMER',
      actorId: 'u1',
    });
    expect(events.docs[0]?.actorId).toEqual({ oid: 'u1' });
    expect(links.docs).toHaveLength(1);
    const plain = createAnalytics({
      environment: 'dev',
      provider: 'mongo',
      mongo: { events, identityLinks: links },
    });
    expect(await plain.track({ name: 'a.b', actorType: 'SYSTEM' })).toBe(true);
    expect(identityCodec.decode(5)).toBe('5');
  });
});
