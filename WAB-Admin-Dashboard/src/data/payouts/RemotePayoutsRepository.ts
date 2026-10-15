import { z } from 'zod';
import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { PayoutsRepository } from '@/domain/payouts/payouts';

/** The server's OpenAPI writes the id pattern as "^[a-f0-9]{24}$/i" that no id matches; see RemoteLocationsRepository. */
const ID = z.string().regex(/^[a-f0-9]{24}$/i);
const O = OPERATIONS;
const balances = defineEndpoint(O.getPayoutsBalances, {
  data: dto.getPayoutsBalancesDataSchema,
  query: dto.getPayoutsBalancesQuerySchema,
});
const preview = defineEndpoint(O.getPayoutsPreview, {
  data: dto.getPayoutsPreviewDataSchema,
  query: () => dto.getPayoutsPreviewQuerySchema().extend({ salonId: ID }),
});
const list = defineEndpoint(O.getPayouts, {
  data: dto.getPayoutsDataSchema,
  query: () => dto.getPayoutsQuerySchema().extend({ salonId: ID.optional() }),
});
const create = defineEndpoint(O.postPayouts, {
  data: dto.postPayoutsDataSchema,
  body: () => dto.postPayoutsBodySchema().extend({ salonId: ID }),
});
const transfer = defineEndpoint(O.postPayoutsByIdTransfer, {
  data: dto.postPayoutsByIdTransferDataSchema,
  body: dto.postPayoutsByIdTransferBodySchema,
});

export class RemotePayoutsRepository implements PayoutsRepository {
  constructor(private readonly api: ApiClient) {}

  balances: PayoutsRepository['balances'] = (q) =>
    this.api.executePage(balances, { query: { page: q.page, pageSize: q.pageSize } });

  preview: PayoutsRepository['preview'] = async (salonId, periodTo) =>
    (await this.api.execute(preview, { query: { salonId, periodTo } })).data;

  list: PayoutsRepository['list'] = (q) =>
    this.api.executePage(list, {
      query: defined({ page: q.page, pageSize: q.pageSize, salonId: q.salonId, status: q.status }),
    });

  create: PayoutsRepository['create'] = async (salonId, periodTo, note) =>
    (await this.api.execute(create, { body: defined({ salonId, periodTo, note }) })).data;

  transfer: PayoutsRepository['transfer'] = async (id, input) =>
    (await this.api.execute(transfer, { params: { id }, body: input })).data;
}
