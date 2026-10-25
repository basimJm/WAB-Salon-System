import type { ApiClient } from '@/data/api/ApiClient';
import { defineEndpoint } from '@/data/api/endpoint';
import * as dto from '@/data/contract/generated/dto';
import { OPERATIONS } from '@/data/contract/generated/operations';
import type { LocationsRepository } from '@/domain/locations/locations';
import type { PageQuery } from '@/domain/shared/page';
import { defined, resource } from '@/data/api/resource';

export class RemoteLocationsRepository implements LocationsRepository {
  readonly countries: LocationsRepository['countries'];
  readonly cities: LocationsRepository['cities'];
  readonly areas: LocationsRepository['areas'];

  constructor(api: ApiClient) {
    this.countries = resource(
      api,
      {
        list: defineEndpoint(OPERATIONS.getLocationsCountries, {
          data: dto.getLocationsCountriesDataSchema,
          query: dto.getLocationsCountriesQuerySchema,
        }),
        create: defineEndpoint(OPERATIONS.postLocationsCountries, {
          data: dto.postLocationsCountriesDataSchema,
          body: dto.postLocationsCountriesBodySchema,
        }),
        update: defineEndpoint(OPERATIONS.patchLocationsCountriesById, {
          data: dto.patchLocationsCountriesByIdDataSchema,
          body: dto.patchLocationsCountriesByIdBodySchema,
        }),
      },
      (q: PageQuery) => ({ page: q.page, pageSize: q.pageSize }),
    );
    this.cities = resource(
      api,
      {
        list: defineEndpoint(OPERATIONS.getLocationsCities, {
          data: dto.getLocationsCitiesDataSchema,
          query: dto.getLocationsCitiesQuerySchema,
        }),
        create: defineEndpoint(OPERATIONS.postLocationsCities, {
          data: dto.postLocationsCitiesDataSchema,
          body: dto.postLocationsCitiesBodySchema,
        }),
        update: defineEndpoint(OPERATIONS.patchLocationsCitiesById, {
          data: dto.patchLocationsCitiesByIdDataSchema,
          body: dto.patchLocationsCitiesByIdBodySchema,
        }),
      },
      (q: PageQuery & { countryCode?: string }) =>
        defined({ page: q.page, pageSize: q.pageSize, countryCode: q.countryCode }),
    );
    this.areas = resource(
      api,
      {
        list: defineEndpoint(OPERATIONS.getLocationsAreas, {
          data: dto.getLocationsAreasDataSchema,
          query: dto.getLocationsAreasQuerySchema,
        }),
        create: defineEndpoint(OPERATIONS.postLocationsAreas, {
          data: dto.postLocationsAreasDataSchema,
          body: dto.postLocationsAreasBodySchema,
        }),
        update: defineEndpoint(OPERATIONS.patchLocationsAreasById, {
          data: dto.patchLocationsAreasByIdDataSchema,
          body: dto.patchLocationsAreasByIdBodySchema,
        }),
      },
      (q: PageQuery & { cityId?: string }) =>
        defined({ page: q.page, pageSize: q.pageSize, cityId: q.cityId }),
    );
  }
}
