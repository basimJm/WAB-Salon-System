import type {
  AppEvent,
  CrashEvent,
  StoreCountQuery,
  WarehouseFindQuery,
  WarehouseQuery,
} from '../../ports';
import type { CountRow } from '../../types';
import { toActorCount, toAppEvents, toCountRows, toCrashes } from './rows';
import type { BigQueryRunner } from './runner';
import {
  actorsStatement,
  countStatement,
  crashesStatement,
  eventsStatement,
  type TableNames,
} from './sql';

const noOwner = (query: Pick<WarehouseFindQuery, 'installationIds' | 'userIds'>): boolean =>
  (query.installationIds !== undefined || query.userIds !== undefined) &&
  (query.installationIds ?? []).length === 0 &&
  (query.userIds ?? []).length === 0;

/** Firebase Analytics / Crashlytics exports in BigQuery, read with parameterized queries. */
export class BigQueryWarehouse implements WarehouseQuery {
  constructor(
    private readonly tables: TableNames,
    private readonly runner: BigQueryRunner,
  ) {}

  async countAppEvents(query: StoreCountQuery): Promise<CountRow[]> {
    return toCountRows(await this.runner.run(countStatement(this.tables, query)));
  }

  async findAppEvents(query: WarehouseFindQuery): Promise<AppEvent[]> {
    if (noOwner(query)) return [];
    return toAppEvents(await this.runner.run(eventsStatement(this.tables, query)));
  }

  async findCrashes(query: Omit<WarehouseFindQuery, 'names'>): Promise<CrashEvent[]> {
    const { crashTable } = this.tables;
    if (crashTable === undefined || noOwner(query)) return [];
    return toCrashes(await this.runner.run(crashesStatement(this.tables, crashTable, query)));
  }

  async countAppActors(query: {
    names?: readonly string[];
    from: Date;
    to: Date;
  }): Promise<number> {
    return toActorCount(await this.runner.run(actorsStatement(this.tables, query)));
  }
}
