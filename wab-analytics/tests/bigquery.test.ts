import { createAnalytics } from '../src/analytics';
import { mapBigQueryError } from '../src/adapters/bigquery/errors';
import { createBigQueryWarehouse } from '../src/adapters/bigquery';
import { loadBigQuery, parseCredentials } from '../src/adapters/bigquery/loader';
import { toAppEvents, toActorCount, toCountRows, toCrashes } from '../src/adapters/bigquery/rows';
import {
  createRunner,
  type BigQueryLike,
  type BigQueryRow,
  type BigQueryRunner,
  type SqlStatement,
} from '../src/adapters/bigquery/runner';
import {
  actorsStatement,
  countStatement,
  crashesStatement,
  eventsStatement,
  type TableNames,
} from '../src/adapters/bigquery/sql';
import { resolveOptions, type AnalyticsOptions } from '../src/config/options';
import { ERROR_CODES } from '../src/constants/codes';
import { unavailableError } from '../src/errors';
import { at, codeOfAsync } from './helpers';

const tables: TableNames = {
  projectId: 'wab-prod',
  dataset: 'analytics_1',
  eventsPrefix: 'events_',
  intradayPrefix: 'events_intraday_',
  crashTable: 'com_wab_ANDROID',
};
const range = { from: at('2026-03-01T00:00:00Z'), to: at('2026-03-03T00:00:00Z') };

interface Call {
  options: Record<string, unknown>;
}

/** Fake client: the handler answers each real (non dry-run) job with rows. */
const fakeClient = (
  rows: (options: Record<string, unknown>) => BigQueryRow[] | Error,
  bytes: string | number = '100',
): { client: BigQueryLike; calls: Call[] } => {
  const calls: Call[] = [];
  const client: BigQueryLike = {
    createQueryJob: (options) => {
      calls.push({ options });
      const job = {
        metadata: { statistics: { totalBytesProcessed: bytes } },
        getQueryResults: () => {
          const answer = rows(options);
          return answer instanceof Error ? Promise.reject(answer) : Promise.resolve([answer]);
        },
      };
      return Promise.resolve([job]);
    },
  };
  return { client, calls };
};

const vendor = (code: number | string | undefined, reason?: string): Error =>
  Object.assign(new Error('vendor text with secret'), {
    ...(code === undefined ? {} : { code }),
    ...(reason === undefined ? {} : { errors: [{ reason, message: 'm' }] }),
  });

describe('mapBigQueryError', () => {
  it.each([
    [vendor(403, 'rateLimitExceeded'), ERROR_CODES.RATE_LIMITED, true],
    [vendor(403, 'quotaExceeded'), ERROR_CODES.RATE_LIMITED, true],
    [vendor(500, 'backendError'), ERROR_CODES.ANALYTICS_UNAVAILABLE, true],
    [vendor(400, 'bytesBilledLimitExceeded'), ERROR_CODES.ANALYTICS_QUERY_TOO_EXPENSIVE, false],
    [vendor(404, 'notFound'), ERROR_CODES.ANALYTICS_NOT_CONFIGURED, false],
    [vendor(403, 'accessDenied'), ERROR_CODES.AUTH_FAILED, false],
    [vendor(401, 'authError'), ERROR_CODES.AUTH_FAILED, false],
    [vendor(400, 'invalidQuery'), ERROR_CODES.VENDOR_ERROR, false],
    [vendor(408, 'timeout'), ERROR_CODES.TIMEOUT, true],
    [vendor('ECONNRESET'), ERROR_CODES.NETWORK_ERROR, true],
    [vendor('ENOTFOUND'), ERROR_CODES.NETWORK_ERROR, true],
    [vendor(401), ERROR_CODES.AUTH_FAILED, false],
    [vendor(403), ERROR_CODES.AUTH_FAILED, false],
    [vendor(404), ERROR_CODES.ANALYTICS_NOT_CONFIGURED, false],
    [vendor(429), ERROR_CODES.RATE_LIMITED, true],
    [vendor(408), ERROR_CODES.TIMEOUT, true],
    [vendor(503), ERROR_CODES.ANALYTICS_UNAVAILABLE, true],
    [vendor(400), ERROR_CODES.VENDOR_ERROR, false],
    [vendor(200), ERROR_CODES.UNKNOWN, false],
    [vendor(undefined, 'madeUpReason'), ERROR_CODES.UNKNOWN, false],
    [vendor('WEIRD'), ERROR_CODES.UNKNOWN, false],
    ['plain text', ERROR_CODES.UNKNOWN, false],
  ])('%s -> %s', (error, code, retryable) => {
    const mapped = mapBigQueryError(error);
    expect(mapped.code).toBe(code);
    expect(mapped.retryable).toBe(retryable);
    expect(mapped.message).not.toContain('secret');
  });

  it('keeps the reason, passes typed errors through and ignores unknown reason entries', () => {
    expect(mapBigQueryError(vendor(403, 'accessDenied')).details).toEqual({
      reason: 'accessDenied',
    });
    const own = unavailableError('x');
    expect(mapBigQueryError(own)).toBe(own);
    const mixed = Object.assign(new Error('x'), {
      code: 429,
      errors: [{ reason: 'zzz' }, 'junk', { reason: 'backendError' }],
    });
    expect(mapBigQueryError(mixed).code).toBe(ERROR_CODES.ANALYTICS_UNAVAILABLE);
    expect(mapBigQueryError(Object.assign(new Error('x'), { errors: 'nope' })).code).toBe(
      ERROR_CODES.UNKNOWN,
    );
  });
});

