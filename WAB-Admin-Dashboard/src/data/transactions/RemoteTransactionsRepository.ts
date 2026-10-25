import { z } from 'zod';
import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { salonBranchQuerySchema } from '@/data/api/objectId';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { TransactionsRepository } from '@/domain/transactions/transactions';

/** The server's OpenAPI writes the id pattern as "^[a-f0-9]{24}$/i" that no id matches; see RemoteLocationsRepository. */
const OBJECT_ID = z
  .string()
  .regex(/^[a-f0-9]{24}$/i)
  .optional();

const list = defineEndpoint(OPERATIONS.getTransactions, {
  data: dto.getTransactionsDataSchema,
  query: () =>
    dto
      .getTransactionsQuerySchema()
      .extend({ salonId: OBJECT_ID, customerId: OBJECT_ID, bookingId: OBJECT_ID }),
});
const get = defineEndpoint(OPERATIONS.getTransactionsById, {
  data: dto.getTransactionsByIdDataSchema,
});

const reconcile = defineEndpoint(OPERATIONS.getFinanceReconciliation, {
  data: dto.getFinanceReconciliationDataSchema,
  query: salonBranchQuerySchema,
});

export class RemoteTransactionsRepository implements TransactionsRepository {
  constructor(private readonly api: ApiClient) {}

  list: TransactionsRepository['list'] = (q) =>
    this.api.executePage(list, {
      query: defined({
        page: q.page,
        pageSize: q.pageSize,
        status: q.status,
        type: q.type,
        salonId: q.salonId,
        customerId: q.customerId,
        bookingId: q.bookingId,
        from: q.from,
        to: q.to,
      }),
    });

  reconciliation: TransactionsRepository['reconciliation'] = async () =>
    (await this.api.execute(reconcile)).data;

  get: TransactionsRepository['get'] = async (id) =>
    (await this.api.execute(get, { params: { id } })).data;
}
