import type { ResolvedOptions } from '../../config/options';
import { configError } from '../../errors';
import type { WarehouseQuery } from '../../ports';
import { loadBigQuery } from './loader';
import { createRunner, type BigQueryLike } from './runner';
import { BigQueryWarehouse } from './warehouse';

/** Builds the BigQuery warehouse from validated options; the client is created on first use. */
export const createBigQueryWarehouse = (
  options: ResolvedOptions,
  load: typeof loadBigQuery = loadBigQuery,
): WarehouseQuery => {
  const bq = options.warehouse.bigquery;
  if (bq?.projectId === undefined || bq.dataset === undefined) {
    throw configError('bigquery requires projectId and dataset', {
      paths: ['warehouse.bigquery.projectId', 'warehouse.bigquery.dataset'],
    });
  }
  const { projectId, dataset } = bq;
  let pending: Promise<BigQueryLike> | undefined;
  const client = (): Promise<BigQueryLike> => {
    if (bq.client !== undefined) return Promise.resolve(bq.client as BigQueryLike);
    pending ??= load({ projectId, location: bq.location, credentials: bq.credentials }).catch(
      (error: unknown) => {
        pending = undefined; // a missing optional package may be installed later: retry
        throw error;
      },
    );
    return pending;
  };
  const runner = createRunner({
    client,
    location: bq.location,
    maxBytesBilled: options.limits.maxBytesBilled,
    dryRunFirst: bq.dryRunFirst,
    timeoutMs: options.queryTimeoutMs,
  });
  return new BigQueryWarehouse(
    {
      projectId,
      dataset,
      eventsPrefix: bq.eventsPrefix,
      intradayPrefix: bq.intradayPrefix,
      crashTable: bq.crashTable,
    },
    runner,
  );
};