describe('statements', () => {
  const count = countStatement(tables, {
    ...range,
    groupBy: 'DAY',
    timeZone: 'Asia/Amman',
    names: ['a.one'],
  });

  it('prunes partitions with a padded suffix range and reads both exports', () => {
    expect(count.params).toMatchObject({
      startSuffix: '20260228',
      endSuffix: '20260304',
      fromMicros: 1_772_323_200_000_000,
      toMicros: 1_772_496_000_000_000,
    });
    expect(count.query).toContain('`wab-prod.analytics_1.events_*`');
    expect(count.query).toContain('`wab-prod.analytics_1.events_intraday_*`');
    expect(count.query.match(/_TABLE_SUFFIX BETWEEN @startSuffix AND @endSuffix/g)).toHaveLength(2);
  });

  it('never puts caller values in the SQL text', () => {
    const hostile = "x'; DROP TABLE t; --";
    const statement = countStatement(tables, {
      ...range,
      groupBy: 'NAME',
      timeZone: 'UTC',
      names: [hostile],
    });
    expect(statement.query).not.toContain('DROP');
    expect(statement.params.names).toEqual([hostile]);
    const events = eventsStatement(tables, {
      ...range,
      names: [hostile],
      installationIds: [hostile],
      userIds: [hostile],
      limit: 5,
    });
    expect(events.query).not.toContain('DROP');
    expect(events.params).toMatchObject({
      names: [hostile],
      installationIds: [hostile],
      userIds: [hostile],
      limit: 5,
    });
  });

  it('declares a type for every parameter', () => {
    for (const statement of [
      count,
      actorsStatement(tables, { ...range, names: ['a.one'] }),
      eventsStatement(tables, {
        ...range,
        names: ['a.one'],
        installationIds: ['i'],
        userIds: ['u'],
        limit: 1,
      }),
      crashesStatement(tables, 'com_wab_ANDROID', {
        ...range,
        installationIds: ['i'],
        userIds: ['u'],
        limit: 1,
      }),
    ] as SqlStatement[]) {
      expect(Object.keys(statement.types).sort()).toEqual(Object.keys(statement.params).sort());
    }
  });

  it('groups by name or by local day and filters names only when given', () => {
    const byName = countStatement(tables, { ...range, groupBy: 'NAME', timeZone: 'UTC' });
    expect(byName.query).toContain('event_name AS key');
    expect(byName.query).not.toContain('UNNEST(@names)');
    expect(count.query).toContain('@timeZone');
    expect(count.query).toContain('UNNEST(@names)');
    expect(
      countStatement(tables, { ...range, groupBy: 'NAME', timeZone: 'UTC', names: [] }).query,
    ).not.toContain('@names');
  });

  it('filters ownership of events and crashes', () => {
    const none = eventsStatement(tables, { ...range, limit: 1 });
    expect(none.query).not.toContain('@installationIds');
    const both = eventsStatement(tables, {
      ...range,
      installationIds: ['i'],
      userIds: ['u'],
      limit: 1,
    });
    expect(both.query).toContain(
      'user_pseudo_id IN UNNEST(@installationIds) OR user_id IN UNNEST(@userIds)',
    );
    const onlyUsers = crashesStatement(tables, 'com_wab_ANDROID', {
      ...range,
      userIds: ['u'],
      limit: 1,
    });
    expect(onlyUsers.query).toContain('user.id IN UNNEST(@userIds)');
    expect(onlyUsers.query).not.toContain('installation_uuid IN');
    expect(onlyUsers.query).toContain('`wab-prod.analytics_1.com_wab_ANDROID`');
    expect(
      crashesStatement(tables, 'c', { ...range, limit: 1, installationIds: [], userIds: [] }).query,
    ).not.toContain('UNNEST');
  });
});

