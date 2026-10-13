import { Types, type Model } from 'mongoose';
import type { AppKind, CustomerStatus, SubjectType } from '../constants/enums';
import { AdminModel, type AdminRaw } from '../models/admin.model';
import { CustomerModel, type CustomerRaw } from '../models/customer.model';
import { InstallationModel, type InstallationRaw } from '../models/installation.model';
import { MemberModel, type MemberRaw } from '../models/member.model';
import { RefreshTokenModel, type RefreshTokenRaw } from '../models/refreshToken.model';
import { isValidId } from './base.repository';
import { toEntity, type Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

/** The device behind a sign-in; optional parts may be `undefined`. */
export type DeviceRecord = Pick<
  InstallationRaw,
  'installationId' | 'platform' | 'appVersion' | 'language'
> & {
  osVersion?: string | undefined;
  deviceModel?: string | undefined;
  fcmToken?: string | undefined;
};

export class CustomersRepository extends BaseRepository<CustomerRaw> {
  constructor(model: Model<CustomerRaw> = CustomerModel) {
    super(model);
  }

  /** `$set` and `$unset` in one update (profile edits, avatar removal); status is not touched here. */
  async patch(
    id: string,
    change: { set: Record<string, unknown>; unset?: readonly string[] },
  ): Promise<Entity<CustomerRaw> | null> {
    if (!isValidId(id)) return null;
    const unset = change.unset ?? [];
    const updated = await this.model
      .findOneAndUpdate(
        { _id: id },
        {
          ...(Object.keys(change.set).length === 0 ? {} : { $set: change.set }),
          ...(unset.length === 0 ? {} : { $unset: Object.fromEntries(unset.map((f) => [f, 1])) }),
        },
        { new: true, runValidators: true },
      )
      .lean()
      .exec();
    return updated === null ? null : toEntity<CustomerRaw>(updated);
  }

  /** The customer with this E.164 number, whatever their status (callers decide on blocked/deleted). */
  findByPhone(e164: string): Promise<Entity<CustomerRaw> | null> {
    return this.findOne({ 'phone.e164': e164 });
  }

  /**
   * Moves a customer between statuses only if it is currently in one of `from` (one atomic
   * update, so two admins or a customer and the purge job cannot both win). `null` = no change.
   */
  async transition(
    id: string,
    from: readonly CustomerStatus[],
    change: { set: Record<string, unknown>; unset?: readonly string[] },
  ): Promise<Entity<CustomerRaw> | null> {
    if (!isValidId(id)) return null;
    const updated = await this.model
      .findOneAndUpdate(
        { _id: id, status: { $in: [...from] } },
        {
          $set: change.set,
          ...(change.unset === undefined || change.unset.length === 0
            ? {}
            : { $unset: Object.fromEntries(change.unset.map((field) => [field, 1])) }),
        },
        { new: true },
      )
      .lean()
      .exec();
    return updated === null ? null : toEntity<CustomerRaw>(updated);
  }

  /** Accounts whose deletion grace period has ended, oldest first. */
  findDueForPurge(now: Date, limit: number): Promise<Entity<CustomerRaw>[]> {
    return this.findMany({ status: 'DELETION_PENDING', deletionScheduledAt: { $lte: now } }).then(
      (found) => found.slice(0, limit),
    );
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

  /** Switches access on or off; `null` when the member does not exist. */
  setActive(id: string, active: boolean): Promise<Entity<MemberRaw> | null> {
    return this.updateById(id, { active });
  }

  /** Removes the bride qualification from every staff profile of a salon (men's salons have none). */
  async clearBrideQualification(salonId: string): Promise<void> {
    if (!isValidId(salonId)) return;
    await this.model
      .updateMany(
        { salonId, 'staff.brideQualified': true },
        { $set: { 'staff.brideQualified': false } },
      )
      .exec();
  }

  /** `$set` and `$unset` in one update (e.g. removing the photo). */
  async patch(
    id: string,
    change: { set: Record<string, unknown>; unset?: readonly string[] },
  ): Promise<Entity<MemberRaw> | null> {
    if (!isValidId(id)) return null;
    const unset = change.unset ?? [];
    const updated = await this.model
      .findOneAndUpdate(
        { _id: id },
        {
          $set: change.set,
          ...(unset.length === 0 ? {} : { $unset: Object.fromEntries(unset.map((f) => [f, 1])) }),
        },
        { new: true, runValidators: true },
      )
      .lean()
      .exec();
    return updated === null ? null : toEntity<MemberRaw>(updated);
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

  /** Creates or updates the device record and links it to the customer that just signed in. */
  linkCustomer(customerId: string, device: DeviceRecord, now: Date): Promise<void> {
    return this.link('CUSTOMER', { customerId }, device, now);
  }

  /** Creates or updates the device record and links it to the member that just signed in. */
  linkMember(memberId: string, device: DeviceRecord, now: Date): Promise<void> {
    return this.link('MERCHANT', { memberId }, device, now);
  }

  /** Logout: the device stays known (analytics, guest push) but is no longer an account's. */
  unlinkCustomer(installationId: string): Promise<void> {
    return this.unlink('CUSTOMER', installationId, 'customerId');
  }

  /** Account deletion: no device keeps pointing at the customer (their push stops). */
  async detachCustomer(customerId: string): Promise<void> {
    if (!isValidId(customerId)) return;
    await this.model
      .updateMany({ customerId: new Types.ObjectId(customerId) }, { $unset: { customerId: 1 } })
      .exec();
  }

  /** Member deactivation: their devices stop receiving the salon's requests. */
  async detachMember(memberId: string): Promise<void> {
    if (!isValidId(memberId)) return;
    await this.model
      .updateMany({ memberId: new Types.ObjectId(memberId) }, { $unset: { memberId: 1 } })
      .exec();
  }

  unlinkMember(installationId: string): Promise<void> {
    return this.unlink('MERCHANT', installationId, 'memberId');
  }

  /** Creates or updates a device record without tying it to an account (guest installs). */
  registerDevice(app: AppKind, device: DeviceRecord, now: Date): Promise<void> {
    return this.link(app, undefined, device, now);
  }

  /**
   * A push token belongs to exactly one installation: when an app reports a token, every other
   * installation that still holds it (an old install, a reset id) loses it.
   */
  async releaseFcmToken(fcmToken: string, exceptInstallationId: string): Promise<void> {
    await this.model
      .updateMany(
        { fcmToken, installationId: { $ne: exceptInstallationId } },
        { $unset: { fcmToken: 1, fcmTokenUpdatedAt: 1 } },
      )
      .exec();
  }

  private async link(
    app: AppKind,
    owner: { customerId: string } | { memberId: string } | undefined,
    device: DeviceRecord,
    now: Date,
  ): Promise<void> {
    const { installationId, fcmToken, ...optional } = device;
    // Absent optional fields keep what is stored; `undefined` must never reach the update.
    const rest = Object.fromEntries(
      Object.entries(optional).filter(([, value]) => value !== undefined),
    );
    const [field, id] = owner === undefined ? [] : (Object.entries(owner)[0] ?? []);
    await this.model
      .findOneAndUpdate(
        { app, installationId },
        {
          $set: {
            ...rest,
            ...(fcmToken === undefined ? {} : { fcmToken, fcmTokenUpdatedAt: now }),
            ...(field === undefined ? {} : { [field]: new Types.ObjectId(String(id)) }),
            lastSeenAt: now,
          },
        },
        { upsert: true, runValidators: true },
      )
      .exec();
  }

  private async unlink(
    app: AppKind,
    installationId: string,
    field: 'customerId' | 'memberId',
  ): Promise<void> {
    await this.model.findOneAndUpdate({ app, installationId }, { $unset: { [field]: 1 } }).exec();
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

  /**
   * Counts a wrong password (atomically) and, when it reaches `maxFailures`, locks the account
   * until `now + lockMs` and restarts the count. Returns the lock end, or `null` when not locked.
   */
  async recordFailedLogin(
    id: string,
    maxFailures: number,
    lockMs: number,
    now: Date,
  ): Promise<Date | null> {
    if (!isValidId(id)) return null;
    const counted = await this.model
      .findOneAndUpdate({ _id: id }, { $inc: { failedLoginCount: 1 } }, { new: true })
      .lean()
      .exec();
    if (counted === null || counted.failedLoginCount < maxFailures) return null;
    const lockedUntil = new Date(now.getTime() + lockMs);
    await this.updateById(id, { lockedUntil, failedLoginCount: 0 });
    return lockedUntil;
  }

  /** A completed sign-in: clears the failure count and any lock, records when and from where. */
  async recordLogin(id: string, ip: string, now: Date): Promise<Entity<AdminRaw> | null> {
    if (!isValidId(id)) return null;
    const updated = await this.model
      .findOneAndUpdate(
        { _id: id },
        {
          $set: { failedLoginCount: 0, lastLoginAt: now, lastLoginIp: ip },
          $unset: { lockedUntil: 1 },
        },
        { new: true },
      )
      .lean()
      .exec();
    return updated === null ? null : toEntity<AdminRaw>(updated);
  }
}
