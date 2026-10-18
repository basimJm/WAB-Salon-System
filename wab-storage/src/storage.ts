import { MemoryStorage } from './adapters/memory';
import { resolveConfig, type StorageOptions } from './config/options';
import { configError } from './errors';
import type { StorageProvider } from './types';

/** The factory: picks the adapter from `options.provider`. */
export const createStorage = (options: StorageOptions): StorageProvider => {
  const config = resolveConfig(options);
  switch (config.provider) {
    case 'memory':
      return new MemoryStorage(config);
    default:
      throw configError(`Provider not available yet: ${config.provider}`, {
        fields: ['provider'],
      });
  }
};
