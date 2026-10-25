import { z } from 'zod';
import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { OBJECT_ID } from '@/data/api/objectId';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import { API_FORMATS, EXPORT_KINDS, type ExportsRepository } from '@/domain/exports/exports';

const O = OPERATIONS;
/** The server leaves `params` out of a job that has none, although the contract lists it as required. */
const params = { params: z.record(z.string(), z.unknown()).default({}) };
export const exportListSchema = () => z.array(dto.getExportsDataSchema().element.extend(params));
const list = defineEndpoint(O.getExports, {
  data: exportListSchema,
  query: dto.getExportsQuerySchema,
});
// No Idempotency-Key: the contract does not declare it and the server's CORS list refuses the header.
/**
 * The generated body union carries the server's broken id pattern (objectId.ts), so a salon or branch filter could
 * never be exported. Same shape with the id fields checked by OBJECT_ID; the server still validates per kind.
 */
const ID_PARAMS = ['salonId', 'branchId', 'customerId', 'bookingId', 'adminId'] as const;
const exportBodySchema = () =>
  z.object({
    kind: z.enum(EXPORT_KINDS),
    format: z.enum(API_FORMATS),
    params: z
      .record(z.string(), z.unknown())
      .refine((p) =>
        ID_PARAMS.every((k) => p[k] === undefined || OBJECT_ID.safeParse(p[k]).success),
      ),
  });
const request = defineEndpoint(O.postExports, {
  data: () => dto.postExportsDataSchema().extend(params),
  body: exportBodySchema,
});
const get = defineEndpoint(O.getExportsById, {
  data: () => dto.getExportsByIdDataSchema().extend(params),
});

export class RemoteExportsRepository implements ExportsRepository {
  constructor(private readonly api: ApiClient) {}

  list: ExportsRepository['list'] = (q) =>
    this.api.executePage(list, { query: { page: q.page, pageSize: q.pageSize } });

  // The server validates `params` against the kind; the screens build them per kind.
  request: ExportsRepository['request'] = async (input) =>
    (await this.api.execute(request, { body: input })).data;

  get: ExportsRepository['get'] = async (id) =>
    (await this.api.execute(get, { params: { id } })).data;
}
