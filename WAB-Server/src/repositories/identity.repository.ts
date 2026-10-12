import type { Model } from 'mongoose';
import type { AppKind } from '../constants/enums';
import { AdminModel, type AdminRaw } from '../models/admin.model';
import { CustomerModel, type CustomerRaw } from '../models/customer.model';
import { InstallationModel, type InstallationRaw } from '../models/installation.model';
import { MemberModel, type MemberRaw } from '../models/member.model';
import { RefreshTokenModel, type RefreshTokenRaw } from '../models/refreshToken.model';
import type { Entity } from '../utils/database/plain';
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
}

export class AdminsRepository extends BaseRepository<AdminRaw> {
  constructor(model: Model<AdminRaw> = AdminModel) {
    super(model);
  }

  findByEmail(email: string): Promise<Entity<AdminRaw> | null> {
    return this.findOne({ email: email.trim().toLowerCase() });
  }
}
