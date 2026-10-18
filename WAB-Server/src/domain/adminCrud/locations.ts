import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import type { AreaRaw } from '../../models/area.model';
import type { CityRaw } from '../../models/city.model';
import type { CountryRaw } from '../../models/country.model';
import type {
  AreasRepository,
  CitiesRepository,
  CountriesRepository,
} from '../../repositories/locations.repository';
import { ValidationError } from '../../utils/errors';
import type { AuditWriter } from '../audit/audit.service';
import { createAdminCrud, type AdminCrudService } from './adminCrud.service';

export interface AdminLocationDeps {
  readonly countries: CountriesRepository;
  readonly cities: CitiesRepository;
  readonly areas: AreasRepository;
  readonly audit: AuditWriter;
}

const missing = (field: string): ValidationError =>
  new ValidationError({
    code: ERROR_CODES.VALIDATION_ERROR,
    details: [
      { field, code: ERROR_CODES.NOT_FOUND, messageKey: errorMessageKey(ERROR_CODES.NOT_FOUND) },
    ],
  });

/** Admin services for countries, cities and areas; a city/area must point at an existing parent. */
export const createAdminLocationServices = ({
  countries,
  cities,
  areas,
  audit,
}: AdminLocationDeps): {
  countries: AdminCrudService<CountryRaw>;
  cities: AdminCrudService<CityRaw>;
  areas: AdminCrudService<AreaRaw>;
} => ({
  countries: createAdminCrud<CountryRaw>({
    name: 'COUNTRY',
    entityType: 'country',
    store: countries,
    audit,
  }),
  cities: createAdminCrud<CityRaw>({
    name: 'CITY',
    entityType: 'city',
    store: cities,
    audit,
    async checkReferences({ countryCode }) {
      if (countryCode !== undefined && !(await countries.exists({ code: countryCode }))) {
        throw missing('countryCode');
      }
    },
  }),
  areas: createAdminCrud<AreaRaw>({
    name: 'AREA',
    entityType: 'area',
    store: areas,
    audit,
    async checkReferences({ cityId }) {
      if (cityId !== undefined && (await cities.findById(String(cityId))) === null) {
        throw missing('cityId');
      }
    },
  }),
});
