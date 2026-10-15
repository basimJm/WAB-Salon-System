import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined, resource } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { CatalogGender, CatalogRepository } from '@/domain/catalog/catalog';
import type { PageQuery } from '@/domain/shared/page';

export class RemoteCatalogRepository implements CatalogRepository {
  readonly services: CatalogRepository['services'];

  constructor(api: ApiClient) {
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
