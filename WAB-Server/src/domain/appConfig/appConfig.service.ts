import type { ClientPlatform, VersionStatus } from '../../constants/appConfig';
import type { AppKind, Language } from '../../constants/enums';
import type {
  AppVersionsRepository,
  ContactInfoRepository,
  MaintenanceRepository,
} from '../../repositories/appConfig.repository';
import { compareVersions } from '../../utils/version';
import type { SettingsService } from '../settings';

export interface VersionPolicy {
  readonly latest: string;
  readonly minSupported: string;
  readonly optionalUpdate: boolean;
}

/** Older than `minSupported` must update; older than `latest` may update when the policy offers it. */
export const evaluateVersion = (version: string, policy: VersionPolicy | null): VersionStatus => {
  if (policy === null) return 'OK';
  if (compareVersions(version, policy.minSupported) < 0) return 'UPDATE_REQUIRED';
  if (policy.optionalUpdate && compareVersions(version, policy.latest) < 0) {
    return 'UPDATE_AVAILABLE';
  }
  return 'OK';
};

export interface AppConfig {
  readonly update: {
    readonly status: VersionStatus;
    readonly latest: string | null;
    readonly minSupported: string | null;
    readonly storeUrl: string | null;
  };
  readonly maintenance: { readonly enabled: boolean; readonly message: string | null };
  readonly nearbyRadiusKm: number;
  readonly otp: { readonly length: number; readonly resendAfterSeconds: number };
  readonly contact: {
    readonly phone: string;
    readonly whatsapp: string;
    readonly email: string;
  } | null;
}

export interface AppConfigQuery {
  readonly app: AppKind;
  readonly platform: ClientPlatform;
  readonly version: string;
  readonly language: Language;
}

export interface AppConfigService {
  get(query: AppConfigQuery): Promise<AppConfig>;
}

export interface AppConfigServiceDeps {
  readonly appVersions: Pick<AppVersionsRepository, 'findFor'>;
  readonly maintenance: Pick<MaintenanceRepository, 'findFor'>;
  readonly contactInfo: Pick<ContactInfoRepository, 'findFor'>;
  readonly settings: Pick<SettingsService, 'get'>;
}

export const createAppConfigService = ({
  appVersions,
  maintenance,
  contactInfo,
  settings,
}: AppConfigServiceDeps): AppConfigService => ({
  async get({ app, platform, version, language }) {
    const [policy, maintenanceRow, contact, nearbyRadiusKm, length, resendAfterSeconds] =
      await Promise.all([
        appVersions.findFor(app, platform),
        maintenance.findFor(app),
        contactInfo.findFor(app),
        settings.get('discovery.nearbyRadiusKm'),
        settings.get('otp.length'),
        settings.get('otp.resendAfterSec'),
      ]);
    return {
      update: {
        status: evaluateVersion(version, policy),
        latest: policy?.latest ?? null,
        minSupported: policy?.minSupported ?? null,
        storeUrl: policy?.storeUrl ?? null,
      },
      maintenance: {
        enabled: maintenanceRow?.enabled ?? false,
        message: maintenanceRow?.enabled === true ? maintenanceRow.message[language] : null,
      },
      nearbyRadiusKm,
      otp: { length, resendAfterSeconds },
      contact:
        contact === null
          ? null
          : { phone: contact.phone, whatsapp: contact.whatsapp, email: contact.email },
    };
  },
});
