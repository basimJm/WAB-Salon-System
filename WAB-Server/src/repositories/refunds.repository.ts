import type { Model } from 'mongoose';
import type { RefundStatus } from '../constants/providers';
import { RefundModel, type RefundRaw } from '../models/refund.model';
import { isObjectIdString } from '../utils/database/ids';
import { toEntity, type Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class RefundsRepository extends BaseRepository<RefundRaw> {
  constructor(model: Model<RefundRaw> = RefundModel) {
    super(model);
  }

  /** Total of the refunds of a payment that are done or on their way (they count against its amount). */
  async committedFor(transactionId: string): Promise<number> {
    const rows = await this.findMany({
      transactionId,
      status: { $in: ['REFUND_PENDING', 'REFUNDED'] },
    });
    return rows.reduce((sum, r) => sum + r.amount, 0);
  }

  /** Pending refunds whose retry time has come (or never started), oldest first. */
  async dueForAttempt(at: Date, limit: number): Promise<Entity<RefundRaw>[]> {
    const page = await this.findPage(
      {
        status: 'REFUND_PENDING',
        $or: [{ nextAttemptAt: { $exists: false } }, { nextAttemptAt: { $lte: at } }],
      },
      { page: 1, pageSize: limit },
      { createdAt: 1 },
    );
    return page.items;
  }

  /** Pending refunds older than `cutoff`, for the "refund delayed" alert. */
  async pendingBefore(cutoff: Date, limit: number): Promise<Entity<RefundRaw>[]> {
    const page = await this.findPage(
      { status: 'REFUND_PENDING', createdAt: { $lt: cutoff } },
      { page: 1, pageSize: limit },
      { createdAt: 1 },
    );
    return page.items;
  }

  /** Atomic change out of `from` (the retry job and an admin may race); `null` when it moved already. */
  async transition(
    id: string,
    from: RefundStatus | readonly RefundStatus[],
    set: Record<string, unknown>,
    unset: readonly string[] = [],
  ): Promise<Entity<RefundRaw> | null> {
    if (!isObjectIdString(id)) return null;
    const statuses = Array.isArray(from) ? [...(from as RefundStatus[])] : [from as RefundStatus];
    const updated = await this.model
      .findOneAndUpdate(
        { _id: id, status: { $in: statuses } },
        {
          $set: set,
          ...(unset.length === 0 ? {} : { $unset: Object.fromEntries(unset.map((f) => [f, 1])) }),
        },
        { new: true },
      )
      .lean()
      .exec();
    return updated === null ? null : toEntity<RefundRaw>(updated);
  }
}
