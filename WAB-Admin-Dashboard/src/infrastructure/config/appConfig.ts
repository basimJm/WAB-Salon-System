import { PUBLIC_ENV_PREFIX } from '@/constants/env';
import type { LogLevel } from '@/constants/logging';
import { parsePublicEnv, type PublicEnv } from './envSchema';
import { resolveVariant, type BuildVariant } from './variant';

export interface AppConfig extends PublicEnv {
  readonly variant: BuildVariant;
  readonly logLevel: LogLevel;
}

/** Pure: builds the config from raw values. `loadAppConfig` feeds it the build-time constants. */
export function buildAppConfig(
  raw: Readonly<Record<string, string | undefined>>,
  variantName: string,
): AppConfig {
  const variant = resolveVariant(variantName);
  const env = parsePublicEnv(raw, variant);
  return Object.freeze({ ...env, variant, logLevel: variant.debug ? 'debug' : 'warn' });
}

/** Only `VITE_*` values injected by vite.config.ts (declared in vite-env.d.ts) are visible. */
export function loadAppConfig(): AppConfig {
  const raw: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(__WAB_ENV__)) {
    if (key.startsWith(PUBLIC_ENV_PREFIX)) raw[key] = value;
  }
  return buildAppConfig(raw, __BUILD_VARIANT__);
}
