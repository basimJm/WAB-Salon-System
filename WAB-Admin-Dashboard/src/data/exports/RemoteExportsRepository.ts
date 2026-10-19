import { z } from 'zod';
import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { ExportsRepository } from '@/domain/exports/exports';

const O = OPERATIONS;
/** The server leaves `params` out of a job that has none, although the contract lists it as required. */
const params = { params: z.record(z.string(), z.unknown()).default({}) };
export const exportListSchema = () => z.array(dto.getExportsDataSchema().element.extend(params));
const list = defineEndpoint(O.getExports, {
  data: exportListSchema,
  query: dto.getExportsQuerySchema,
});
// No Idempotency-Key: the contract does not declare it and the server's CORS list refuses the header.
const request = defineEndpoint(O.postExports, {
  data: () => dto.postExportsDataSchema().extend(params),
  body: dto.postExportsBodySchema,
});
const get = defineEndpoint(O.getExportsById, {
  data: () => dto.getExportsByIdDataSchema().extend(params),
});

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
