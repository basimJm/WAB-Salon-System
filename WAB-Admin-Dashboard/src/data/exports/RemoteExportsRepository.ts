import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { ExportsRepository } from '@/domain/exports/exports';

const O = OPERATIONS;
const list = defineEndpoint(O.getExports, {
  data: dto.getExportsDataSchema,
  query: dto.getExportsQuerySchema,
});
const request = defineEndpoint(
  O.postExports,
  { data: dto.postExportsDataSchema, body: dto.postExportsBodySchema },
  { idempotent: true },
);
const get = defineEndpoint(O.getExportsById, { data: dto.getExportsByIdDataSchema });

export class RemoteExportsRepository implements ExportsRepository {
  constructor(private readonly api: ApiClient) {}

  list: ExportsRepository['list'] = (q) =>
    this.api.executePage(list, { query: { page: q.page, pageSize: q.pageSize } });

  // The union body is validated by the server against the kind; the form builds `params` per kind.
  request: ExportsRepository['request'] = async (input) =>
    (await this.api.execute(request, { body: input as unknown as dto.postExportsBody })).data;

  get: ExportsRepository['get'] = async (id) =>
    (await this.api.execute(get, { params: { id } })).data;
}
