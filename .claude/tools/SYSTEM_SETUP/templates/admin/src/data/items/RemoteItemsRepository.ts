import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import { sortParamOf, type ItemsRepository } from '@/domain/items/items';

const O = OPERATIONS;
const list = defineEndpoint(O.getItems, {
  data: dto.getItemsDataSchema,
  query: dto.getItemsQuerySchema,
});
const get = defineEndpoint(O.getItemsById, { data: dto.getItemsByIdDataSchema });
const create = defineEndpoint(O.postItems, {
  data: dto.postItemsDataSchema,
  body: dto.postItemsBodySchema,
});
const update = defineEndpoint(O.patchItemsById, {
  data: dto.patchItemsByIdDataSchema,
  body: dto.patchItemsByIdBodySchema,
});

/** `/admin/v1/items`: the generated schemas check every query, body and answer against the contract. */
export class RemoteItemsRepository implements ItemsRepository {
  constructor(private readonly api: ApiClient) {}

  list: ItemsRepository['list'] = (q) =>
    this.api.executePage(list, {
      query: defined({
        page: q.page,
        pageSize: q.pageSize,
        q: q.q,
        status: q.status,
        sort: q.sort ? (sortParamOf(q.sort) as dto.getItemsQuery['sort']) : undefined,
      }),
    });

  get: ItemsRepository['get'] = async (id) =>
    (await this.api.execute(get, { params: { id } })).data;

  create: ItemsRepository['create'] = async (input, reason) =>
    (await this.api.execute(create, { body: { ...input, reason } })).data;

  update: ItemsRepository['update'] = async (id, patch, reason) =>
    (await this.api.execute(update, { params: { id }, body: { ...patch, reason } })).data;
}
