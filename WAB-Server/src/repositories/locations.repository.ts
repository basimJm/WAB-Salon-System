import type { Model } from 'mongoose';
import { AreaModel, type AreaRaw } from '../models/area.model';
import { CityModel, type CityRaw } from '../models/city.model';
import { CountryModel, type CountryRaw } from '../models/country.model';
import { BaseRepository } from './base.repository';

export class CountriesRepository extends BaseRepository<CountryRaw> {
  constructor(model: Model<CountryRaw> = CountryModel) {
    super(model);
  }
}

export class CitiesRepository extends BaseRepository<CityRaw> {
  constructor(model: Model<CityRaw> = CityModel) {
    super(model);
  }
}

export class AreasRepository extends BaseRepository<AreaRaw> {
  constructor(model: Model<AreaRaw> = AreaModel) {
    super(model);
  }
}
