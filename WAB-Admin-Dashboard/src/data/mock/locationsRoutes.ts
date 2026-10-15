import { OPERATIONS } from '../contract/generated/operations';
import * as dto from '../contract/generated/dto';
import { defineEndpoint } from '../api/endpoint';
import { collection } from './mockCollection';
import { mockRoute } from './mockRoute';
import type { MockRoute } from './mockTransport';

const LOCATION_DEFAULTS = { active: true, sortOrder: 0 };
const name = (ar: string, en: string) => ({ ar, en });
const AMMAN_ID = '64a000000000000000000001';
const IRBID_ID = '64a000000000000000000002';

export function locationsRoutes(): readonly MockRoute[] {
  let counter = 100;
  const nextId = () => `64a${String((counter += 1)).padStart(21, '0')}`;
  const countries = collection(
    [
      {
        id: '64a000000000000000000010',
        code: 'JO',
        name: name('الأردن', 'Jordan'),
        dialCode: '+962',
        flagKey: 'flags/jo.svg',
        phoneRegex: '^7[789][0-9]{7}$',
        active: true,
        sortOrder: 1,
      },
    ],
    nextId,
    LOCATION_DEFAULTS,
  );
  const cities = collection(
    [
      { id: AMMAN_ID, countryCode: 'JO', name: name('عمّان', 'Amman'), active: true, sortOrder: 1 },
      { id: IRBID_ID, countryCode: 'JO', name: name('إربد', 'Irbid'), active: true, sortOrder: 2 },
    ],
    nextId,
    LOCATION_DEFAULTS,
  );
  const areas = collection(
    [
      {
        id: '64a000000000000000000021',
        cityId: AMMAN_ID,
        name: name('عبدون', 'Abdoun'),
        active: true,
        sortOrder: 1,
      },
      {
        id: '64a000000000000000000022',
        cityId: AMMAN_ID,
        name: name('الجبيهة', 'Jubeiha'),
        active: false,
        sortOrder: 2,
      },
    ],
    nextId,
    LOCATION_DEFAULTS,
  );
  const ops = OPERATIONS;
  return [
    mockRoute(
      defineEndpoint(ops.getLocationsCountries, {
        data: dto.getLocationsCountriesDataSchema,
        query: dto.getLocationsCountriesQuerySchema,
      }),
      countries.list,
    ),
    mockRoute(
      defineEndpoint(ops.postLocationsCountries, {
        data: dto.postLocationsCountriesDataSchema,
        body: dto.postLocationsCountriesBodySchema,
      }),
      countries.create,
    ),
    mockRoute(
      defineEndpoint(ops.patchLocationsCountriesById, {
        data: dto.patchLocationsCountriesByIdDataSchema,
        body: dto.patchLocationsCountriesByIdBodySchema,
      }),
      countries.update,
    ),
    mockRoute(
      defineEndpoint(ops.getLocationsCities, {
        data: dto.getLocationsCitiesDataSchema,
        query: dto.getLocationsCitiesQuerySchema,
      }),
      cities.list,
    ),
    mockRoute(
      defineEndpoint(ops.postLocationsCities, {
        data: dto.postLocationsCitiesDataSchema,
        body: dto.postLocationsCitiesBodySchema,
      }),
      cities.create,
    ),
    mockRoute(
      defineEndpoint(ops.patchLocationsCitiesById, {
        data: dto.patchLocationsCitiesByIdDataSchema,
        body: dto.patchLocationsCitiesByIdBodySchema,
      }),
      cities.update,
    ),
    mockRoute(
      defineEndpoint(ops.getLocationsAreas, {
        data: dto.getLocationsAreasDataSchema,
        query: dto.getLocationsAreasQuerySchema,
      }),
      areas.list,
    ),
    mockRoute(
      defineEndpoint(ops.postLocationsAreas, {
        data: dto.postLocationsAreasDataSchema,
        body: dto.postLocationsAreasBodySchema,
      }),
      areas.create,
    ),
    mockRoute(
      defineEndpoint(ops.patchLocationsAreasById, {
        data: dto.patchLocationsAreasByIdDataSchema,
        body: dto.patchLocationsAreasByIdBodySchema,
      }),
      areas.update,
    ),
  ];
}
