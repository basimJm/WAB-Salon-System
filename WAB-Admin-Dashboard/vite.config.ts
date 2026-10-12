import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { ENV_KEYS, PUBLIC_ENV_PREFIX } from './src/constants/env.ts';
import { parsePublicEnv } from './src/infrastructure/config/envSchema.ts';
import { resolveVariant } from './src/infrastructure/config/variant.ts';

const SOURCE_DIR = fileURLToPath(new URL('./src', import.meta.url));
const SETUP_FILE = './tests/setup.ts';
const BUILD_TARGET = 'es2022';
const VENDOR_GROUPS: ReadonlyArray<readonly [string, RegExp]> = [
  ['vendor-react', /node_modules\/(react|react-dom|scheduler)\//],
  ['vendor-router', /node_modules\/(react-router|react-router-dom|@remix-run)\//],
  ['vendor-i18n', /node_modules\/(i18next|react-i18next)\//],
  ['vendor-data', /node_modules\/(@tanstack|zod)\//],
];

/**
 * One config for all four variants. `--mode <dev|prod>-<debug|release>` picks the variant:
 * env = which `.env.<dev|prod>` file + defaults; type = debug (readable, source maps) or release (minified).
 */
export default defineConfig(({ mode }) => {
  const variant = resolveVariant(mode);
  const fileEnv = loadEnv(variant.appEnv, process.cwd(), PUBLIC_ENV_PREFIX);
  const publicEnv: Record<string, string | undefined> = {};
  for (const key of Object.values(ENV_KEYS)) publicEnv[key] = process.env[key] ?? fileEnv[key];
  // Fail the build early (keys only, never values) instead of shipping a broken bundle.
  parsePublicEnv(publicEnv, variant);

  return {
    plugins: [react()],
    resolve: { alias: { '@': SOURCE_DIR } },
    define: {
      __WAB_ENV__: JSON.stringify(publicEnv),
      __BUILD_VARIANT__: JSON.stringify(variant.name),
      __ALLOW_MOCK__: JSON.stringify(variant.allowMock),
    },
    build: {
      outDir: `dist/${variant.name}`,
      sourcemap: variant.debug,
      minify: !variant.debug,
      target: BUILD_TARGET,
      cssCodeSplit: true,
      // Long-lived vendor chunks cache across deploys; app code changes do not invalidate them.
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: VENDOR_GROUPS.map(([name, pattern]) => ({ name, test: pattern })),
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: [SETUP_FILE],
      include: ['tests/**/*.test.{ts,tsx}'],
      css: false,
    },
  };
});
