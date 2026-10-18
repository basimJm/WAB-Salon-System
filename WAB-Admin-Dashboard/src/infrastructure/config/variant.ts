import {
  BUILD_VARIANTS,
  MODE_ALIASES,
  RELEASE_TYPE,
  VARIANT_SEPARATOR,
  type AppEnv,
  type BuildVariantName,
} from '../../constants/env.ts';

export interface BuildVariant {
  readonly name: BuildVariantName;
  readonly appEnv: AppEnv;
  /** debug = readable bundle + source maps + verbose logs; release = minified, silent. */
  readonly debug: boolean;
  /** Mock data source code is shipped only in dev builds (INTEGRATION.md §4). */
  readonly allowMock: boolean;
}

export function resolveVariant(mode: string): BuildVariant {
  const name = BUILD_VARIANTS.find((v) => v === mode) ?? MODE_ALIASES[mode];
  if (!name) {
    throw new Error(`Unknown build mode "${mode}". Use one of: ${BUILD_VARIANTS.join(', ')}`);
  }
  const [env, type] = name.split(VARIANT_SEPARATOR) as [AppEnv, string];
  return { name, appEnv: env, debug: type !== RELEASE_TYPE, allowMock: env === 'dev' };
}
