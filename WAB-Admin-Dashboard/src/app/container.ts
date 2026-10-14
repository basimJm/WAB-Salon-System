import { QueryClient } from '@tanstack/react-query';
import { QUERY_GC_TIME_MS, QUERY_MAX_RETRIES, QUERY_STALE_TIME_MS } from '@/constants/query';
import type { Language } from '@/constants/i18n';
import { ApiClient } from '@/data/api/ApiClient';
import { createRepositories, type Repositories } from '@/data/repositories';
import type { AppConfig } from '@/infrastructure/config/appConfig';
import { AppError } from '@/infrastructure/errors/AppError';
import { normalizeError } from '@/infrastructure/errors/normalize';
import { HttpClient } from '@/infrastructure/http/HttpClient';
import { createLogger, type Logger } from '@/infrastructure/logger/logger';
import { createSessionStore, type SessionStore } from './session';

export interface Container {
  readonly config: AppConfig;
  readonly logger: Logger;
  readonly session: SessionStore;
  readonly api: ApiClient;
  readonly repositories: Repositories;
  readonly queryClient: QueryClient;
}

const isRetryableQueryError = (failureCount: number, error: unknown): boolean =>
  failureCount < QUERY_MAX_RETRIES && error instanceof AppError && error.retryable;

/** Composition root: the only place concrete classes are wired together. */
export async function createContainer(
  config: AppConfig,
  getLanguage: () => Language,
): Promise<Container> {
  const logger = createLogger(config.logLevel);
  const session = createSessionStore();
  const http = new HttpClient({
    baseUrl: config.apiBaseUrl || window.location.origin,
    getToken: () => session.get()?.accessToken ?? null,
    getLanguage,
    onUnauthorized: () => session.clear(),
    logger,
  });
  const repositories = await createRepositories(config, http);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME_MS,
        gcTime: QUERY_GC_TIME_MS,
        refetchOnWindowFocus: false,
        retry: (count, error) => isRetryableQueryError(count, normalizeError(error)),
      },
    },
  });
  return { config, logger, session, api: new ApiClient(http), repositories, queryClient };
}
