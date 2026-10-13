import type { Model } from 'mongoose';
import { ReportModel, type ReportRaw } from '../models/report.model';
import { isDuplicateKeyError } from '../utils/database/errors';
import type { Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class ReportsRepository extends BaseRepository<ReportRaw> {
  constructor(model: Model<ReportRaw> = ReportModel) {
    super(model);
  }

  findDaily(date: string): Promise<Entity<ReportRaw> | null> {
    return this.findOne({ kind: 'DAILY', date });
  }

  async findDailyRange(dates: readonly string[]): Promise<Entity<ReportRaw>[]> {
    return this.findMany({ kind: 'DAILY', date: { $in: [...dates] } });
  }

  /** Stores (or refreshes) a day's aggregates; a parallel writer for the same day is harmless. */
  async saveDaily(date: string, data: Record<string, unknown>, at: Date): Promise<void> {
    const existing = await this.findDaily(date);
    if (existing !== null) {
      await this.updateById(existing.id, { data, generatedAt: at });
      return;
    }
    try {
      await this.create({ kind: 'DAILY', date, data, generatedAt: at });
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  }
}
