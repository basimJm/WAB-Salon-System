import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node22',
  // Vendor SDKs stay external: they are loaded lazily and installed by the consumer's package manager.
  external: ['firebase-admin', 'nodemailer'],
});
