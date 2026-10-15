import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined, resource } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { AppKind } from '@/domain/appconfig/appConfig';
import type { ContentRepository } from '@/domain/content/content';
import type { PageQuery } from '@/domain/shared/page';

export class RemoteContentRepository implements ContentRepository {
  readonly pages: ContentRepository['pages'];

  constructor(api: ApiClient) {
    this.pages = resource(
      api,
      {
        list: defineEndpoint(OPERATIONS.getContentPages, {
          data: dto.getContentPagesDataSchema,
          query: dto.getContentPagesQuerySchema,
        }),
        create: defineEndpoint(OPERATIONS.postContentPages, {
          data: dto.postContentPagesDataSchema,
          body: dto.postContentPagesBodySchema,
        }),
        update: defineEndpoint(OPERATIONS.patchContentPagesById, {
          data: dto.patchContentPagesByIdDataSchema,
          body: dto.patchContentPagesByIdBodySchema,
        }),
      },
      (q: PageQuery & { app?: AppKind }) =>
        defined({ page: q.page, pageSize: q.pageSize, app: q.app }),
    );
  }
}