describe('runner', () => {
  const statement: SqlStatement = { query: 'SELECT 1', params: { a: 1 }, types: { a: 'INT64' } };
  const runnerFor = (
    client: BigQueryLike,
    extra: Partial<Parameters<typeof createRunner>[0]> = {},
  ): BigQueryRunner =>
    createRunner({
      client: () => Promise.resolve(client),
      location: 'EU',
      maxBytesBilled: 1000,
      dryRunFirst: true,
      timeoutMs: 1000,
      ...extra,
    });

  it('dry-runs, then runs with the bytes-billed cap, location and labels', async () => {
    const { client, calls } = fakeClient(() => [{ x: 1 }]);
    expect(await runnerFor(client).run(statement)).toEqual([{ x: 1 }]);
    expect(calls).toHaveLength(2);
    expect(calls[0]?.options).toMatchObject({
      dryRun: true,
      useLegacySql: false,
      location: 'EU',
      params: { a: 1 },
      types: { a: 'INT64' },
    });
    expect(calls[1]?.options).toMatchObject({
      maximumBytesBilled: '1000',
      labels: { app: 'wab-analytics' },
    });
    expect(calls[1]?.options.dryRun).toBeUndefined();
  });

  it('refuses a too expensive estimate without running the query', async () => {
    const { client, calls } = fakeClient(() => [], '5000');
    expect(await codeOfAsync(runnerFor(client).run(statement))).toBe(
      ERROR_CODES.ANALYTICS_QUERY_TOO_EXPENSIVE,
    );
    expect(calls).toHaveLength(1);
  });

  it('skips the dry run when disabled and omits an unset location', async () => {
    const { client, calls } = fakeClient(() => [], '5000');
    await runnerFor(client, { dryRunFirst: false, location: undefined }).run(statement);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.options.location).toBeUndefined();
  });

  it('rejects malformed answers', async () => {
    const noJob: BigQueryLike = { createQueryJob: () => Promise.resolve([]) };
    expect(await codeOfAsync(runnerFor(noJob).run(statement))).toBe(ERROR_CODES.MALFORMED_RESPONSE);
    const badBytes = fakeClient(() => [], 'lots');
    expect(await codeOfAsync(runnerFor(badBytes.client).run(statement))).toBe(
      ERROR_CODES.MALFORMED_RESPONSE,
    );
    const noRows: BigQueryLike = {
      createQueryJob: () =>
        Promise.resolve([{ getQueryResults: () => Promise.resolve([undefined]) }]),
    };
    expect(await codeOfAsync(runnerFor(noRows, { dryRunFirst: false }).run(statement))).toBe(
      ERROR_CODES.MALFORMED_RESPONSE,
    );
  });

  it('treats a missing estimate as zero and maps vendor failures', async () => {
    const noStats: BigQueryLike = {
      createQueryJob: () =>
        Promise.resolve([{ getQueryResults: () => Promise.resolve([[{ ok: 1 }]]) }]),
    };
    expect(await runnerFor(noStats).run(statement)).toEqual([{ ok: 1 }]);
    const failing = fakeClient(() => vendor(500, 'backendError'));
    expect(await codeOfAsync(runnerFor(failing.client).run(statement))).toBe(
      ERROR_CODES.ANALYTICS_UNAVAILABLE,
    );
    const refusing: BigQueryLike = {
      createQueryJob: () => Promise.reject(vendor(403, 'accessDenied')),
    };
    expect(await codeOfAsync(runnerFor(refusing).run(statement))).toBe(ERROR_CODES.AUTH_FAILED);
  });

  it('times out slow queries', async () => {
    const slow: BigQueryLike = { createQueryJob: () => new Promise(() => undefined) };
    expect(await codeOfAsync(runnerFor(slow, { timeoutMs: 20 }).run(statement))).toBe(
      ERROR_CODES.TIMEOUT,
    );
  });
});

