import type { Model } from 'mongoose';
import { AlertModel, type AlertRaw } from '../models/alert.model';
import { isDuplicateKeyError } from '../utils/database/errors';
import type { Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class AlertsRepository extends BaseRepository<AlertRaw> {
  constructor(model: Model<AlertRaw> = AlertModel) {
    super(model);
  }

  /** Stores the alert unless one with the same `dedupeKey` exists; `null` for a repeat. */
  async createOnce(data: Partial<AlertRaw>): Promise<Entity<AlertRaw> | null> {
    try {
      return await this.create(data);
    } catch (error) {
      if (isDuplicateKeyError(error)) return null;
      throw error;
    }
  }
}
