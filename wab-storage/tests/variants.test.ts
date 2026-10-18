import sharp from 'sharp';
import { MemoryStorage } from '../src/adapters/memory';
import { resolveConfig } from '../src/config/options';
import { ERROR_CODES } from '../src/constants/codes';
import { noopLogger } from '../src/logger';
import { createStorage, withVariants } from '../src/storage';
import {
  createSharpProcessor,
  createVariantsFor,
  variantKey,
  variantKeys,
  type ImageProcessor,
} from '../src/variants';
import { FILES, memoryOptions } from './helpers';

const config = resolveConfig(memoryOptions());
const image = (width: number, height: number): Promise<Buffer> =>
  sharp({ create: { width, height, channels: 3, background: '#cc3366' } })
    .jpeg()
    .toBuffer();

describe('variant keys', () => {
  it('sit beside the original with a webp extension', () => {
    expect(variantKey(config.variants, 'salons/cover/1/x.jpg', 'thumb')).toBe(
      'salons/cover/1/x_thumb.webp',
    );
    expect(variantKey(config.variants, 'a/b.v2/file', 'medium')).toBe('a/b.v2/file_medium.webp');
    expect(variantKeys(config.variants, 'a/b.png')).toEqual(['a/b_thumb.webp', 'a/b_medium.webp']);
    expect(() => variantKey(config.variants, '../x', 'thumb')).toThrow();
  });
});

describe('createVariants with real sharp', () => {
  it('creates a 320 px and a 960 px WebP, strips metadata and never enlarges', async () => {
    const store = createStorage(memoryOptions());
    const big = await sharp({
      create: { width: 2000, height: 1000, channels: 3, background: '#3366cc' },
    })
      .withMetadata({ exif: { IFD0: { Copyright: 'secret-owner' } } })
      .jpeg()
      .toBuffer();
    await store.write({
      key: 'p/a.jpg',
      body: big,
      contentType: 'image/jpeg',
      visibility: 'PUBLIC',
    });
    const result = await store.createVariants('p/a.jpg');
    expect(result).toEqual({ created: ['p/a_thumb.webp', 'p/a_medium.webp'] });
    const thumb = await store.read('p/a_thumb.webp');
    const medium = await store.read('p/a_medium.webp');
    const [t, m] = await Promise.all([
      sharp(thumb ?? Buffer.alloc(0)).metadata(),
      sharp(medium ?? Buffer.alloc(0)).metadata(),
    ]);
    expect([t.format, t.width, m.format, m.width]).toEqual(['webp', 320, 'webp', 960]);
    expect(t.exif).toBeUndefined();
    const small = await image(100, 50);
    await store.write({
      key: 'p/s.jpg',
      body: small,
      contentType: 'image/jpeg',
      visibility: 'PUBLIC',
    });
    await store.createVariants('p/s.jpg');
    expect(
      (await sharp((await store.read('p/s_thumb.webp')) ?? Buffer.alloc(0)).metadata()).width,
    ).toBe(100);
  });
  it('applies the EXIF orientation', async () => {
    const store = createStorage(memoryOptions());
    const rotated = await sharp({
      create: { width: 400, height: 200, channels: 3, background: '#000' },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    await store.write({
      key: 'p/r.jpg',
      body: rotated,
      contentType: 'image/jpeg',
      visibility: 'PUBLIC',
    });
    await store.createVariants('p/r.jpg');
    const meta = await sharp((await store.read('p/r_thumb.webp')) ?? Buffer.alloc(0)).metadata();
    expect(meta.height).toBeGreaterThan(meta.width);
  });
  it('writes public objects with the variant content type', async () => {
    const memory = new MemoryStorage(config);
    const writes: string[] = [];
    const spy = {
      read: (k: string) => memory.read(k),
      write: (r: Parameters<MemoryStorage['write']>[0]) => (
        writes.push(`${r.key}:${r.contentType}:${r.visibility}`),
        memory.write(r)
      ),
    };
    await memory.write({
      key: 'p/a.jpg',
      body: await image(500, 500),
      contentType: 'image/jpeg',
      visibility: 'PRIVATE',
    });
    await createVariantsFor({
      provider: spy,
      config: config.variants,
      processor: createSharpProcessor(),
      logger: noopLogger,
    })('p/a.jpg');
    expect(writes).toEqual([
      'p/a_thumb.webp:image/webp:PUBLIC',
      'p/a_medium.webp:image/webp:PUBLIC',
    ]);
  });
});

describe('createVariants edge cases', () => {
  it('skips a missing original', async () => {
    const store = createStorage(memoryOptions());
    await expect(store.createVariants('p/none.jpg')).resolves.toEqual({
      created: [],
      skipped: 'MISSING',
    });
  });
  it('skips an unreadable image with a warning and creates nothing', async () => {
    const warn = jest.fn();
    const store = withVariants(new MemoryStorage(config), {
      ...config,
      logger: { ...noopLogger, warn },
    });
    await store.write({
      key: 'p/bad.heic',
      body: FILES.heic,
      contentType: 'image/heic',
      visibility: 'PUBLIC',
    });
    await expect(store.createVariants('p/bad.heic')).resolves.toEqual({
      created: [],
      skipped: 'UNREADABLE',
    });
    expect(warn).toHaveBeenCalledWith('storage.variants.unreadable', { key: 'p/bad.heic' });
    expect(await store.read('p/bad_thumb.webp')).toBeNull();
  });
  it('fails (not skips) when a later variant breaks, and rejects bad keys', async () => {
    let calls = 0;
    const processor: ImageProcessor = {
      resize: () =>
        ++calls === 1 ? Promise.resolve(Buffer.from('ok')) : Promise.reject(new Error('boom')),
    };
    const store = withVariants(new MemoryStorage(config), config, { imageProcessor: processor });
    await store.write({
      key: 'p/a.jpg',
      body: FILES.jpeg,
      contentType: 'image/jpeg',
      visibility: 'PUBLIC',
    });
    await expect(store.createVariants('p/a.jpg')).rejects.toMatchObject({
      code: ERROR_CODES.VARIANT_FAILED,
    });
    await expect(store.createVariants('../x')).rejects.toMatchObject({
      code: ERROR_CODES.KEY_INVALID,
    });
  });
  it('exposes key helpers on the storage object and delegates every port method', async () => {
    const store = createStorage(memoryOptions());
    expect(store.variantKey('a/b.jpg', 'thumb')).toBe('a/b_thumb.webp');
    expect(store.variantKeys('a/b.jpg')).toHaveLength(2);
    const target = await store.createUploadUrl({
      key: 'a/b.jpg',
      visibility: 'PUBLIC',
      contentType: 'image/jpeg',
      maxBytes: 10,
      expiresInSec: 5,
    });
    expect(target.method).toBe('PUT');
    await expect(
      store.confirmUpload({
        key: 'a/b.jpg',
        visibility: 'PUBLIC',
        contentType: 'image/jpeg',
        maxBytes: 10,
      }),
    ).resolves.toMatchObject({ status: 'REJECTED' });
    expect(store.getPublicUrl('a/b.jpg')).toContain('/a/b.jpg');
    await expect(store.getSignedUrl({ key: 'a/b.jpg', expiresInSec: 5 })).resolves.toContain(
      'private',
    );
    await store.delete(['a/b.jpg']);
  });
});