describe('rows', () => {
  it('parses counts and actor counts', () => {
    expect(toCountRows([{ key: 'a', event_count: '3' }])).toEqual([{ key: 'a', count: 3 }]);
    expect(() => toCountRows([{ key: '', event_count: 1 }])).toThrow();
    expect(() => toCountRows([{ key: 'a', event_count: 'x' }])).toThrow();
    expect(toActorCount([{ actors: 4 }])).toBe(4);
    expect(toActorCount([])).toBe(0);
    expect(() => toActorCount([{ actors: 'x' }])).toThrow();
  });

  it('flattens Firebase events and redacts secrets', () => {
    const [event] = toAppEvents([
      {
        event_timestamp: 1_772_323_200_123_456,
        event_name: 'screen_view',
        user_pseudo_id: 'inst-0001',
        user_id: 'u1',
        platform: 'ANDROID',
        app_version: '1.2.3',
        screen: 'Home',
        event_params: [
          { key: 'firebase_screen', value: { string_value: 'Home' } },
          { key: 'engagement_time_msec', value: { int_value: 120 } },
          { key: 'ratio', value: { double_value: 0.5 } },
          { key: 'fl', value: { float_value: 1.5 } },
          { key: 'auth_token', value: { string_value: 'secret' } },
          { key: 'empty', value: null },
          { key: 'odd', value: { string_value: null } },
          { key: '', value: { string_value: 'x' } },
        ],
      },
    ]);
    expect(event).toEqual({
      ts: new Date(1_772_323_200_123),
      name: 'screen_view',
      installationId: 'inst-0001',
      userId: 'u1',
      platform: 'ANDROID',
      appVersion: '1.2.3',
      screen: 'Home',
      params: {
        firebase_screen: 'Home',
        engagement_time_msec: 120,
        ratio: 0.5,
        fl: 1.5,
        auth_token: '[redacted]',
        empty: null,
        odd: null,
      },
    });
    const [bare] = toAppEvents([
      {
        event_timestamp: '1772323200000000',
        event_name: 'a',
        user_pseudo_id: 'i',
        event_params: 'nope',
      },
    ]);
    expect(bare).toEqual({
      ts: new Date(1_772_323_200_000),
      name: 'a',
      installationId: 'i',
      params: {},
    });
  });

  it('rejects malformed app events and crashes', () => {
    expect(() =>
      toAppEvents([{ event_timestamp: 1, event_name: '', user_pseudo_id: 'i' }]),
    ).toThrow();
    expect(() => toAppEvents([{ event_timestamp: 1, event_name: 'a' }])).toThrow();
    expect(() =>
      toAppEvents([{ event_timestamp: 'x', event_name: 'a', user_pseudo_id: 'i' }]),
    ).toThrow();
    expect(() => toCrashes([{ event_timestamp: '2026-03-01T00:00:00Z' }])).toThrow();
    expect(() => toCrashes([{ event_timestamp: 'garbage', issue_id: 'i1' }])).toThrow();
  });

  it('parses crashes from every timestamp shape', () => {
    const when = new Date('2026-03-01T12:00:00Z');
    const rows = [
      {
        event_timestamp: { value: '2026-03-01T12:00:00Z' },
        issue_id: 'i1',
        issue_title: 'NPE',
        installation_uuid: 'u-1',
        user_id: 'u1',
        app_version: '1.0',
        platform: 'IOS',
      },
      { event_timestamp: when, issue_id: 'i2' },
      { event_timestamp: '2026-03-01T12:00:00Z', issue_id: 'i3' },
    ];
    const crashes = toCrashes(rows);
    expect(crashes[0]).toEqual({
      ts: when,
      issueId: 'i1',
      title: 'NPE',
      installationId: 'u-1',
      userId: 'u1',
      appVersion: '1.0',
      platform: 'IOS',
    });
    expect(crashes[1]).toEqual({ ts: when, issueId: 'i2' });
    expect(crashes[2]?.ts).toEqual(when);
  });
});

describe('loader', () => {
  it('parses credentials without echoing them', () => {
    expect(parseCredentials(undefined)).toBeUndefined();
    expect(parseCredentials({ a: 1 })).toEqual({ a: 1 });
    expect(parseCredentials('{"a":1}')).toEqual({ a: 1 });
    for (const bad of ['{nope', '"text"', 'null']) {
      try {
        parseCredentials(bad);
        throw new Error('should fail');
      } catch (error) {
        expect(String(error)).not.toContain('nope');
        expect((error as { code: string }).code).toBe(ERROR_CODES.CONFIG_INVALID);
      }
    }
  });

  it('builds the client with project, location and credentials', async () => {
    const seen: Record<string, unknown>[] = [];
    class Fake {
      constructor(options: Record<string, unknown>) {
        seen.push(options);
      }
      createQueryJob = (): Promise<unknown[]> => Promise.resolve([]);
    }
    await loadBigQuery({ projectId: 'p-1', location: 'EU', credentials: '{"k":1}' }, () =>
      Promise.resolve({ BigQuery: Fake as never }),
    );
    await loadBigQuery({ projectId: 'p-1', location: undefined, credentials: undefined }, () =>
      Promise.resolve({ BigQuery: Fake as never }),
    );
    expect(seen).toEqual([
      { projectId: 'p-1', location: 'EU', credentials: { k: 1 } },
      { projectId: 'p-1' },
    ]);
  });

  it('reports a missing or broken package as typed errors', async () => {
    const settings = { projectId: 'p-1', location: undefined, credentials: undefined };
    expect(
      await codeOfAsync(
        loadBigQuery(settings, () => Promise.reject(new Error('Cannot find module'))),
      ),
    ).toBe(ERROR_CODES.ANALYTICS_NOT_CONFIGURED);
    expect(await codeOfAsync(loadBigQuery(settings, () => Promise.resolve({})))).toBe(
      ERROR_CODES.MALFORMED_RESPONSE,
    );
  });

  it('loads the real package module (constructor only, no network)', async () => {
    const client = await loadBigQuery({
      projectId: 'p-1',
      location: undefined,
      credentials: { client_email: 'a@b.c', private_key: 'x' },
    });
    expect(typeof client.createQueryJob).toBe('function');
  });
});

