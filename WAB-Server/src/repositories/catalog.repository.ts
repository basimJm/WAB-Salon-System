import type { Model } from 'mongoose';
import { CatalogServiceModel, type CatalogServiceRaw } from '../models/catalogService.model';
import { BaseRepository } from './base.repository';

export class CatalogServicesRepository extends BaseRepository<CatalogServiceRaw> {
  constructor(model: Model<CatalogServiceRaw> = CatalogServiceModel) {
    super(model);
  }
}
