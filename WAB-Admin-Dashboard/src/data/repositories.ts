import type { AuthRepository } from '@/domain/auth/auth';
import type { AppConfig } from '@/infrastructure/config/appConfig';
import type { HttpClient } from '@/infrastructure/http/HttpClient';
import { RemoteAuthRepository } from './auth/RemoteAuthRepository';

export interface Repositories {
  readonly auth: AuthRepository;
}

/** Real vs mock is decided by config only. Mock code is dead-code-eliminated when `__ALLOW_MOCK__` is false. */
export async function createRepositories(
  config: AppConfig,
  http: HttpClient,
): Promise<Repositories> {
  if (__ALLOW_MOCK__ && config.dataSource === 'mock') {
    const { MockAuthRepository } = await import('./auth/MockAuthRepository');
    return { auth: new MockAuthRepository() };
  }
  return { auth: new RemoteAuthRepository(http) };
}
