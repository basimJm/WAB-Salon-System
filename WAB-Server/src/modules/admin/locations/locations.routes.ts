import { Router, type RequestHandler } from 'express';
import { ADMIN_LOCATION_ROUTES } from '../../../constants/adminCrud';
import type { AdminCrudService } from '../../../domain/adminCrud/adminCrud.service';
import type { AreaRaw } from '../../../models/area.model';
import type { CityRaw } from '../../../models/city.model';
import type { CountryRaw } from '../../../models/country.model';
import { mount } from '../../../routes/mount';
import { createAdminCrudRouter } from '../crud/crud.routes';
import {
  areasQuery,
  citiesQuery,
  countriesQuery,
  createAreaSchema,
  createCitySchema,
  createCountrySchema,
  updateAreaSchema,
  updateCitySchema,
  updateCountrySchema,
} from './locations.validation';

export interface AdminLocationServices {
  readonly countries: AdminCrudService<CountryRaw>;
  readonly cities: AdminCrudService<CityRaw>;
  readonly areas: AdminCrudService<AreaRaw>;
}

export const createAdminLocationsRouter = (
  services: AdminLocationServices,
  guard: RequestHandler,
): Router => {
  const router = Router();
  mount(
    router,
    ADMIN_LOCATION_ROUTES.countries,
    createAdminCrudRouter({
      service: services.countries,
      guard,
      listQuery: countriesQuery,
      createBody: createCountrySchema,
      updateBody: updateCountrySchema,
    }),
  );
  mount(
    router,
    ADMIN_LOCATION_ROUTES.cities,
    createAdminCrudRouter({
      service: services.cities,
      guard,
      listQuery: citiesQuery,
      createBody: createCitySchema,
      updateBody: updateCitySchema,
    }),
  );
  mount(
    router,
    ADMIN_LOCATION_ROUTES.areas,
    createAdminCrudRouter({
      service: services.areas,
      guard,
      listQuery: areasQuery,
      createBody: createAreaSchema,
      updateBody: updateAreaSchema,
    }),
  );
  return router;
};
