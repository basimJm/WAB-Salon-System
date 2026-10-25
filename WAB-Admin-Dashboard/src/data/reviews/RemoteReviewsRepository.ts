import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { ReviewsRepository } from '@/domain/reviews/reviews';

const list = defineEndpoint(OPERATIONS.getReviews, {
  data: dto.getReviewsDataSchema,
  query: dto.getReviewsQuerySchema,
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
  body: dto.postReviewsBulkBodySchema,
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
