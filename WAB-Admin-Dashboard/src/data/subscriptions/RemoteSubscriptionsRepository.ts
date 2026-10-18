import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { SubscriptionsRepository } from '@/domain/subscriptions/subscriptions';

const list = defineEndpoint(OPERATIONS.getSubscriptions, {
  data: dto.getSubscriptionsDataSchema,
  query: dto.getSubscriptionsQuerySchema,
});
const record = defineEndpoint(OPERATIONS.postSubscriptionsBySalonIdPayments, {
  data: dto.postSubscriptionsBySalonIdPaymentsDataSchema,
  body: dto.postSubscriptionsBySalonIdPaymentsBodySchema,
});

export class RemoteSubscriptionsRepository implements SubscriptionsRepository {
  constructor(private readonly api: ApiClient) {}

  list: SubscriptionsRepository['list'] = (q) =>
    this.api.executePage(list, {
      query: defined({
        page: q.page,
        pageSize: q.pageSize,
        status: q.status,
        endingInDays: q.endingInDays,
      }),
    });

  recordPayment: SubscriptionsRepository['recordPayment'] = async (salonId, input) =>
    (await this.api.execute(record, { params: { salonId }, body: defined(input) })).data;
}
