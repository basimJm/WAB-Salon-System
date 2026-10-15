import { OPERATIONS } from '../contract/generated/operations';
import * as dto from '../contract/generated/dto';
import { defineEndpoint } from '../api/endpoint';
import { mockRoute, type TypedAnswer } from './mockRoute';
import type { MockRequest, MockRoute } from './mockTransport';

interface Row {
  id: string;
  name: { ar: string; en: string };
  active: boolean;
  sortOrder: number;
}

const withoutReason = (body: unknown): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(([k]) => k !== 'reason'),
  );

const name = (ar: string, en: string) => ({ ar, en });
const AMMAN_ID = '64a000000000000000000001';
const IRBID_ID = '64a000000000000000000002';

const page = <T>(rows: T[], q: URLSearchParams): TypedAnswer<T[]> => {
  const pageSize = Number(q.get('pageSize') ?? 25);
  const current = Number(q.get('page') ?? 1);
  const start = (current - 1) * pageSize;
  return {
    data: rows.slice(start, start + pageSize),
    meta: {
      page: current,
      pageSize,
      total: rows.length,
      totalPages: Math.max(1, Math.ceil(rows.length / pageSize)),
    },
    empty: [],
  };
};

/** In-memory collection with list (filterable), create and patch, shared by the three location resources. */
function collection<T extends Row>(seed: T[], idOf: () => string, filterKey?: keyof T) {
  const rows = [...seed];
  return {
    list: ({ query }: MockRequest) => {
      const filter = filterKey ? query.get(String(filterKey)) : null;
      return page(
        rows.filter((r) => !filter || r[filterKey as keyof T] === filter),
        query,
      );
    },
    create: ({ body }: MockRequest) => {
      const input = withoutReason(body);
      const row = { id: idOf(), active: true, sortOrder: 0, ...input } as unknown as T;
      rows.push(row);
      return { data: row, status: 201 };
    },
    update: ({ params, body }: MockRequest) => {
      const patch = withoutReason(body);
      const index = rows.findIndex((r) => r.id === params['id']);
      const current = rows[index];
      if (!current) return { data: seed[0] as T };
      const next = { ...current, ...patch } as T;
      rows[index] = next;
      return { data: next };
    },
  };
}

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
  );
  const cities = collection(
    [
      { id: AMMAN_ID, countryCode: 'JO', name: name('عمّان', 'Amman'), active: true, sortOrder: 1 },
      { id: IRBID_ID, countryCode: 'JO', name: name('إربد', 'Irbid'), active: true, sortOrder: 2 },
    ],
    nextId,
    'countryCode',
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
    'cityId',
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
