import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { PlacementsRepository } from '@/domain/placements/placements';

const O = OPERATIONS;
const list = defineEndpoint(O.getRecommended, {
  data: dto.getRecommendedDataSchema,
  query: dto.getRecommendedQuerySchema,
});
const create = defineEndpoint(O.postRecommended, {
  data: dto.postRecommendedDataSchema,
  body: dto.postRecommendedBodySchema,
});
const update = defineEndpoint(O.patchRecommendedById, {
  data: dto.patchRecommendedByIdDataSchema,
  body: dto.patchRecommendedByIdBodySchema,
});
const end = defineEndpoint(O.postRecommendedByIdEnd, {
  data: dto.postRecommendedByIdEndDataSchema,
  body: dto.postRecommendedByIdEndBodySchema,
});
const reorder = defineEndpoint(O.putRecommendedReorder, {
  data: dto.putRecommendedReorderDataSchema,
  body: dto.putRecommendedReorderBodySchema,
});

export class RemotePlacementsRepository implements PlacementsRepository {
  constructor(private readonly api: ApiClient) {}

  list: PlacementsRepository['list'] = (q) =>
    this.api.executePage(list, {
      query: defined({ page: q.page, pageSize: q.pageSize, gender: q.gender, status: q.status }),
    });

  create: PlacementsRepository['create'] = async (input, reason) =>
    (
      await this.api.execute(create, {
        body: { ...defined(input), startAt: input.startAt, endAt: input.endAt, reason },
      })
    ).data;

  update: PlacementsRepository['update'] = async (id, patch, reason) =>
    (await this.api.execute(update, { params: { id }, body: { ...defined(patch), reason } })).data;

  end: PlacementsRepository['end'] = async (id, reason) =>
    (await this.api.execute(end, { params: { id }, body: { reason } })).data;

  reorder: PlacementsRepository['reorder'] = async (gender, ids, reason) =>
    (await this.api.execute(reorder, { body: { gender, ids: [...ids], reason } })).data;
}
