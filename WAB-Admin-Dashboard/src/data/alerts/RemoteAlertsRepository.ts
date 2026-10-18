import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { AlertsRepository } from '@/domain/alerts/alerts';

const O = OPERATIONS;
const list = defineEndpoint(O.getAlerts, {
  data: dto.getAlertsDataSchema,
  query: dto.getAlertsQuerySchema,
});
const count = defineEndpoint(O.getAlertsCount, { data: dto.getAlertsCountDataSchema });
const ack = defineEndpoint(O.postAlertsByIdAcknowledge, {
  data: dto.postAlertsByIdAcknowledgeDataSchema,
});

export class RemoteAlertsRepository implements AlertsRepository {
  constructor(private readonly api: ApiClient) {}

  list: AlertsRepository['list'] = (q) =>
    this.api.executePage(list, {
      query: defined({ page: q.page, pageSize: q.pageSize, status: q.status, kind: q.kind }),
    });

  count: AlertsRepository['count'] = async () => (await this.api.execute(count)).data.new;

  acknowledge: AlertsRepository['acknowledge'] = async (id) =>
    (await this.api.execute(ack, { params: { id } })).data;
}
