import { AdminModel } from './admin.model';
import { AppVersionModel } from './appVersion.model';
import { ContactInfoModel } from './contactInfo.model';
import { ContentPageModel } from './contentPage.model';
import { FaqModel } from './faq.model';
import { MaintenanceModel } from './maintenance.model';
import { AreaModel } from './area.model';
import { BannerModel } from './banner.model';
import { SalonModel } from './salon.model';
import { SubscriptionModel } from './subscription.model';
import { UploadModel } from './upload.model';
import { AuditLogModel } from './auditLog.model';
import { CatalogServiceModel } from './catalogService.model';
import { CityModel } from './city.model';
import { CountryModel } from './country.model';
import { CustomerModel } from './customer.model';
import { InstallationModel } from './installation.model';
import { MemberModel } from './member.model';
import { RefreshTokenModel } from './refreshToken.model';
import { ServerEventModel } from './serverEvent.model';
import { SettingModel } from './setting.model';

/**
 * Every Mongoose model of the server. Start-up creates their indexes (SRV-017a), so a new model
 * must be added here; `tests/indexes.test.ts` fails when one is missing.
 */
export const ALL_MODELS = [
  SettingModel,
  CountryModel,
  CityModel,
  AreaModel,
  CatalogServiceModel,
  AuditLogModel,
  ServerEventModel,
  CustomerModel,
  MemberModel,
  InstallationModel,
  RefreshTokenModel,
  AdminModel,
  AppVersionModel,
  MaintenanceModel,
  BannerModel,
  SalonModel,
  UploadModel,
  SubscriptionModel,
  ContactInfoModel,
  ContentPageModel,
  FaqModel,
] as const;
