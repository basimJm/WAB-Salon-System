import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint, optionalQuery } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { TransactionsRepository } from '@/domain/transactions/transactions';

const list = defineEndpoint(OPERATIONS.getTransactions, {
  data: dto.getTransactionsDataSchema,
  query: dto.getTransactionsQuerySchema,
});
const get = defineEndpoint(OPERATIONS.getTransactionsById, {
  data: dto.getTransactionsByIdDataSchema,
});

const reconcile = defineEndpoint(OPERATIONS.getFinanceReconciliation, {
  data: dto.getFinanceReconciliationDataSchema,
  query: optionalQuery(dto.getFinanceReconciliationQuerySchema),
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
        branchId: q.branchId,
        customerId: q.customerId,
        bookingId: q.bookingId,
        from: q.from,
        to: q.to,
      }),
    });

  reconciliation: TransactionsRepository['reconciliation'] = async (scope = {}) =>
    (await this.api.execute(reconcile, { query: defined({ ...scope }) })).data;

  get: TransactionsRepository['get'] = async (id) =>
    (await this.api.execute(get, { params: { id } })).data;
}
