import { z } from 'zod';
import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { OBJECT_ID } from '@/data/api/objectId';
import { defined, resource } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type {
  ApproveInput,
  CatalogGender,
  CatalogRepository,
  CatalogRequest,
  RequestStatus,
} from '@/domain/catalog/catalog';
import type { Page, PageQuery } from '@/domain/shared/page';

const listRequests = defineEndpoint(OPERATIONS.getCatalogRequests, {
  data: dto.getCatalogRequestsDataSchema,
  query: dto.getCatalogRequestsQuerySchema,
});
/** The generated union's `catalogServiceId` pattern refuses every real id (S6): re-checked with OBJECT_ID. */
export const approveBodySchema = () => {
  const [map, create] = dto.postCatalogRequestsByIdApproveBodySchema().options;
  return z.union([map.extend({ catalogServiceId: OBJECT_ID }), create]);
};
const approveRequest = defineEndpoint(OPERATIONS.postCatalogRequestsByIdApprove, {
  data: dto.postCatalogRequestsByIdApproveDataSchema,
  body: approveBodySchema,
});
const rejectRequest = defineEndpoint(OPERATIONS.postCatalogRequestsByIdReject, {
  data: dto.postCatalogRequestsByIdRejectDataSchema,
  body: dto.postCatalogRequestsByIdRejectBodySchema,
});

export class RemoteCatalogRepository implements CatalogRepository {
  readonly services: CatalogRepository['services'];
  readonly requests: CatalogRepository['requests'];

  constructor(api: ApiClient) {
    this.requests = {
      list: (q: PageQuery & { status?: RequestStatus }): Promise<Page<CatalogRequest>> =>
        api.executePage(listRequests, {
          query: defined({ page: q.page, pageSize: q.pageSize, status: q.status }),
        }),
      approve: async (id: string, input: ApproveInput, reason: string) =>
        (await api.execute(approveRequest, { params: { id }, body: { ...input, reason } })).data,
      reject: async (id: string, reason: string) =>
        (await api.execute(rejectRequest, { params: { id }, body: { reason } })).data,
    };
    this.services = resource(
      api,
      {
        list: defineEndpoint(OPERATIONS.getCatalogServices, {
          data: dto.getCatalogServicesDataSchema,
          query: dto.getCatalogServicesQuerySchema,
        }),
        create: defineEndpoint(OPERATIONS.postCatalogServices, {
          data: dto.postCatalogServicesDataSchema,
          body: dto.postCatalogServicesBodySchema,
        }),
        update: defineEndpoint(OPERATIONS.patchCatalogServicesById, {
          data: dto.patchCatalogServicesByIdDataSchema,
          body: dto.patchCatalogServicesByIdBodySchema,
        }),
      },
      (q: PageQuery & { gender?: CatalogGender }) =>
        defined({ page: q.page, pageSize: q.pageSize, gender: q.gender }),
    );
  }
}
