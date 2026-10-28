import { z } from 'zod';
import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { AlertsRepository } from '@/domain/alerts/alerts';

const O = OPERATIONS;
/**
 * Tolerances on top of the generated alert (open items for the server owner):
 * - the server leaves `data` out of an alert that has none, although the contract lists it as required: read as `{}`;
 * - servers before contract 1.4.0 (SRV-150; the local QA stack may still run one) send no `titles` and may send a
 *   lowercase `entityType`: `titles` is optional (the page falls back to `title`) and `alertLink` normalizes the type.
 */
const tolerant = {
  data: z.record(z.string(), z.unknown()).default({}),
  titles: z.object({ ar: z.string(), en: z.string() }).optional(),
  entityType: z.string().nullable(),
};
export const alertListSchema = () => z.array(dto.getAlertsDataSchema().element.extend(tolerant));
export const alertSchema = () => dto.postAlertsByIdAcknowledgeDataSchema().extend(tolerant);
const list = defineEndpoint(O.getAlerts, {
  data: alertListSchema,
  query: dto.getAlertsQuerySchema,
});
const count = defineEndpoint(O.getAlertsCount, { data: dto.getAlertsCountDataSchema });
const ack = defineEndpoint(O.postAlertsByIdAcknowledge, { data: alertSchema });

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
