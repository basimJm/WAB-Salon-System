import { z } from 'zod';
import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { ReviewsRepository } from '@/domain/reviews/reviews';

/** The server's OpenAPI writes the id pattern as "^[a-f0-9]{24}$/i" that no id matches; see RemoteLocationsRepository. */
const OBJECT_ID = z.string().regex(/^[a-f0-9]{24}$/i);

const list = defineEndpoint(OPERATIONS.getReviews, {
  data: dto.getReviewsDataSchema,
  query: () =>
    dto.getReviewsQuerySchema().extend({
      salonId: OBJECT_ID.optional(),
      branchId: OBJECT_ID.optional(),
      staffId: OBJECT_ID.optional(),
    }),
});
const approve = defineEndpoint(OPERATIONS.postReviewsByIdApprove, {
  data: dto.postReviewsByIdApproveDataSchema,
  body: dto.postReviewsByIdApproveBodySchema,
});
const reject = defineEndpoint(OPERATIONS.postReviewsByIdReject, {
  data: dto.postReviewsByIdRejectDataSchema,
  body: dto.postReviewsByIdRejectBodySchema,
});
const remove = defineEndpoint(OPERATIONS.postReviewsByIdRemove, {
  data: dto.postReviewsByIdRemoveDataSchema,
  body: dto.postReviewsByIdRemoveBodySchema,
});
const bulk = defineEndpoint(OPERATIONS.postReviewsBulk, {
  data: dto.postReviewsBulkDataSchema,
  body: () => dto.postReviewsBulkBodySchema().extend({ ids: z.array(OBJECT_ID).min(1).max(100) }),
});

export class RemoteReviewsRepository implements ReviewsRepository {
  constructor(private readonly api: ApiClient) {}

  list: ReviewsRepository['list'] = (q) =>
    this.api.executePage(list, {
      query: defined({
        page: q.page,
        pageSize: q.pageSize,
        status: q.status,
        target: q.target,
        salonId: q.salonId,
        branchId: q.branchId,
        staffId: q.staffId,
        rating: q.rating,
      }),
    });

  approve: ReviewsRepository['approve'] = async (id, reason) =>
    (await this.api.execute(approve, { params: { id }, body: defined({ reason }) })).data;

  reject: ReviewsRepository['reject'] = async (id, reason) =>
    (await this.api.execute(reject, { params: { id }, body: defined({ reason }) })).data;

  remove: ReviewsRepository['remove'] = async (id, reason) =>
    (await this.api.execute(remove, { params: { id }, body: { reason } })).data;

  bulk: ReviewsRepository['bulk'] = async (ids, decision, reason) =>
    (await this.api.execute(bulk, { body: defined({ ids: [...ids], decision, reason }) })).data;
}
