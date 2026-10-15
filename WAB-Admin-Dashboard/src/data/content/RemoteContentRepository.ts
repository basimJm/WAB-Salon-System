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
  readonly faqs: ContentRepository['faqs'];
  readonly contactInfo: ContentRepository['contactInfo'];

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
    this.faqs = resource(
      api,
      {
        list: defineEndpoint(OPERATIONS.getContentFaqs, {
          data: dto.getContentFaqsDataSchema,
          query: dto.getContentFaqsQuerySchema,
        }),
        create: defineEndpoint(OPERATIONS.postContentFaqs, {
          data: dto.postContentFaqsDataSchema,
          body: dto.postContentFaqsBodySchema,
        }),
        update: defineEndpoint(OPERATIONS.patchContentFaqsById, {
          data: dto.patchContentFaqsByIdDataSchema,
          body: dto.patchContentFaqsByIdBodySchema,
        }),
      },
      (q: PageQuery & { app?: AppKind }) =>
        defined({ page: q.page, pageSize: q.pageSize, app: q.app }),
    );
    this.contactInfo = resource(
      api,
      {
        list: defineEndpoint(OPERATIONS.getContentContactInfo, {
          data: dto.getContentContactInfoDataSchema,
          query: dto.getContentContactInfoQuerySchema,
        }),
        create: defineEndpoint(OPERATIONS.postContentContactInfo, {
          data: dto.postContentContactInfoDataSchema,
          body: dto.postContentContactInfoBodySchema,
        }),
        update: defineEndpoint(OPERATIONS.patchContentContactInfoById, {
          data: dto.patchContentContactInfoByIdDataSchema,
          body: dto.patchContentContactInfoByIdBodySchema,
        }),
      },
      (q: PageQuery & { app?: AppKind }) =>
        defined({ page: q.page, pageSize: q.pageSize, app: q.app }),
    );
  }
}
