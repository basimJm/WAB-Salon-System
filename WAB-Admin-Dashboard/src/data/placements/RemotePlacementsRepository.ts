import { z } from 'zod';
import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { PlacementsRepository } from '@/domain/placements/placements';

/** The server's OpenAPI writes the id pattern as "^[a-f0-9]{24}$/i" that no id matches; see RemoteLocationsRepository. */
const ID = z.string().regex(/^[a-f0-9]{24}$/i);
const O = OPERATIONS;
const list = defineEndpoint(O.getRecommended, {
  data: dto.getRecommendedDataSchema,
  query: () => dto.getRecommendedQuerySchema().extend({ salonId: ID.optional() }),
});
const create = defineEndpoint(O.postRecommended, {
  data: dto.postRecommendedDataSchema,
  body: () => dto.postRecommendedBodySchema().extend({ salonId: ID }),
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
  body: () => dto.putRecommendedReorderBodySchema().extend({ ids: z.array(ID).min(1).max(200) }),
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
