import { z } from 'zod';
import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import { defined } from '@/data/api/resource';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { SalonQuery, SalonsRepository } from '@/domain/salons/salons';

/** The server's OpenAPI writes the id pattern as "^[a-f0-9]{24}$/i" that no id matches; see RemoteLocationsRepository. */
const OBJECT_ID = z.string().regex(/^[a-f0-9]{24}$/i);

const listSalons = defineEndpoint(OPERATIONS.getSalons, {
  data: dto.getSalonsDataSchema,
  query: () => dto.getSalonsQuerySchema().extend({ cityId: OBJECT_ID.optional() }),
});

export class RemoteSalonsRepository implements SalonsRepository {
  constructor(private readonly api: ApiClient) {}

  list(q: SalonQuery) {
    return this.api.executePage(listSalons, {
      query: defined({
        page: q.page,
        pageSize: q.pageSize,
        state: q.state,
        gender: q.gender,
        cityId: q.cityId,
        q: q.q,
      }),
    });
  }
}
