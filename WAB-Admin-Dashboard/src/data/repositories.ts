import type { AppConfigRepository } from '@/domain/appconfig/appConfig';
import type { AuthRepository } from '@/domain/auth/auth';
import type { LocationsRepository } from '@/domain/locations/locations';
import type { SettingsRepository } from '@/domain/settings/settings';
import type { AppConfig } from '@/infrastructure/config/appConfig';
import type { ApiClient } from './api/ApiClient';
import { RemoteAppConfigRepository } from './appconfig/RemoteAppConfigRepository';
import { RemoteAuthRepository } from './auth/RemoteAuthRepository';
import { RemoteLocationsRepository } from './locations/RemoteLocationsRepository';
import { RemoteSettingsRepository } from './settings/RemoteSettingsRepository';

export interface Repositories {
  readonly auth: AuthRepository;
  readonly settings: SettingsRepository;
  readonly locations: LocationsRepository;
  readonly appConfig: AppConfigRepository;
}

/** Real vs mock is decided by config only. Mock code is dead-code-eliminated when `__ALLOW_MOCK__` is false. */
export async function createRepositories(config: AppConfig, api: ApiClient): Promise<Repositories> {
  const settings = new RemoteSettingsRepository(api);
  const locations = new RemoteLocationsRepository(api);
  const appConfig = new RemoteAppConfigRepository(api);
  if (__ALLOW_MOCK__ && config.dataSource === 'mock') {
    const { MockAuthRepository } = await import('./auth/MockAuthRepository');
    return { auth: new MockAuthRepository(), settings, locations, appConfig };
  }
  return { auth: new RemoteAuthRepository(api), settings, locations, appConfig };
}
