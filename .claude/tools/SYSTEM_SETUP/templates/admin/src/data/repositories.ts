import type { AlertsRepository } from '@/domain/alerts/alerts';
import type { AuditRepository } from '@/domain/audit/audit';
import type { AuthRepository } from '@/domain/auth/auth';
import type { ExportsRepository } from '@/domain/exports/exports';
import type { ItemsRepository } from '@/domain/items/items';
import type { ProfileRepository } from '@/domain/profile/profile';
import type { SettingsRepository } from '@/domain/settings/settings';
import type { AppConfig } from '@/infrastructure/config/appConfig';
import { RemoteAlertsRepository } from './alerts/RemoteAlertsRepository';
import type { ApiClient } from './api/ApiClient';
import { RemoteAuditRepository } from './audit/RemoteAuditRepository';
import { RemoteAuthRepository } from './auth/RemoteAuthRepository';
import { RemoteExportsRepository } from './exports/RemoteExportsRepository';
import { RemoteItemsRepository } from './items/RemoteItemsRepository';
import { RemoteProfileRepository } from './profile/RemoteProfileRepository';
import { RemoteSettingsRepository } from './settings/RemoteSettingsRepository';

/** Every data source a screen may use; a new module adds its repository here (and in `tests/helpers/render.tsx`). */
export interface Repositories {
  readonly auth: AuthRepository;
  readonly settings: SettingsRepository;
  readonly items: ItemsRepository;
  readonly exports: ExportsRepository;
  readonly audit: AuditRepository;
  readonly alerts: AlertsRepository;
  readonly profile: ProfileRepository;
}

/** Real vs mock is decided by config only. Mock code is dead-code-eliminated when `__ALLOW_MOCK__` is false. */
export async function createRepositories(config: AppConfig, api: ApiClient): Promise<Repositories> {
  const shared = {
    settings: new RemoteSettingsRepository(api),
    items: new RemoteItemsRepository(api),
    exports: new RemoteExportsRepository(api),
    audit: new RemoteAuditRepository(api),
    alerts: new RemoteAlertsRepository(api),
    profile: new RemoteProfileRepository(api),
  };
  if (__ALLOW_MOCK__ && config.dataSource === 'mock') {
    const { MockAuthRepository } = await import('./auth/MockAuthRepository');
    return { auth: new MockAuthRepository(), ...shared };
  }
  return { auth: new RemoteAuthRepository(api), ...shared };
}