const bigqueryOptions = (
  client: BigQueryLike | undefined,
  extra: object = {},
): AnalyticsOptions => ({
  environment: 'dev',
  warehouse: {
    provider: 'bigquery',
    bigquery: {
      projectId: 'wab-prod',
      dataset: 'analytics_1',
      crashTable: 'com_wab_ANDROID',
      ...(client ? { client } : {}),
      ...extra,
    },
  },
});

describe('BigQuery warehouse through the factory', () => {
  it('counts, finds, and reads crashes and actors', async () => {
    const { client, calls } = fakeClient((options) => {
      const query = String(options.query);
      if (query.includes('event_count')) return [{ key: '2026-03-01', event_count: 2 }];
      if (query.includes('AS actors')) return [{ actors: 7 }];
      if (query.includes('issue_id'))
        return [{ event_timestamp: '2026-03-01T12:00:00Z', issue_id: 'i1' }];
      return [
        {
          event_timestamp: 1_772_362_800_000_000,
          event_name: 'tap',
          user_pseudo_id: 'inst-0001',
          event_params: [],
        },
      ];
    });
    const analytics = createAnalytics(bigqueryOptions(client));
    expect(await analytics.countEvents({ ...range, groupBy: 'DAY', source: 'APP' })).toEqual([
      { key: '2026-03-01', count: 2 },
    ]);
    const overview = await analytics.overview(range);
    expect(overview.activeInstallations).toBe(7);
    await analytics.linkIdentity({
      installationId: 'inst-0001',
      actorType: 'CUSTOMER',
      actorId: 'u1',
    });
    const journey = await analytics.journey({ actorType: 'CUSTOMER', actorId: 'u1' }, range);
    expect(journey.map((i) => i.source)).toEqual(['APP', 'CRASH']);
    expect(calls.some((c) => c.options.dryRun === true)).toBe(true);
  });

  it('skips queries with no owner and crashes without a table', async () => {
    const { client, calls } = fakeClient(() => []);
    const warehouse = createBigQueryWarehouse(
      resolveOptions(bigqueryOptions(client, { crashTable: undefined })),
    );
    expect(
      await warehouse.findAppEvents({ ...range, installationIds: [], userIds: [], limit: 1 }),
    ).toEqual([]);
    expect(await warehouse.findCrashes({ ...range, installationIds: ['i'], limit: 1 })).toEqual([]);
    const withTable = createBigQueryWarehouse(resolveOptions(bigqueryOptions(client)));
    expect(
      await withTable.findCrashes({ ...range, installationIds: [], userIds: [], limit: 1 }),
    ).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('builds the lazy client once, and retries loading after a failure', async () => {
    const options = resolveOptions(bigqueryOptions(undefined));
    let loads = 0;
    const { client } = fakeClient(() => [{ key: 'a', event_count: 1 }]);
    const warehouse = createBigQueryWarehouse(options, () => {
      loads += 1;
      return loads === 1
        ? Promise.reject(unavailableError('first load fails'))
        : Promise.resolve(client);
    });
    const query = { ...range, groupBy: 'NAME' as const, timeZone: 'UTC' };
    expect(await codeOfAsync(warehouse.countAppEvents(query))).toBe(
      ERROR_CODES.ANALYTICS_UNAVAILABLE,
    );
    await warehouse.countAppEvents(query);
    await warehouse.countAppEvents(query);
    expect(loads).toBe(2);
  });

  it('fails without project or dataset', () => {
    const options = { ...resolveOptions({ environment: 'dev' }) };
    expect(() => createBigQueryWarehouse(options)).toThrow();
  });
});
