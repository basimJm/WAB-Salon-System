import { BIGQUERY_RULES, MS_PER_DAY } from '../../constants/defaults';
import type { StoreCountQuery, WarehouseFindQuery } from '../../ports';
import type { SqlStatement } from './runner';

/** Names of the exported tables. All come from validated options, never from callers. */
export interface TableNames {
  readonly projectId: string;
  readonly dataset: string;
  readonly eventsPrefix: string;
  readonly intradayPrefix: string;
  readonly crashTable: string | undefined;
}

type Range = { from: Date; to: Date };
type Params = Pick<SqlStatement, 'params' | 'types'>;

const ref = (names: TableNames, table: string): string =>
  `\`${names.projectId}.${names.dataset}.${table}\``;

const suffixOf = (date: Date): string => date.toISOString().slice(0, 10).replaceAll('-', '');

/** Partition pruning: the suffix range of the export tables, padded for the property's time zone. */
const rangeParams = (range: Range): Params => {
  const pad = BIGQUERY_RULES.suffixPadDays * MS_PER_DAY;
  return {
    params: {
      startSuffix: suffixOf(new Date(range.from.getTime() - pad)),
      endSuffix: suffixOf(new Date(range.to.getTime() + pad)),
      fromMicros: range.from.getTime() * BIGQUERY_RULES.microsPerMs,
      toMicros: range.to.getTime() * BIGQUERY_RULES.microsPerMs,
    },
    types: { startSuffix: 'STRING', endSuffix: 'STRING', fromMicros: 'INT64', toMicros: 'INT64' },
  };
};

const COLUMNS =
  'event_timestamp, event_name, user_pseudo_id, user_id, platform, app_info.version AS app_version, event_params';

/** Daily export plus the streaming (intraday) export, both pruned by table suffix. */
const source = (names: TableNames): string => `WITH src AS (
  SELECT ${COLUMNS} FROM ${ref(names, `${names.eventsPrefix}*`)}
  WHERE _TABLE_SUFFIX BETWEEN @startSuffix AND @endSuffix
  UNION ALL
  SELECT ${COLUMNS} FROM ${ref(names, `${names.intradayPrefix}*`)}
  WHERE _TABLE_SUFFIX BETWEEN @startSuffix AND @endSuffix
)`;

const WINDOW = 'event_timestamp >= @fromMicros AND event_timestamp < @toMicros';

const withNames = (
  names: readonly string[] | undefined,
  base: Params,
): Params & { clause: string } =>
  names === undefined || names.length === 0
    ? { ...base, clause: '' }
    : {
        params: { ...base.params, names: [...names] },
        types: { ...base.types, names: ['STRING'] },
        clause: ' AND event_name IN UNNEST(@names)',
      };

const owner = (
  query: Pick<WarehouseFindQuery, 'installationIds' | 'userIds'>,
  installationColumn: string,
  userColumn: string,
  base: Params,
): Params & { clause: string } => {
  const parts: string[] = [];
  const params: Record<string, unknown> = { ...base.params };
  const types: SqlStatement['types'] = { ...base.types };
  if (query.installationIds !== undefined && query.installationIds.length > 0) {
    parts.push(`${installationColumn} IN UNNEST(@installationIds)`);
    params.installationIds = [...query.installationIds];
    types.installationIds = ['STRING'];
  }
  if (query.userIds !== undefined && query.userIds.length > 0) {
    parts.push(`${userColumn} IN UNNEST(@userIds)`);
    params.userIds = [...query.userIds];
    types.userIds = ['STRING'];
  }
  return { params, types, clause: parts.length === 0 ? '' : ` AND (${parts.join(' OR ')})` };
};

export const countStatement = (names: TableNames, query: StoreCountQuery): SqlStatement => {
  const key =
    query.groupBy === 'NAME'
      ? 'event_name'
      : "FORMAT_DATE('%Y-%m-%d', DATE(TIMESTAMP_MICROS(event_timestamp), @timeZone))";
  const filtered = withNames(query.names, rangeParams(query));
  return {
    query: `${source(names)}
SELECT ${key} AS key, COUNT(*) AS event_count FROM src
WHERE ${WINDOW}${filtered.clause}
GROUP BY key ORDER BY key`,
    params: { ...filtered.params, timeZone: query.timeZone },
    types: { ...filtered.types, timeZone: 'STRING' },
  };
};

export const actorsStatement = (
  names: TableNames,
  query: Range & { names?: readonly string[] | undefined },
): SqlStatement => {
  const filtered = withNames(query.names, rangeParams(query));
  return {
    query: `${source(names)}
SELECT COUNT(DISTINCT IFNULL(user_id, user_pseudo_id)) AS actors FROM src
WHERE ${WINDOW}${filtered.clause}`,
    params: filtered.params,
    types: filtered.types,
  };
};

export const eventsStatement = (names: TableNames, query: WarehouseFindQuery): SqlStatement => {
  const named = withNames(query.names, rangeParams(query));
  const owned = owner(query, 'user_pseudo_id', 'user_id', named);
  return {
    query: `${source(names)}
SELECT event_timestamp, event_name, user_pseudo_id, user_id, platform, app_version, event_params,
  (SELECT ep.value.string_value FROM UNNEST(event_params) AS ep WHERE ep.key = @screenParam LIMIT 1) AS screen
FROM src
WHERE ${WINDOW}${named.clause}${owned.clause}
ORDER BY event_timestamp LIMIT @limit`,
    params: { ...owned.params, screenParam: BIGQUERY_RULES.screenParam, limit: query.limit },
    types: { ...owned.types, screenParam: 'STRING', limit: 'INT64' },
  };
};

/** Crashlytics export: one table, filtered by time and by installation or user. */
export const crashesStatement = (
  names: TableNames,
  table: string,
  query: Omit<WarehouseFindQuery, 'names'>,
): SqlStatement => {
  const base: Params = {
    params: { from: query.from.toISOString(), to: query.to.toISOString(), limit: query.limit },
    types: { from: 'TIMESTAMP', to: 'TIMESTAMP', limit: 'INT64' },
  };
  const filtered = owner(query, 'installation_uuid', 'user.id', base);
  return {
    query: `SELECT event_timestamp, issue_id, issue_title, installation_uuid, user.id AS user_id,
  application.display_version AS app_version, platform
FROM ${ref(names, table)}
WHERE event_timestamp >= @from AND event_timestamp < @to${filtered.clause}
ORDER BY event_timestamp LIMIT @limit`,
    params: filtered.params,
    types: filtered.types,
  };
};
