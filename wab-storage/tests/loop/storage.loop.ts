import sharp from 'sharp';
import { MemoryStorage } from '../../src/adapters/memory';
import { resolveConfig } from '../../src/config/options';
import { createStorage, ensureDevBuckets, withVariants, type Storage } from '../../src';
import { MiniS3 } from '../miniS3';

const ITERATIONS = 100;
const CONCURRENCY = 20;
const MAX_BYTES = 1_000_000;

/** Seeded PRNG so a failing run can be reproduced. */
const prng = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return state / 4_294_967_296;
  };
};

const photo = (width: number): Promise<Buffer> =>
  sharp({ create: { width, height: width / 2, channels: 3, background: '#aa3377' } })
    .jpeg()
    .toBuffer();

/** One full life of an upload: presign → client PUT → confirm → variants → signed URL → delete. */
const lifecycle = async (
  store: Storage,
  put: (key: string, body: Buffer) => Promise<void>,
  index: number,
  body: Buffer,
  claimed: string,
): Promise<string> => {
  const key = `loop/${String(index)}/photo.jpg`;
  const visibility = index % 5 === 0 ? 'PRIVATE' : 'PUBLIC';
  await store.createUploadUrl({
    key,
    visibility,
    contentType: claimed,
    maxBytes: MAX_BYTES,
    expiresInSec: 60,
  });
  await put(key, body);
  const result = await store.confirmUpload({
    key,
    visibility,
    contentType: claimed,
    maxBytes: MAX_BYTES,
  });
  if (result.status === 'REJECTED') return result.reason;
  if (visibility === 'PUBLIC') {
    const variants = await store.createVariants(key);
    if (variants.created.length !== 2) throw new Error('variants missing');
    store.getPublicUrl(key);
  } else {
    await store.getSignedUrl({ key, expiresInSec: 60 });
  }
  await store.delete([key, ...store.variantKeys(key)]);
  return 'CONFIRMED';
};

const runBatch = async (
  store: Storage,
  put: (key: string, body: Buffer) => Promise<void>,
  random: () => number,
): Promise<Map<string, number>> => {
  const good = await photo(1_200);
  const outcomes = new Map<string, number>();
  const jobs = Array.from({ length: ITERATIONS }, (_, index) => async () => {
    // ~20 % of uploads are wrong: a png/text claiming to be a jpeg.
    const wrong = random() < 0.2;
    const body = wrong ? Buffer.from('not an image at all') : good;
    const outcome = await lifecycle(store, put, index, body, 'image/jpeg');
    outcomes.set(outcome, (outcomes.get(outcome) ?? 0) + 1);
  });
  for (let start = 0; start < jobs.length; start += CONCURRENCY)
    await Promise.all(jobs.slice(start, start + CONCURRENCY).map((job) => job()));
  return outcomes;
};

describe('storage loop', () => {
  it(`runs ${String(ITERATIONS)} upload lifecycles on the memory adapter, ${String(CONCURRENCY)} at a time, leaving nothing behind`, async () => {
    const config = resolveConfig({
      environment: 'dev',
      provider: 'memory',
      cdn: { baseUrl: 'http://localhost:9000/cdn' },
    });
    const memory = new MemoryStorage(config);
    const memoryWrapped = withVariants(memory, config);
    const heapBefore = process.memoryUsage().heapUsed;
    const outcomes = await runBatch(
      memoryWrapped,
      (key, body) => {
        expect(memory.simulateUpload(key, body)).toBe(true);
        return Promise.resolve();
      },
      prng(20_261_018),
    );
    expect(memory.size).toBe(0);
    expect((outcomes.get('CONFIRMED') ?? 0) + (outcomes.get('TYPE_MISMATCH') ?? 0)).toBe(
      ITERATIONS,
    );
    expect(outcomes.get('TYPE_MISMATCH')).toBeGreaterThan(0);
    expect(process.memoryUsage().heapUsed - heapBefore).toBeLessThan(150 * 1024 * 1024);
  });

  it(`runs ${String(ITERATIONS)} lifecycles through the real AWS SDK against the S3 wire emulator`, async () => {
    const s3 = new MiniS3();
    await s3.start();
    try {
      const options = {
        environment: 'dev' as const,
        provider: 's3' as const,
        cdn: { baseUrl: 'http://localhost:9000/cdn' },
        s3: {
          region: 'us-east-1',
          publicBucket: 'loop-public',
          privateBucket: 'loop-private',
          endpoint: s3.endpoint,
          forcePathStyle: true,
          credentials: { accessKeyId: 'loop-user', secretAccessKey: 'loop-secret' },
        },
        retry: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 2, jitterRatio: 0 },
      };
      await ensureDevBuckets(options);
      const store = createStorage(options);
      const outcomes = await runBatch(
        store,
        async (key, body) => {
          // The client PUTs to the presigned URL; here the emulator stores the body directly.
          const bucket = s3.bucket(
            key.split('/')[1] && Number(key.split('/')[1]) % 5 === 0
              ? 'loop-private'
              : 'loop-public',
          );
          bucket.set(key, { body, contentType: 'image/jpeg' });
          await Promise.resolve();
        },
        prng(7),
      );
      expect((outcomes.get('CONFIRMED') ?? 0) + (outcomes.get('TYPE_MISMATCH') ?? 0)).toBe(
        ITERATIONS,
      );
      expect(s3.bucket('loop-public').size + s3.bucket('loop-private').size).toBe(0);
    } finally {
      await s3.stop();
    }
  }, 120_000);
});
