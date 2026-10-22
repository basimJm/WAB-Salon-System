import { SEARCH_GROUP_SIZE } from '@/constants/ui';
import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { SearchRepository, SearchResponse } from '@/domain/search/search';

const search = defineEndpoint(OPERATIONS.getSearch, {
  data: dto.getSearchDataSchema,
  query: dto.getSearchQuerySchema,
});

export class RemoteSearchRepository implements SearchRepository {
  constructor(private readonly api: ApiClient) {}

  search: SearchRepository['search'] = async (text) => {
    const { data } = await this.api.execute(search, {
      query: { q: text, pageSize: SEARCH_GROUP_SIZE },
    });
    const response: {
      -readonly [K in keyof SearchResponse]: SearchResponse[K];
    } = {};
    if (data.customers) response.customers = data.customers.items;
    if (data.salons) response.salons = data.salons.items;
    if (data.bookings) response.bookings = data.bookings.items;
    if (data.members) response.members = data.members.items;
    return response;
  };
}
