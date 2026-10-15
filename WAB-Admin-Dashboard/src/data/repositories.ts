import type { AppConfigRepository } from '@/domain/appconfig/appConfig';
import type { AuthRepository } from '@/domain/auth/auth';
import type { ContentRepository } from '@/domain/content/content';
import type { LocationsRepository } from '@/domain/locations/locations';
import type { SettingsRepository } from '@/domain/settings/settings';
import type { AppConfig } from '@/infrastructure/config/appConfig';
import type { ApiClient } from './api/ApiClient';
import { RemoteAppConfigRepository } from './appconfig/RemoteAppConfigRepository';
import { RemoteAuthRepository } from './auth/RemoteAuthRepository';
import { RemoteContentRepository } from './content/RemoteContentRepository';
import { RemoteLocationsRepository } from './locations/RemoteLocationsRepository';
import { RemoteSettingsRepository } from './settings/RemoteSettingsRepository';

export interface Repositories {
  readonly auth: AuthRepository;
  readonly settings: SettingsRepository;
  readonly locations: LocationsRepository;
  readonly appConfig: AppConfigRepository;
  readonly content: ContentRepository;
}

/** Real vs mock is decided by config only. Mock code is dead-code-eliminated when `__ALLOW_MOCK__` is false. */
export async function createRepositories(config: AppConfig, api: ApiClient): Promise<Repositories> {
  const settings = new RemoteSettingsRepository(api);
  const locations = new RemoteLocationsRepository(api);
  const appConfig = new RemoteAppConfigRepository(api);
  const content = new RemoteContentRepository(api);
  if (__ALLOW_MOCK__ && config.dataSource === 'mock') {
    const { MockAuthRepository } = await import('./auth/MockAuthRepository');
    return { auth: new MockAuthRepository(), settings, locations, appConfig, content };
  }
  return { auth: new RemoteAuthRepository(api), settings, locations, appConfig, content };
}
