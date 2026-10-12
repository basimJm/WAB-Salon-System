import { Types } from 'mongoose';
import {
  SEED_AREAS,
  SEED_CITIES,
  SEED_COUNTRIES,
  type SeedArea,
  type SeedCity,
  type SeedCountry,
} from '../constants/referenceData';
import type {
  AreasRepository,
  CitiesRepository,
  CountriesRepository,
} from '../repositories/locations.repository';

export interface SeedRepositories {
  readonly countries: CountriesRepository;
  readonly cities: CitiesRepository;
  readonly areas: AreasRepository;
}

export interface SeedData {
  readonly countries: readonly SeedCountry[];
  readonly cities: readonly SeedCity[];
  readonly areas: readonly SeedArea[];
}

export const DEFAULT_SEED_DATA: SeedData = {
  countries: SEED_COUNTRIES,
  cities: SEED_CITIES,
  areas: SEED_AREAS,
};

export interface SeedCount {
  created: number;
  existing: number;
}

export interface SeedResult {
  readonly countries: SeedCount;
  readonly cities: SeedCount;
  readonly areas: SeedCount;
}

const tally = (count: SeedCount, created: boolean): void => {
  if (created) count.created += 1;
  else count.existing += 1;
};

/**
 * Inserts the starter countries, cities and areas that are missing. It never changes a record
 * that exists, so an admin's edits survive and running it again creates nothing.
 */
export const seedReferenceData = async (
  { countries, cities, areas }: SeedRepositories,
  data: SeedData = DEFAULT_SEED_DATA,
): Promise<SeedResult> => {
  const result: SeedResult = {
    countries: { created: 0, existing: 0 },
    cities: { created: 0, existing: 0 },
    areas: { created: 0, existing: 0 },
  };

  for (const country of data.countries) {
    const { created } = await countries.insertIfMissing(
      { code: country.code },
      { ...country, active: true },
    );
    tally(result.countries, created);
  }

  const cityIds = new Map<string, string>();
  for (const city of data.cities) {
    const { entity, created } = await cities.insertIfMissing(
      { countryCode: city.countryCode, 'name.en': city.name.en },
      { ...city, active: true },
    );
    cityIds.set(city.name.en, entity.id);
    tally(result.cities, created);
  }

  for (const area of data.areas) {
    const cityId = cityIds.get(area.city);
    if (cityId === undefined) throw new Error(`seed area "${area.name.en}" names an unknown city`);
    const { created } = await areas.insertIfMissing(
      { cityId, 'name.en': area.name.en },
      {
        cityId: new Types.ObjectId(cityId),
        name: area.name,
        sortOrder: area.sortOrder,
        active: true,
      },
    );
    tally(result.areas, created);
  }
  return result;
};
