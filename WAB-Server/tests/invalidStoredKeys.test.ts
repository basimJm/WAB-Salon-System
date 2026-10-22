import { createBannersService } from '../src/domain/banners';
import { createCatalogService } from '../src/domain/catalog';
import { createLocationsService } from '../src/domain/locations';
import { createSafePublicUrl } from '../src/domain/uploads/safePublicUrl';
import { createBannerSchema } from '../src/modules/admin/banners/banners.validation';
import { createCatalogSchema } from '../src/modules/admin/catalog/catalog.validation';
import {
  createCountrySchema,
  updateCountrySchema,
} from '../src/modules/admin/locations/locations.validation';
import { FakeStorageProvider } from '../src/providers/storage';
import { ExternalServiceError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';

const BAD_KEYS = [
  'https://cdn.example.test/flags/sa.png',
  'flags/sa flag.png',
  '🇸🇦',
  'flags/.hidden.png',
  'flags//sa.png',
  '/flags/sa.png',
];
const silent = createLogger({ level: 'silent' });
const storage = new FakeStorageProvider();
const warnings = (): { calls: unknown[][]; logger: typeof silent } => {
  const calls: unknown[][] = [];
  const logger = createLogger({ level: 'silent' });
  logger.warn = (...args: unknown[]) => {
    calls.push(args);
  };
  return { calls, logger };
};

describe('createSafePublicUrl', () => {
  it('returns the CDN URL of a valid key', () => {
    expect(createSafePublicUrl(storage, silent)('flags/jo.svg', {})).toBe(
      storage.getPublicUrl('flags/jo.svg'),
    );
  });

  it.each(BAD_KEYS)('returns null and logs for the invalid key %s', (key) => {
    const { calls, logger } = warnings();
    expect(createSafePublicUrl(storage, logger)(key, { country: 'SA' })).toBeNull();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[0]).toEqual({ country: 'SA' });
    expect(JSON.stringify(calls)).not.toContain(key);
  });

  it('still fails the request when the provider is unavailable', () => {
    const down = {
      getPublicUrl: (): string => {
        throw new ExternalServiceError({ unavailable: true });
      },
    };
    expect(() => createSafePublicUrl(down, silent)('flags/jo.svg', {})).toThrow(
      ExternalServiceError,
    );
  });
});

describe('public lists with an invalid stored key', () => {
  const country = (code: string, flagKey: string): Record<string, unknown> => ({
    id: code,
    code,
    name: { ar: code, en: code },
    dialCode: '+962',
    flagKey,
    phoneRegex: '^7[789][0-9]{7}$',
    active: true,
    sortOrder: 0,
  });

  it('countries: the bad row keeps its place with an empty flag; the others are untouched', async () => {
    const service = createLocationsService({
      countries: {
        findMany: () =>
          Promise.resolve([country('JO', 'flags/jo.svg'), country('SA', BAD_KEYS[0] ?? '')]),
      },
      cities: { findMany: () => Promise.resolve([]) },
      areas: { findMany: () => Promise.resolve([]) },
      storage,
      logger: silent,
    } as never);
    const list = await service.countries('en');
    expect(list.map((c) => c.code)).toEqual(['JO', 'SA']);
    expect(list[0]?.flagUrl).toBe(storage.getPublicUrl('flags/jo.svg'));
    expect(list[1]?.flagUrl).toBe('');
  });

  it('banners: a banner whose image key is invalid is left out', async () => {
    const banner = (id: string, key: string): Record<string, unknown> => ({
      id,
      imageKey: { ar: key, en: key },
      action: 'NONE',
      actionValue: null,
    });
    const service = createBannersService({
      banners: {
        findLive: () => Promise.resolve([banner('a', 'banners/a.png'), banner('b', '🇸🇦')]),
      },
      storage,
      logger: silent,
    } as never);
    const live = await service.live('FEMALE', 'ar');
    expect(live.map((b) => b.id)).toEqual(['a']);
  });

  it('catalog: the bad row keeps its place with an empty image (page size stays exact)', async () => {
    const item = (id: string, imageKey: string): Record<string, unknown> => ({
      id,
      name: { ar: id, en: id },
      description: { ar: id, en: id },
      imageKey,
      gender: 'FEMALE',
    });
    const meta = { page: 1, pageSize: 2, total: 2 };
    const service = createCatalogService({
      catalog: {
        findPage: () =>
          Promise.resolve({
            items: [item('a', 'catalog/a.png'), item('b', 'catalog/b c.png')],
            meta,
          }),
      },
      storage,
      logger: silent,
    } as never);
    const page = await service.list({
      gender: 'FEMALE',
      language: 'en',
      params: { page: 1, pageSize: 2 },
    } as never);
    expect(page.items.map((s) => s.imageUrl)).toEqual([storage.getPublicUrl('catalog/a.png'), '']);
    expect(page.meta).toEqual(meta);
  });
});

describe('admin writes refuse keys that cannot be stored file paths', () => {
  const countryBody = {
    code: 'SA',
    name: { ar: 'السعودية', en: 'Saudi Arabia' },
    dialCode: '+966',
    flagKey: 'flags/sa.svg',
    phoneRegex: '^5[0-9]{8}$',
    reason: 'new market',
  };

  it('accepts a plain path (trimmed)', () => {
    expect(createCountrySchema.safeParse(countryBody).success).toBe(true);
    const parsed = createCountrySchema.parse({ ...countryBody, flagKey: '  flags/sa.svg  ' });
    expect(parsed.flagKey).toBe('flags/sa.svg');
  });

  it.each(BAD_KEYS)('country create and update refuse %s on body.flagKey', (flagKey) => {
    const created = createCountrySchema.safeParse({ ...countryBody, flagKey });
    expect(created.success).toBe(false);
    expect(created.error?.issues[0]?.path).toEqual(['flagKey']);
    expect(updateCountrySchema.safeParse({ flagKey, reason: 'fix' }).success).toBe(false);
  });

  it('banner and catalog image keys follow the same rule', () => {
    const banner = createBannerSchema.safeParse({
      imageKey: { ar: 'banners/a.png', en: BAD_KEYS[0] },
    });
    expect(banner.success).toBe(false);
    expect(banner.error?.issues.some((i) => i.path.join('.') === 'imageKey.en')).toBe(true);
    const catalog = createCatalogSchema.safeParse({ imageKey: BAD_KEYS[1] });
    expect(catalog.error?.issues.some((i) => i.path.join('.') === 'imageKey')).toBe(true);
  });
});
