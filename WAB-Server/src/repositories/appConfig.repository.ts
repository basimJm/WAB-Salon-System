import type { Model } from 'mongoose';
import type { ClientPlatform } from '../constants/appConfig';
import type { AppKind } from '../constants/enums';
import { AppVersionModel, type AppVersionRaw } from '../models/appVersion.model';
import { ContactInfoModel, type ContactInfoRaw } from '../models/contactInfo.model';
import { MaintenanceModel, type MaintenanceRaw } from '../models/maintenance.model';
import type { Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class AppVersionsRepository extends BaseRepository<AppVersionRaw> {
  constructor(model: Model<AppVersionRaw> = AppVersionModel) {
    super(model);
  }

  findFor(app: AppKind, platform: ClientPlatform): Promise<Entity<AppVersionRaw> | null> {
    return this.findOne({ app, platform });
  }
}

export class MaintenanceRepository extends BaseRepository<MaintenanceRaw> {
  constructor(model: Model<MaintenanceRaw> = MaintenanceModel) {
    super(model);
  }

  findFor(app: AppKind): Promise<Entity<MaintenanceRaw> | null> {
    return this.findOne({ app });
  }
}

export class ContactInfoRepository extends BaseRepository<ContactInfoRaw> {
  constructor(model: Model<ContactInfoRaw> = ContactInfoModel) {
    super(model);
  }

  findFor(app: AppKind): Promise<Entity<ContactInfoRaw> | null> {
    return this.findOne({ app });
  }
}
