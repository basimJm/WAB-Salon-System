import { LOCATION_SORT } from '../../constants/locations';
import type { Language } from '../../constants/enums';
import type {
  AreasRepository,
  CitiesRepository,
  CountriesRepository,
} from '../../repositories/locations.repository';
import type { StorageProvider } from '../../providers/storage';
import type { Logger } from '../../utils/logger';
import { createSafePublicUrl } from '../uploads/safePublicUrl';

export interface PublicCountry {
  readonly code: string;
  readonly name: string;
  readonly dialCode: string;
  readonly flagUrl: string;
  readonly phoneRegex: string;
}
export interface PublicCity {
  readonly id: string;
  readonly name: string;
}
export interface PublicArea {
  readonly id: string;
  readonly name: string;
}

export interface LocationsService {
  countries(language: Language): Promise<PublicCountry[]>;
  cities(countryCode: string, language: Language): Promise<PublicCity[]>;
  areas(cityId: string, language: Language): Promise<PublicArea[]>;
}

export interface LocationsServiceDeps {
  readonly countries: Pick<CountriesRepository, 'findMany'>;
  readonly cities: Pick<CitiesRepository, 'findMany'>;
  readonly areas: Pick<AreasRepository, 'findMany'>;
  readonly storage: Pick<StorageProvider, 'getPublicUrl'>;
  readonly logger?: Logger;
}

/**
 * Active entries only, in the admin-defined order, names in the caller's language. A country whose
 * flag key is invalid stays listed with an empty `flagUrl`: phone sign-in needs it more than the flag.
 */
export const createLocationsService = ({
  countries,
  cities,
  areas,
  storage,
  logger,
}: LocationsServiceDeps): LocationsService => {
  const publicUrl = createSafePublicUrl(storage, logger);
  return {
    async countries(language) {
      const rows = await countries.findMany({ active: true }, LOCATION_SORT);
      return rows.map((c) => ({
        code: c.code,
        name: c.name[language],
        dialCode: c.dialCode,
        flagUrl: publicUrl(c.flagKey, { country: c.code }) ?? '',
        phoneRegex: c.phoneRegex,
      }));
    },
    async cities(countryCode, language) {
      const rows = await cities.findMany({ countryCode, active: true }, LOCATION_SORT);
      return rows.map((c) => ({ id: c.id, name: c.name[language] }));
    },
    async areas(cityId, language) {
      const rows = await areas.findMany({ cityId, active: true }, LOCATION_SORT);
      return rows.map((a) => ({ id: a.id, name: a.name[language] }));
    },
  };
};
