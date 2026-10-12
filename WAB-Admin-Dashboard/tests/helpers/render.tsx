import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { Suspense, type ReactElement, type ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { buildRoutes } from '@/app/routes';
import { AppProviders } from '@/app/AppProviders';
import type { Container } from '@/app/container';
import { createSessionStore } from '@/app/session';
import { MockAuthRepository } from '@/data/auth/MockAuthRepository';
import type { AuthRepository } from '@/domain/auth/auth';
import { buildAppConfig } from '@/infrastructure/config/appConfig';
import { STORAGE_KEYS } from '@/constants/storage';
import type { Language } from '@/constants/i18n';
import { createLogger } from '@/infrastructure/logger/logger';

export function makeContainer(
  auth: AuthRepository = new MockAuthRepository(0),
  variant = 'dev-debug',
): Container {
  return {
    config: buildAppConfig({}, variant),
    logger: createLogger('silent'),
    session: createSessionStore(),
    repositories: { auth },
    queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  };
}

/** Renders under the real providers. English by default so assertions read naturally; pass 'ar' for RTL checks. */
export function renderWithApp(
  ui: ReactElement,
  container: Container = makeContainer(),
  language: Language = 'en',
) {
  window.localStorage.setItem(STORAGE_KEYS.language, language);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppProviders container={container}>{children}</AppProviders>
  );
  return { ...render(ui, { wrapper }), container };
}

/** Renders the real route table (guard, lazy pages, shell) at `path`. */
export function renderRoutes(
  path: string,
  options: { container?: Container; language?: Language; showDesignSystem?: boolean } = {},
) {
  const router = createMemoryRouter(buildRoutes(options.showDesignSystem ?? true), {
    initialEntries: [path],
  });
  const view = renderWithApp(
    <Suspense fallback={null}>
      <RouterProvider router={router} />
    </Suspense>,
    options.container ?? makeContainer(),
    options.language ?? 'en',
  );
  return { router, ...view };
}
