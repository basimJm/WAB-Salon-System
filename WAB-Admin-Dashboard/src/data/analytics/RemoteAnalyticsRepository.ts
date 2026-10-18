import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { AnalyticsRepository } from '@/domain/analytics/analytics';

const overview = defineEndpoint(OPERATIONS.getAnalyticsOverview, {
  data: dto.getAnalyticsOverviewDataSchema,
  query: dto.getAnalyticsOverviewQuerySchema,
});
const events = defineEndpoint(OPERATIONS.getAnalyticsEvents, {
  data: dto.getAnalyticsEventsDataSchema,
  query: dto.getAnalyticsEventsQuerySchema,
});

export class RemoteAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly api: ApiClient) {}

  overview: AnalyticsRepository['overview'] = async (range) =>
    (await this.api.execute(overview, { query: range })).data;

  events: AnalyticsRepository['events'] = async (q) =>
    (
      await this.api.execute(events, {
        query: defined({ from: q.from, to: q.to, groupBy: q.groupBy, names: q.names?.join(',') }),
      })
    ).data;
}
