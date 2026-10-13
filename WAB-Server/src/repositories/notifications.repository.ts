import type { Model } from 'mongoose';
import type { NotificationRecipientType } from '../constants/enums';
import { NotificationModel, type NotificationRaw } from '../models/notification.model';
import { isObjectIdString } from '../utils/database/ids';
import { BaseRepository } from './base.repository';

export class NotificationsRepository extends BaseRepository<NotificationRaw> {
  constructor(model: Model<NotificationRaw> = NotificationModel) {
    super(model);
  }

  /** Unread notifications of one account (the bell badge). */
  countUnread(recipientType: NotificationRecipientType, recipientId: string): Promise<number> {
    if (!isObjectIdString(recipientId)) return Promise.resolve(0);
    return this.model
      .countDocuments({ recipientType, recipientId, readAt: { $exists: false } })
      .exec();
  }

  /** Remembers how the push went (the in-app copy is stored before the push is attempted). */
  async recordPush(id: string, pushSent: boolean, pushResult: string): Promise<void> {
    if (!isObjectIdString(id)) return;
    await this.model.findOneAndUpdate({ _id: id }, { $set: { pushSent, pushResult } }).exec();
  }
}
