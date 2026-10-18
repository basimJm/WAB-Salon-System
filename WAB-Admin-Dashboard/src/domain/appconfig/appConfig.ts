import type { LocalizedName } from '@/domain/locations/locations';
import type { AdminResource } from '@/domain/shared/resource';

export const APP_KINDS = ['CUSTOMER', 'MERCHANT'] as const;
export const PLATFORMS = ['ANDROID', 'IOS'] as const;
export type AppKind = (typeof APP_KINDS)[number];
export type Platform = (typeof PLATFORMS)[number];

export interface AppVersion {
  readonly id: string;
  readonly app: AppKind;
  readonly platform: Platform;
  readonly latest: string;
  /** Apps older than this are forced to update. */
  readonly minSupported: string;
  readonly optionalUpdate: boolean;
  readonly storeUrl: string;
}
export interface AppVersionInput {
  app: AppKind;
  platform: Platform;
  latest: string;
  minSupported: string;
  optionalUpdate?: boolean;
  storeUrl: string;
}
export type AppVersionPatch = Partial<Omit<AppVersionInput, 'app' | 'platform'>>;

export interface Maintenance {
  readonly id: string;
  readonly app: AppKind;
  readonly enabled: boolean;
  readonly message: LocalizedName;
}
export interface MaintenanceInput {
  app: AppKind;
  enabled?: boolean;
  message: LocalizedName;
}
export type MaintenancePatch = Partial<Omit<MaintenanceInput, 'app'>>;

export interface AppConfigRepository {
  readonly versions: AdminResource<
    AppVersion,
    AppVersionInput,
    AppVersionPatch,
    { app?: AppKind; platform?: Platform }
  >;
  readonly maintenance: AdminResource<
    Maintenance,
    MaintenanceInput,
    MaintenancePatch,
    { app?: AppKind }
  >;
}
