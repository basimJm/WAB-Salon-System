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
