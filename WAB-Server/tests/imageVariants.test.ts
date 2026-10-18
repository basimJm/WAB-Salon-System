import sharp from 'sharp';
import { Types } from 'mongoose';
import { createUploadsService } from '../src/domain/uploads/uploads.service';
import { createImageVariants, variantKey, variantKeys } from '../src/domain/uploads/variants';
import { SETTING_DEFAULTS } from '../src/constants/settings';
import { FakeStorageProvider } from '../src/providers/storage';
import { UploadsRepository } from '../src/repositories/uploads.repository';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const png = async (width: number, height: number): Promise<Buffer> =>
  await sharp({ create: { width, height, channels: 3, background: '#6D28D9' } })
    .png()
    .toBuffer();
const store = (
  storage: FakeStorageProvider,
  key: string,
  body: Buffer,
  contentType = 'image/png',
): void => {
  expect(storage.simulateUpload(key, { contentType, size: body.length, body })).toBe(true);
};
const presigned = async (
  storage: FakeStorageProvider,
  key: string,
  size: number,
): Promise<void> => {
  await storage.createUploadUrl({
    key,
    visibility: 'PUBLIC',
    contentType: 'image/png',
    maxBytes: size,
    expiresInSec: 300,
  });
};

describe('variantKey', () => {
  it.each([
    ['salons/cover/s1/abc.jpg', 'thumb', 'salons/cover/s1/abc_thumb.webp'],
    ['gallery/s1/x.y.png', 'medium', 'gallery/s1/x.y_medium.webp'],
    ['noext/file', 'thumb', 'noext/file_thumb.webp'],
    ['dir.v2/file', 'thumb', 'dir.v2/file_thumb.webp'],
  ] as const)('%s + %s -> %s', (key, name, expected) => {
    expect(variantKey(key, name)).toBe(expected);
  });

  it('lists every variant key of an original', () => {
    expect(variantKeys('a/b.jpg')).toEqual(['a/b_thumb.webp', 'a/b_medium.webp']);
  });
});

describe('createImageVariants', () => {
  it('writes WebP thumbnail and medium copies, never enlarging a small image', async () => {
    const storage = new FakeStorageProvider();
    const key = 'salons/cover/s1/big.png';
    await presigned(storage, key, 5_000_000);
    store(storage, key, await png(2000, 1000));
    const result = await createImageVariants({ storage, logger }).generate(key);
    expect(result.created).toEqual([
      'salons/cover/s1/big_thumb.webp',
      'salons/cover/s1/big_medium.webp',
    ]);
    const thumb = await storage.read('salons/cover/s1/big_thumb.webp');
    const medium = await storage.read('salons/cover/s1/big_medium.webp');
    const thumbInfo = await sharp(thumb ?? Buffer.alloc(0)).metadata();
    const mediumInfo = await sharp(medium ?? Buffer.alloc(0)).metadata();
    expect(thumbInfo).toMatchObject({ format: 'webp', width: 320, height: 160 });
    expect(mediumInfo).toMatchObject({ format: 'webp', width: 960, height: 480 });

    const smallKey = 'salons/cover/s1/small.png';
    await presigned(storage, smallKey, 100_000);
    store(storage, smallKey, await png(100, 50));
    await createImageVariants({ storage, logger }).generate(smallKey);
    const small = await sharp(
      (await storage.read('salons/cover/s1/small_medium.webp')) ?? Buffer.alloc(0),
    ).metadata();
    expect(small.width).toBe(100);
  });

  it('applies EXIF rotation and drops metadata', async () => {
    const storage = new FakeStorageProvider();
    const key = 'gallery/s1/rot.jpg';
    await storage.createUploadUrl({
      key,
      visibility: 'PUBLIC',
      contentType: 'image/jpeg',
      maxBytes: 1_000_000,
      expiresInSec: 300,
    });
    const body = await sharp({
      create: { width: 400, height: 200, channels: 3, background: '#fff' },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    store(storage, key, body, 'image/jpeg');
    await createImageVariants({ storage, logger }).generate(key);
    const meta = await sharp(
      (await storage.read('gallery/s1/rot_medium.webp')) ?? Buffer.alloc(0),
    ).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(400);
    expect(meta.exif).toBeUndefined();
  });

  it('skips a missing file and an unreadable image without throwing', async () => {
    const storage = new FakeStorageProvider();
    const variants = createImageVariants({ storage, logger });
    expect(await variants.generate('none/x.png')).toEqual({ created: [], skipped: 'MISSING' });
    const key = 'gallery/s1/broken.png';
    await presigned(storage, key, 1_000);
    store(storage, key, Buffer.from('not an image'));
    expect(await variants.generate(key)).toEqual({ created: [], skipped: 'UNREADABLE' });
    expect(await storage.read('gallery/s1/broken_thumb.webp')).toBeNull();
  });
});

describe('after-confirm hook of the uploads service', () => {
  const rig = (): {
    service: ReturnType<typeof createUploadsService>;
    storage: FakeStorageProvider;
    hooked: { key: string; purpose: string }[];
  } => {
    const storage = new FakeStorageProvider();
    const hooked: { key: string; purpose: string }[] = [];
    const service = createUploadsService({
      uploads: new UploadsRepository(createFakeModel().model as never),
      storage,
      settings: { get: (key: string) => Promise.resolve(SETTING_DEFAULTS[key as never]) },
      afterConfirm: (upload) => hooked.push(upload),
    });
    return { service, storage, hooked };
  };
  const actor = {
    scope: 'merchant',
    ownerType: 'MEMBER',
    ownerId: 'm1',
    salonId: new Types.ObjectId().toHexString(),
    role: 'OWNER',
  } as const;

  it('fires once for a newly confirmed public image, not for repeats, documents or rejects', async () => {
    const { service, storage, hooked } = rig();
    const { key } = await service.presign({
      purpose: 'SALON_COVER',
      contentType: 'image/jpeg',
      size: 100,
      actor,
    });
    storage.simulateUpload(key, { contentType: 'image/jpeg', size: 100 });
    await service.confirm({ key, actor });
    await service.confirm({ key, actor });
    expect(hooked).toEqual([{ key, purpose: 'SALON_COVER' }]);

    const doc = await service.presign({
      purpose: 'LICENSE_DOCUMENT',
      contentType: 'application/pdf',
      size: 100,
      actor,
    });
    storage.simulateUpload(doc.key, { contentType: 'application/pdf', size: 100 });
    await service.confirm({ key: doc.key, actor });
    expect(hooked).toHaveLength(1);

    const bad = await service.presign({
      purpose: 'SALON_PROFILE',
      contentType: 'image/jpeg',
      size: 100,
      actor,
    });
    storage.simulateUpload(bad.key, { contentType: 'image/png', size: 100 });
    await expect(service.confirm({ key: bad.key, actor })).rejects.toBeDefined();
    expect(hooked).toHaveLength(1);
  });
});
