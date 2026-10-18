import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node22',
  // Vendor SDKs stay external; the consumer installs them.
  external: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner', 'sharp'],
});
