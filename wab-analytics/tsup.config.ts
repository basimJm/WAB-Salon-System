import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node22',
  // The BigQuery client stays external: loaded lazily, installed by the consumer.
  external: ['@google-cloud/bigquery'],
});
