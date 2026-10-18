import { z } from 'zod';
import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint, type Endpoint } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { CustomerAction, CustomersRepository } from '@/domain/customers/customers';

/** The server's OpenAPI writes the id pattern as "^[a-f0-9]{24}$/i" that no id matches; see RemoteLocationsRepository. */
const OBJECT_ID = z.string().regex(/^[a-f0-9]{24}$/i);

const list = defineEndpoint(OPERATIONS.getCustomers, {
  data: dto.getCustomersDataSchema,
  query: () => dto.getCustomersQuerySchema().extend({ cityId: OBJECT_ID.optional() }),
});
const get = defineEndpoint(OPERATIONS.getCustomersById, { data: dto.getCustomersByIdDataSchema });
const reasonOnly = <D>(
  op: Parameters<typeof defineEndpoint>[0],
  data: () => z.ZodType<D>,
  body: () => z.ZodType<{ reason: string }>,
) =>
  defineEndpoint(op, { data, body }) as unknown as Endpoint<unknown, { reason: string }, undefined>;
const actions: Record<CustomerAction, Endpoint<unknown, { reason: string }, undefined>> = {
  block: reasonOnly(
    OPERATIONS.postCustomersByIdBlock,
    dto.postCustomersByIdBlockDataSchema,
    dto.postCustomersByIdBlockBodySchema,
  ),
  unblock: reasonOnly(
    OPERATIONS.postCustomersByIdUnblock,
    dto.postCustomersByIdUnblockDataSchema,
    dto.postCustomersByIdUnblockBodySchema,
  ),
  delete: reasonOnly(
    OPERATIONS.postCustomersByIdDelete,
    dto.postCustomersByIdDeleteDataSchema,
    dto.postCustomersByIdDeleteBodySchema,
  ),
  restore: reasonOnly(
    OPERATIONS.postCustomersByIdRestore,
    dto.postCustomersByIdRestoreDataSchema,
    dto.postCustomersByIdRestoreBodySchema,
  ),
};

export class RemoteCustomersRepository implements CustomersRepository {
  constructor(private readonly api: ApiClient) {}

  list: CustomersRepository['list'] = (q) =>
    this.api.executePage(list, {
      query: defined({
        page: q.page,
        pageSize: q.pageSize,
        status: q.status,
        gender: q.gender,
        cityId: q.cityId,
        q: q.q,
      }),
    });

  get: CustomersRepository['get'] = async (id) =>
    (await this.api.execute(get, { params: { id } })).data;

  act: CustomersRepository['act'] = async (id, action, reason) => {
    await this.api.execute(actions[action], { params: { id }, body: { reason } });
  };
}
