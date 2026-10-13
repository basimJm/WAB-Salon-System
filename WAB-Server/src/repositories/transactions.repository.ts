import type { Model } from 'mongoose';
import type { TransactionStatus } from '../constants/enums';
import { TransactionModel, type TransactionRaw } from '../models/transaction.model';
import { isObjectIdString } from '../utils/database/ids';
import { toEntity, type Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class TransactionsRepository extends BaseRepository<TransactionRaw> {
  constructor(model: Model<TransactionRaw> = TransactionModel) {
    super(model);
  }

  /** The attempts of a draft, newest first. */
  async attemptsOf(draftId: string): Promise<Entity<TransactionRaw>[]> {
    if (!isObjectIdString(draftId)) return [];
    return this.findMany({ bookingDraftId: draftId }, { attempt: -1 });
  }

  /** Attempts that have waited for a result since before `cutoff`, oldest first (reconciliation). */
  async pendingBefore(cutoff: Date, limit: number): Promise<Entity<TransactionRaw>[]> {
    const page = await this.findPage(
      { status: 'PENDING', createdAt: { $lt: cutoff } },
      { page: 1, pageSize: limit },
      { createdAt: 1 },
    );
    return page.items;
  }

  findByProviderRef(providerRef: string): Promise<Entity<TransactionRaw> | null> {
    return this.findOne({ providerRef });
  }

  /**
   * Moves an attempt out of `from` in one atomic step (the verify call and the webhook may race);
   * `null` when somebody else settled it first.
   */
  async settle(
    id: string,
    from: TransactionStatus,
    set: Record<string, unknown>,
  ): Promise<Entity<TransactionRaw> | null> {
    if (!isObjectIdString(id)) return null;
    const updated = await this.model
      .findOneAndUpdate({ _id: id, status: from }, { $set: set }, { new: true })
      .lean()
      .exec();
    return updated === null ? null : toEntity<TransactionRaw>(updated);
  }

  /**
   * Reserves a successful, unused, not refunded payment for one booking (so a payment can never
   * back two bookings); `null` when it is not available.
   */
  async claimForBooking(id: string, bookingId: string): Promise<Entity<TransactionRaw> | null> {
    if (!isObjectIdString(id) || !isObjectIdString(bookingId)) return null;
    const claimed = await this.model
      .findOneAndUpdate(
        {
          _id: id,
          status: 'SUCCEEDED',
          bookingId: { $exists: false },
          refundedAt: { $exists: false },
        },
        { $set: { bookingId } },
        { new: true },
      )
      .lean()
      .exec();
    return claimed === null ? null : toEntity<TransactionRaw>(claimed);
  }

  /** Gives the payment back to the pool when the booking it was reserved for could not be saved. */
  async releaseClaim(id: string, bookingId: string): Promise<void> {
    if (!isObjectIdString(id) || !isObjectIdString(bookingId)) return;
    await this.model.findOneAndUpdate({ _id: id, bookingId }, { $unset: { bookingId: 1 } }).exec();
  }

  /** Records that the whole payment was refunded; `false` when it already was. */
  async markRefunded(id: string, at: Date): Promise<boolean> {
    if (!isObjectIdString(id)) return false;
    const updated = await this.model
      .findOneAndUpdate(
        { _id: id, status: 'SUCCEEDED', refundedAt: { $exists: false } },
        { $set: { refundedAt: at } },
      )
      .exec();
    return updated !== null;
  }

  /** Successful payments no booking was ever created for, older than `cutoff` (abandoned checkouts). */
  async orphansBefore(cutoff: Date, limit: number): Promise<Entity<TransactionRaw>[]> {
    const page = await this.findPage(
      {
        status: 'SUCCEEDED',
        bookingId: { $exists: false },
        refundedAt: { $exists: false },
        createdAt: { $lt: cutoff },
      },
      { page: 1, pageSize: limit },
      { createdAt: 1 },
    );
    return page.items;
  }
}
