import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined, resource } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { BannerGender, BannersRepository } from '@/domain/banners/banners';
import type { PageQuery } from '@/domain/shared/page';

export class RemoteBannersRepository implements BannersRepository {
  readonly banners: BannersRepository['banners'];

  constructor(api: ApiClient) {
    this.banners = resource(
      api,
      {
        list: defineEndpoint(OPERATIONS.getBanners, {
          data: dto.getBannersDataSchema,
          query: dto.getBannersQuerySchema,
        }),
        create: defineEndpoint(OPERATIONS.postBanners, {
          data: dto.postBannersDataSchema,
          body: dto.postBannersBodySchema,
        }),
        update: defineEndpoint(OPERATIONS.patchBannersById, {
          data: dto.patchBannersByIdDataSchema,
          body: dto.patchBannersByIdBodySchema,
        }),
      },
      (q: PageQuery & { gender?: BannerGender }) =>
        defined({ page: q.page, pageSize: q.pageSize, gender: q.gender }),
    );
  }
}
