import { defineConfig } from 'tsup';

// Vendor SDKs stay external; the consumer installs them and they are loaded lazily.
const external = ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'sharp'];

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    target: 'node22',
    external,
  },
  {
    entry: ['src/index.ts'],
    format: ['cjs'],
    dts: true,
    sourcemap: true,
    target: 'node22',
    external,
    // CommonJS consumers (Jest, ts-node, older bundlers) cannot run a native `import()`: turn the
    // lazy vendor loads into `require()` calls. The ESM build keeps the native `import()`.
    esbuildOptions(options) {
      options.supported = { ...options.supported, 'dynamic-import': false };
    },
  },
]);
