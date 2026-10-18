import { z } from 'zod';
import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { RefundsRepository } from '@/domain/refunds/refunds';

/** The server's OpenAPI writes the id pattern as "^[a-f0-9]{24}$/i" that no id matches; see RemoteLocationsRepository. */
const list = defineEndpoint(OPERATIONS.getRefunds, {
  data: dto.getRefundsDataSchema,
  query: () =>
    dto.getRefundsQuerySchema().extend({
      bookingId: z
        .string()
        .regex(/^[a-f0-9]{24}$/i)
        .optional(),
    }),
});
const retry = defineEndpoint(OPERATIONS.postRefundsByIdRetry, {
  data: dto.postRefundsByIdRetryDataSchema,
  body: dto.postRefundsByIdRetryBodySchema,
});
const manual = defineEndpoint(OPERATIONS.postRefundsByIdManual, {
  data: dto.postRefundsByIdManualDataSchema,
  body: dto.postRefundsByIdManualBodySchema,
});

export class RemoteRefundsRepository implements RefundsRepository {
  constructor(private readonly api: ApiClient) {}

  list: RefundsRepository['list'] = (q) =>
    this.api.executePage(list, {
      query: defined({
        page: q.page,
        pageSize: q.pageSize,
        status: q.status,
        bookingId: q.bookingId,
      }),
    });

  retry: RefundsRepository['retry'] = async (id, reason) =>
    (await this.api.execute(retry, { params: { id }, body: { reason } })).data;

  markManual: RefundsRepository['markManual'] = async (id, reference, reason) =>
    (await this.api.execute(manual, { params: { id }, body: { reference, reason } })).data;
}
