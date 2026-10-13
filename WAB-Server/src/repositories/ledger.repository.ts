import type { Model } from 'mongoose';
import type { LedgerType } from '../constants/enums';
import { LedgerEntryModel, type LedgerEntryRaw } from '../models/ledgerEntry.model';
import { isObjectIdString } from '../utils/database/ids';
import { toEntity, type Entity } from '../utils/database/plain';
import { AppendOnlyRepository } from './appendOnly.repository';

export class LedgerRepository extends AppendOnlyRepository<LedgerEntryRaw> {
  constructor(model: Model<LedgerEntryRaw> = LedgerEntryModel) {
    super(model);
  }

  /** Σ amount of a salon's entries (optionally one type), in signed integer fils. */
  async sum(salonId: string, type?: LedgerType): Promise<number> {
    if (!isObjectIdString(salonId)) return 0;
    const [row] = await this.model
      .aggregate<{ sum: number }>([
        { $match: { salonId, ...(type === undefined ? {} : { type }) } },
        { $group: { _id: null, sum: { $sum: '$amount' } } },
      ])
      .exec();
    return row?.sum ?? 0;
  }

  /** The entry of this kind for a payment / refund, if it was booked already. */
  async findFor(
    key: { transactionId: string; type: LedgerType } | { refundId: string },
  ): Promise<Entity<LedgerEntryRaw> | null> {
    const filter = 'refundId' in key ? { refundId: key.refundId, type: 'REFUND' } : { ...key };
    const found = await this.model
      .findOne(filter as never)
      .lean()
      .exec();
    return found === null ? null : toEntity<LedgerEntryRaw>(found);
  }
}
