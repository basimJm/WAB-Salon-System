import { BIGQUERY_RULES } from '../../constants/defaults';
import { malformedError } from '../../errors';
import { redact } from '../../logger';
import type { AppEvent, CrashEvent, ParamValue } from '../../ports';
import type { CountRow } from '../../types';
import type { BigQueryRow } from './runner';

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

/** Microseconds since the epoch (INT64 as number or string) to a Date. */
const fromMicros = (value: unknown): Date => {
  const micros = Number(value);
  if (!Number.isFinite(micros)) throw malformedError('event has no valid timestamp');
  return new Date(Math.floor(micros / BIGQUERY_RULES.microsPerMs));
};

/** TIMESTAMP columns arrive as `{ value: ISO }`, a string or a Date. */
const fromTimestamp = (value: unknown): Date => {
  const raw = typeof value === 'object' && value !== null && 'value' in value ? value.value : value;
  const date = raw instanceof Date ? raw : new Date(String(raw));
  if (Number.isNaN(date.getTime())) throw malformedError('crash has no valid timestamp');
  return date;
};

interface ExportParam {
  readonly key?: unknown;
  readonly value?: Record<string, unknown> | null;
}

/** Firebase `event_params` (key + typed value) flattened to plain values, secrets redacted. */
const flattenParams = (raw: unknown): Record<string, ParamValue> => {
  const params: Record<string, ParamValue> = {};
  if (!Array.isArray(raw)) return params;
  for (const entry of raw as ExportParam[]) {
    const key = text(entry.key);
    if (key === undefined) continue;
    const {
      string_value: str,
      int_value: int,
      float_value: flt,
      double_value: dbl,
    } = entry.value ?? {};
    const value = str ?? int ?? flt ?? dbl ?? null;
    params[key] = typeof value === 'string' || typeof value === 'number' ? value : null;
  }
  return redact(params) as Record<string, ParamValue>;
};

export const toCountRows = (rows: readonly BigQueryRow[]): CountRow[] =>
  rows.map((row) => {
    const key = text(row.key);
    const count = Number(row.event_count);
    if (key === undefined || !Number.isFinite(count)) throw malformedError('invalid count row');
    return { key, count };
  });

export const toActorCount = (rows: readonly BigQueryRow[]): number => {
  const count = Number(rows[0]?.actors ?? 0);
  if (!Number.isFinite(count)) throw malformedError('invalid actor count');
  return count;
};

export const toAppEvents = (rows: readonly BigQueryRow[]): AppEvent[] =>
  rows.map((row) => {
    const name = text(row.event_name);
    const installationId = text(row.user_pseudo_id);
    if (name === undefined || installationId === undefined) {
      throw malformedError('app event has no name or installation');
    }
    const event: { -readonly [K in keyof AppEvent]: AppEvent[K] } = {
      ts: fromMicros(row.event_timestamp),
      name,
      installationId,
      params: flattenParams(row.event_params),
    };
    const optional = {
      userId: text(row.user_id),
      platform: text(row.platform),
      appVersion: text(row.app_version),
      screen: text(row.screen),
    };
    for (const [key, value] of Object.entries(optional)) {
      if (value !== undefined) (event as Record<string, unknown>)[key] = value;
    }
    return event;
  });

export const toCrashes = (rows: readonly BigQueryRow[]): CrashEvent[] =>
  rows.map((row) => {
    const issueId = text(row.issue_id);
    if (issueId === undefined) throw malformedError('crash has no issue id');
    const crash: { -readonly [K in keyof CrashEvent]: CrashEvent[K] } = {
      ts: fromTimestamp(row.event_timestamp),
      issueId,
    };
    const optional = {
      title: text(row.issue_title),
      installationId: text(row.installation_uuid),
      userId: text(row.user_id),
      platform: text(row.platform),
      appVersion: text(row.app_version),
    };
    for (const [key, value] of Object.entries(optional)) {
      if (value !== undefined) (crash as Record<string, unknown>)[key] = value;
    }
    return crash;
  });
