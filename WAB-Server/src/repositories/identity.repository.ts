import { Types, type Model } from 'mongoose';
import type { AppKind, SubjectType } from '../constants/enums';
import { AdminModel, type AdminRaw } from '../models/admin.model';
import { CustomerModel, type CustomerRaw } from '../models/customer.model';
import { InstallationModel, type InstallationRaw } from '../models/installation.model';
import { MemberModel, type MemberRaw } from '../models/member.model';
import { RefreshTokenModel, type RefreshTokenRaw } from '../models/refreshToken.model';
import { isValidId } from './base.repository';
import { toEntity, type Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class CustomersRepository extends BaseRepository<CustomerRaw> {
  constructor(model: Model<CustomerRaw> = CustomerModel) {
    super(model);
  }

  /** The customer with this E.164 number, whatever their status (callers decide on blocked/deleted). */
  findByPhone(e164: string): Promise<Entity<CustomerRaw> | null> {
    return this.findOne({ 'phone.e164': e164 });
  }

  /** Ends the deletion grace period: the account is active again and the schedule is cleared. */
  async restoreFromDeletion(id: string, now: Date): Promise<Entity<CustomerRaw> | null> {
    if (!isValidId(id)) return null;
    const restored = await this.model
      .findOneAndUpdate(
        { _id: id, status: 'DELETION_PENDING' },
        {
          $set: { status: 'ACTIVE', lastActiveAt: now },
          $unset: { deletionRequestedAt: 1, deletionScheduledAt: 1 },
        },
        { new: true },
      )
      .lean()
      .exec();
    return restored === null ? null : toEntity<CustomerRaw>(restored);
  }
}

export class MembersRepository extends BaseRepository<MemberRaw> {
  constructor(model: Model<MemberRaw> = MemberModel) {
    super(model);
  }

  findByPhone(e164: string): Promise<Entity<MemberRaw> | null> {
    return this.findOne({ phone: e164 });
  }
}

export class InstallationsRepository extends BaseRepository<InstallationRaw> {
  constructor(model: Model<InstallationRaw> = InstallationModel) {
    super(model);
  }

  findByInstallation(
    app: AppKind,
    installationId: string,
  ): Promise<Entity<InstallationRaw> | null> {
    return this.findOne({ app, installationId });
  }

  /** Creates or updates the device record and links it to the account that just signed in. */
  async linkCustomer(
    customerId: string,
    device: Pick<InstallationRaw, 'installationId' | 'platform' | 'appVersion' | 'language'> & {
      osVersion?: string | undefined;
      deviceModel?: string | undefined;
      fcmToken?: string | undefined;
    },
    now: Date,
  ): Promise<void> {
    const { installationId, fcmToken, ...optional } = device;
    // Absent optional fields keep what is stored; `undefined` must never reach the update.
    const rest = Object.fromEntries(
      Object.entries(optional).filter(([, value]) => value !== undefined),
    );
    await this.model
      .findOneAndUpdate(
        { app: 'CUSTOMER', installationId },
        {
          $set: {
            ...rest,
            ...(fcmToken === undefined ? {} : { fcmToken, fcmTokenUpdatedAt: now }),
            customerId: new Types.ObjectId(customerId),
            lastSeenAt: now,
          },
        },
        { upsert: true, runValidators: true },
      )
      .exec();
  }

  /** Logout: the device stays known (analytics, guest push) but is no longer an account's. */
  async unlinkCustomer(installationId: string): Promise<void> {
    await this.model
      .findOneAndUpdate({ app: 'CUSTOMER', installationId }, { $unset: { customerId: 1 } })
      .exec();
  }
}

export class RefreshTokensRepository extends BaseRepository<RefreshTokenRaw> {
  constructor(model: Model<RefreshTokenRaw> = RefreshTokenModel) {
    super(model);
  }

  /** Looks a token up by the SHA-256 of the raw value; the raw token never reaches this layer. */
  findByTokenHash(tokenHash: string): Promise<Entity<RefreshTokenRaw> | null> {
    return this.findOne({ tokenHash });
  }

  /** Revokes the token only if it is still active; `null` means someone else got there first. */
  async revokeIfActive(
    id: string,
    reason: string,
    now: Date,
  ): Promise<Entity<RefreshTokenRaw> | null> {
    if (!isValidId(id)) return null;
    const updated = await this.model
      .findOneAndUpdate(
        { _id: id, revokedAt: { $exists: false } },
        { $set: { revokedAt: now, revokedReason: reason } },
        { new: true },
      )
      .lean()
      .exec();
    return updated === null ? null : toEntity<RefreshTokenRaw>(updated);
  }

  /** Links a rotated token to the one that replaced it. */
  async markReplaced(id: string, replacedBy: string): Promise<void> {
    await this.updateById(id, { replacedBy: new Types.ObjectId(replacedBy) });
  }

  /** Revokes every still-active token of one rotation chain; returns how many. */
  async revokeFamily(familyId: string, reason: string, now: Date): Promise<number> {
    return this.revokeActive({ familyId }, reason, now);
  }

  /** Revokes every still-active token of one account (logout everywhere, block, deactivation). */
  async revokeAllForSubject(
    subjectType: SubjectType,
    subjectId: string,
    reason: string,
    now: Date,
  ): Promise<number> {
    if (!isValidId(subjectId)) return 0;
    return this.revokeActive({ subjectType, subjectId }, reason, now);
  }

  private async revokeActive(
    filter: Record<string, unknown>,
    reason: string,
    now: Date,
  ): Promise<number> {
    const result = await this.model
      .updateMany({ ...filter, revokedAt: { $exists: false } } as never, {
        $set: { revokedAt: now, revokedReason: reason },
      })
      .exec();
    return result.modifiedCount;
  }
}

export class AdminsRepository extends BaseRepository<AdminRaw> {
  constructor(model: Model<AdminRaw> = AdminModel) {
    super(model);
  }

  findByEmail(email: string): Promise<Entity<AdminRaw> | null> {
    return this.findOne({ email: email.trim().toLowerCase() });
  }
}
