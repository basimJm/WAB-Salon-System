import { BIGQUERY_RULES } from '../../constants/defaults';
import { ERROR_CODES } from '../../constants/codes';
import { AnalyticsError, malformedError } from '../../errors';
import { mapBigQueryError } from './errors';

export type BigQueryRow = Record<string, unknown>;

export interface BigQueryJobLike {
  readonly metadata?: { statistics?: { totalBytesProcessed?: string | number } };
  getQueryResults(options?: { timeoutMs?: number }): Promise<readonly unknown[]>;
}

/** The part of `@google-cloud/bigquery`'s `BigQuery` class the adapter uses. */
export interface BigQueryLike {
  createQueryJob(options: Record<string, unknown>): Promise<readonly unknown[]>;
}

export type ParamType = 'STRING' | 'INT64' | 'TIMESTAMP' | ['STRING'];

export interface SqlStatement {
  readonly query: string;
  readonly params: Record<string, unknown>;
  readonly types: Record<string, ParamType>;
}

export interface RunnerOptions {
  readonly client: () => Promise<BigQueryLike>;
  readonly location: string | undefined;
  readonly maxBytesBilled: number;
  readonly dryRunFirst: boolean;
  readonly timeoutMs: number;
}

const withDeadline = async <T>(task: Promise<T>, ms: number): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new AnalyticsError(ERROR_CODES.TIMEOUT, 'the warehouse query timed out'));
    }, ms);
  });
  try {
    return await Promise.race([task, deadline]);
  } finally {
    clearTimeout(timer);
  }
};

const jobOf = (result: readonly unknown[]): BigQueryJobLike => {
  const job = result[0] as BigQueryJobLike | undefined;
  if (typeof job?.getQueryResults !== 'function') {
    throw malformedError('the warehouse returned no job');
  }
  return job;
};

/** Runs parameterized statements with the cost guard, a deadline and error mapping. */
export interface BigQueryRunner {
  /** Rows of the statement; never rejects with a vendor error. */
  run(statement: SqlStatement): Promise<BigQueryRow[]>;
}

export const createRunner = (options: RunnerOptions): BigQueryRunner => {
  const base = (statement: SqlStatement): Record<string, unknown> => ({
    query: statement.query,
    params: statement.params,
    types: statement.types,
    useLegacySql: false,
    labels: BIGQUERY_RULES.jobLabels,
    ...(options.location === undefined ? {} : { location: options.location }),
  });

  const dryRun = async (client: BigQueryLike, statement: SqlStatement): Promise<void> => {
    const job = jobOf(await client.createQueryJob({ ...base(statement), dryRun: true }));
    const bytes = Number(job.metadata?.statistics?.totalBytesProcessed ?? 0);
    if (!Number.isFinite(bytes)) throw malformedError('the warehouse returned an invalid estimate');
    if (bytes > options.maxBytesBilled) {
      throw new AnalyticsError(
        ERROR_CODES.ANALYTICS_QUERY_TOO_EXPENSIVE,
        'the query exceeds the allowed bytes billed',
        { details: { estimatedBytes: bytes, maxBytesBilled: options.maxBytesBilled } },
      );
    }
  };

  const execute = async (statement: SqlStatement): Promise<BigQueryRow[]> => {
    const client = await options.client();
    if (options.dryRunFirst) await dryRun(client, statement);
    const job = jobOf(
      await client.createQueryJob({
        ...base(statement),
        maximumBytesBilled: String(options.maxBytesBilled),
      }),
    );
    const [rows] = await job.getQueryResults({ timeoutMs: options.timeoutMs });
    if (!Array.isArray(rows)) throw malformedError('the warehouse returned no rows');
    return rows as BigQueryRow[];
  };

  return {
    async run(statement: SqlStatement): Promise<BigQueryRow[]> {
      try {
        return await withDeadline(execute(statement), options.timeoutMs);
      } catch (error) {
        throw mapBigQueryError(error);
      }
    },
  };
};
