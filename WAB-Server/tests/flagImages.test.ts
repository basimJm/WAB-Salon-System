import { createStorage } from '@wab/storage';
import { basename } from 'node:path';
import { FAKE_STORAGE_CDN_BASE_URL } from '../src/constants/providers';
import { FLAG_CONTENT_TYPE, SEED_COUNTRIES } from '../src/constants/referenceData';
import { readShippedFlag, uploadFlagImages, uploadSeedFlags } from '../src/seeds/flagImages';

// SRV-172: `GET /locations/countries` flag URLs pointed at objects the seed never stored.
const memoryStorage = (): ReturnType<typeof createStorage> =>
  createStorage({
    environment: 'dev',
    provider: 'memory',
    cdn: { baseUrl: FAKE_STORAGE_CDN_BASE_URL },
  });

describe('country flag images (SRV-172)', () => {
  it('ships an SVG for every seeded country', () => {
    for (const country of SEED_COUNTRIES) {
      const file = readShippedFlag(basename(country.flagKey));
      expect(file).toBeDefined();
      expect(file?.toString('utf8')).toContain('<svg');
    }
  });

  it('writes every seeded flag to its key through the real storage SDK (public, SVG type)', async () => {
    const storage = memoryStorage();
    const report = await uploadSeedFlags(storage);
    expect(report).toEqual({ uploaded: SEED_COUNTRIES.length, unchanged: 0, missing: [] });
    for (const country of SEED_COUNTRIES) {
      const stored = await storage.read(country.flagKey);
      expect(stored?.equals(readShippedFlag(basename(country.flagKey)) ?? Buffer.alloc(0))).toBe(
        true,
      );
    }
  });

  it('reports flag keys without a shipped file instead of writing a broken object', async () => {
    const writes: { key: string; contentType: string; visibility: string }[] = [];
    const report = await uploadFlagImages(
      [{ flagKey: 'flags/jo.svg' }, { flagKey: 'flags/zz.svg' }],
      {
        storage: {
          write: (request) => {
            writes.push({
              key: request.key,
              contentType: request.contentType,
              visibility: request.visibility,
            });
            return Promise.resolve();
          },
        },
        read: readShippedFlag,
      },
    );
    expect(report).toEqual({ uploaded: 1, unchanged: 0, missing: ['flags/zz.svg'] });
    expect(writes).toEqual([
      { key: 'flags/jo.svg', contentType: FLAG_CONTENT_TYPE, visibility: 'PUBLIC' },
    ]);
  });

  it('never reads outside the flags folder (file name only)', async () => {
    const asked: string[] = [];
    await uploadFlagImages([{ flagKey: 'nested/dir/jo.svg' }], {
      storage: { write: () => Promise.resolve() },
      read: (file) => {
        asked.push(file);
        return undefined;
      },
    });
    expect(asked).toEqual(['jo.svg']);
  });
});
