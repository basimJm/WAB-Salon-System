import type { Page, PageQuery } from '@/domain/shared/page';

export interface LocalizedName {
  readonly ar: string;
  readonly en: string;
}

interface LocationBase {
  readonly id: string;
  readonly name: LocalizedName;
  readonly active: boolean;
  readonly sortOrder: number;
}

export interface Country extends LocationBase {
  readonly code: string;
  readonly dialCode: string;
  readonly flagKey: string;
  readonly phoneRegex: string;
}
export interface City extends LocationBase {
  readonly countryCode: string;
}
export interface Area extends LocationBase {
  readonly cityId: string;
}

interface CommonInput {
  name: LocalizedName;
  active?: boolean;
  sortOrder?: number;
}
export interface CountryInput extends CommonInput {
  code: string;
  dialCode: string;
  flagKey: string;
  phoneRegex: string;
}
export interface CityInput extends CommonInput {
  countryCode: string;
}
export interface AreaInput extends CommonInput {
  cityId: string;
}
/** Locations are never deleted: switch them off with `active: false`. */
export type CountryPatch = Partial<Omit<CountryInput, 'code'>>;
export type CityPatch = Partial<Omit<CityInput, 'countryCode'>>;
export type AreaPatch = Partial<Omit<AreaInput, 'cityId'>>;

/** The three resources share one shape: list (paginated), create and update (both audited with a reason). */
export interface LocationResource<T, TInput, TPatch, TFilter = object> {
  list(query: PageQuery & TFilter): Promise<Page<T>>;
  create(input: TInput, reason: string): Promise<T>;
  update(id: string, patch: TPatch, reason: string): Promise<T>;
}

export interface LocationsRepository {
  readonly countries: LocationResource<Country, CountryInput, CountryPatch>;
  readonly cities: LocationResource<City, CityInput, CityPatch, { countryCode?: string }>;
  readonly areas: LocationResource<Area, AreaInput, AreaPatch, { cityId?: string }>;
}
