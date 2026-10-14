import type { AuthRepository } from '@/domain/auth/auth';
import type { SettingsRepository } from '@/domain/settings/settings';
import type { AppConfig } from '@/infrastructure/config/appConfig';
import type { ApiClient } from './api/ApiClient';
import { RemoteAuthRepository } from './auth/RemoteAuthRepository';
import { RemoteSettingsRepository } from './settings/RemoteSettingsRepository';

export interface Repositories {
  readonly auth: AuthRepository;
  readonly settings: SettingsRepository;
}

/** Real vs mock is decided by config only. Mock code is dead-code-eliminated when `__ALLOW_MOCK__` is false. */
export async function createRepositories(config: AppConfig, api: ApiClient): Promise<Repositories> {
  const settings = new RemoteSettingsRepository(api);
  if (__ALLOW_MOCK__ && config.dataSource === 'mock') {
    const { MockAuthRepository } = await import('./auth/MockAuthRepository');
    return { auth: new MockAuthRepository(), settings };
  }
  return { auth: new RemoteAuthRepository(api), settings };
}
