import { AreaModel } from './area.model';
import { CatalogServiceModel } from './catalogService.model';
import { CityModel } from './city.model';
import { CountryModel } from './country.model';
import { SettingModel } from './setting.model';

/**
 * Every Mongoose model of the server. Start-up creates their indexes (SRV-017a), so a new model
 * must be added here; `tests/indexes.test.ts` fails when one is missing.
 */
export const ALL_MODELS = [
  SettingModel,
  CountryModel,
  CityModel,
  AreaModel,
  CatalogServiceModel,
] as const;
