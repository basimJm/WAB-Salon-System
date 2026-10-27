import sharp from 'sharp';
import {
  DEMO_IMAGE_CONTENT_TYPE,
  DEMO_IMAGE_FOLDERS,
  DEMO_PLACEHOLDER_SIZE,
} from '../src/constants/demoSeed';
import { FakeStorageProvider } from '../src/providers/storage';
import { demoPlaceholderImage, uploadDemoImages } from '../src/seeds/demoImageUpload';
import type { DemoImageTarget } from '../src/seeds/demoImages';

const targets: DemoImageTarget[] = [
  { key: 'demo/members/joury-staff0.jpg', purpose: 'MEMBER_PHOTO' },
  { key: 'demo/members/joury-staff1.jpg', purpose: 'MEMBER_PHOTO' },
  { key: 'demo/salons/joury/cover.jpg', purpose: 'SALON_COVER' },
  { key: 'demo/salons/joury/license.jpg', purpose: 'LICENSE_DOCUMENT' },
];

const setup = (): {
  storage: FakeStorageProvider;
  writes: { key: string; contentType: string; visibility: string }[];
  thumbs: string[];
} => {
  const storage = new FakeStorageProvider();
  const writes: { key: string; contentType: string; visibility: string }[] = [];
  const thumbs: string[] = [];
  const original = storage.write.bind(storage);
  const recording = {
    write: (request: Parameters<FakeStorageProvider['write']>[0]): Promise<void> => {
      writes.push({
        key: request.key,
        contentType: request.contentType,
        visibility: request.visibility,
      });
      return original(request);
    },
  };
  return { storage: Object.assign(storage, recording), writes, thumbs };
};

describe('demo images (SRV-171 S4: no seeded URL answers 404)', () => {
  it('without a photo folder every demo key gets the placeholder image', async () => {
    const { storage, writes } = setup();
    const thumbs: string[] = [];
    const report = await uploadDemoImages(targets, Object.values(DEMO_IMAGE_FOLDERS), {
      storage,
      variants: {
        generate: (key) => {
          thumbs.push(key);
          return Promise.resolve({ created: [] });
        },
      },
      list: () => [],
      read: () => {
        throw new Error('no photo should be read');
      },
    });
    expect(report).toMatchObject({ uploaded: 0, placeholders: targets.length });
    expect(report.placeholdersByPurpose).toEqual({
      MEMBER_PHOTO: 2,
      SALON_COVER: 1,
      LICENSE_DOCUMENT: 1,
    });
    expect(writes.map((w) => w.key).sort()).toEqual(targets.map((t) => t.key).sort());
    expect(writes.every((w) => w.contentType === DEMO_IMAGE_CONTENT_TYPE)).toBe(true);
    expect(writes.find((w) => w.key.endsWith('license.jpg'))?.visibility).toBe('PRIVATE');
    // Thumbnails only for public images.
    expect(thumbs.sort()).toEqual(
      targets
        .filter((t) => !t.key.endsWith('license.jpg'))
        .map((t) => t.key)
        .sort(),
    );
    const stored = await storage.read('demo/members/joury-staff0.jpg');
    const meta = await sharp(stored ?? Buffer.alloc(0)).metadata();
    expect(meta).toMatchObject({
      format: 'jpeg',
      width: DEMO_PLACEHOLDER_SIZE,
      height: DEMO_PLACEHOLDER_SIZE,
    });
  });

  it("the owner's photos are used where they exist, placeholders fill the rest", async () => {
    const { storage, writes } = setup();
    const photo = await demoPlaceholderImage();
    const report = await uploadDemoImages(targets, Object.values(DEMO_IMAGE_FOLDERS), {
      storage,
      variants: { generate: () => Promise.resolve({ created: [] }) },
      list: (folder) => (folder === DEMO_IMAGE_FOLDERS.SALON_COVER ? ['cover.jpg'] : []),
      read: (path) => {
        expect(path).toBe(`${DEMO_IMAGE_FOLDERS.SALON_COVER}/cover.jpg`);
        return photo;
      },
    });
    expect(report).toMatchObject({ uploaded: 1, placeholders: 3 });
    expect(writes).toHaveLength(targets.length);
  });

  it('nothing to write when the demo data has no image keys', async () => {
    const { storage, writes } = setup();
    const report = await uploadDemoImages([], Object.values(DEMO_IMAGE_FOLDERS), {
      storage,
      variants: { generate: () => Promise.resolve({ created: [] }) },
      list: () => [],
      read: () => Buffer.alloc(0),
    });
    expect(report).toEqual({
      uploaded: 0,
      placeholders: 0,
      placeholdersByPurpose: {},
      existing: 0,
    });
    expect(writes).toHaveLength(0);
  });

  it('SRV-173: a stored key keeps its image; an owner photo still replaces it', async () => {
    const { storage, writes } = setup();
    const noVariants = { generate: () => Promise.resolve({ created: [] }) };
    const placeholdersOnly = {
      storage,
      variants: noVariants,
      list: () => [],
      read: () => Buffer.alloc(0),
    };
    await uploadDemoImages(targets, Object.values(DEMO_IMAGE_FOLDERS), placeholdersOnly);
    writes.length = 0;
    const again = await uploadDemoImages(
      targets,
      Object.values(DEMO_IMAGE_FOLDERS),
      placeholdersOnly,
    );
    expect(again).toMatchObject({ uploaded: 0, placeholders: 0, existing: targets.length });
    expect(writes).toHaveLength(0);
    const photo = await demoPlaceholderImage();
    const withPhoto = await uploadDemoImages(targets, Object.values(DEMO_IMAGE_FOLDERS), {
      storage,
      variants: noVariants,
      list: (folder) => (folder === DEMO_IMAGE_FOLDERS.SALON_COVER ? ['cover.jpg'] : []),
      read: () => photo,
    });
    expect(withPhoto).toMatchObject({ uploaded: 1, placeholders: 0, existing: targets.length - 1 });
    expect(writes.map((w) => w.key)).toEqual(['demo/salons/joury/cover.jpg']);
  });
});
