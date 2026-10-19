import { createHash } from 'node:crypto';
import { DEFAULT_CACHE } from '../constants/defaults';

/** JSON with sorted object keys and ISO dates; `names` lists are order-insensitive. */
export const stableStringify = (value: unknown): string =>
  JSON.stringify(value, function replacer(this: unknown, key: string, inner: unknown) {
    if (inner instanceof Date) return inner.toISOString();
    if (Array.isArray(inner)) {
      const list: unknown[] = inner;
      return key === 'names' ? [...list].sort() : list;
    }
    if (typeof inner === 'object' && inner !== null) {
      return Object.fromEntries(
        Object.entries(inner).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
      );
    }
    return inner;
  });

/** `prefix:kind:hash` — the hash covers the whole query so equal queries share an entry. */
export const cacheKey = (prefix: string, kind: string, input: unknown): string => {
  const digest = createHash('sha256').update(stableStringify(input)).digest('hex');
  return `${prefix}:${kind}:${digest.slice(0, DEFAULT_CACHE.hashLength)}`;
};
