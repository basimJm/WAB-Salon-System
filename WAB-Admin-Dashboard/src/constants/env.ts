export const APP_ENVS = ['dev', 'prod'] as const;
export type AppEnv = (typeof APP_ENVS)[number];

/** Build variants = environment x build type (debug keeps symbols, release minifies). */
export const BUILD_VARIANTS = ['dev-debug', 'dev-release', 'prod-debug', 'prod-release'] as const;
export type BuildVariantName = (typeof BUILD_VARIANTS)[number];

export const VARIANT_SEPARATOR = '-';
export const RELEASE_TYPE = 'release';

/** Vite modes that map to a variant without naming one (dev server, tests, plain build). */
export const MODE_ALIASES: Readonly<Record<string, BuildVariantName>> = {
  development: 'dev-debug',
  test: 'dev-debug',
  production: 'prod-release',
};

export const DATA_SOURCES = ['mock', 'remote'] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

export const ENV_KEYS = {
  apiBaseUrl: 'VITE_API_BASE_URL',
  socketUrl: 'VITE_SOCKET_URL',
  dataSource: 'VITE_DATA_SOURCE',
  defaultLanguage: 'VITE_DEFAULT_LANGUAGE',
} as const;

export const PUBLIC_ENV_PREFIX = 'VITE_';
export const HTTPS_PROTOCOL = 'https:';
export const DEFAULT_DATA_SOURCE: Readonly<Record<AppEnv, DataSource>> = {
  dev: 'mock',
  prod: 'remote',
};
