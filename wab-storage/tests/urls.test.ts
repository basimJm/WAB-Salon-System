import { createVerify, generateKeyPairSync } from 'node:crypto';
import { S3Storage } from '../src/adapters/s3';
import { resolveConfig } from '../src/config/options';
import { ERROR_CODES } from '../src/constants/codes';
import { DEFAULT_RETRY } from '../src/constants/defaults';
import { noopLogger, redact } from '../src/logger';
import { createCloudFrontSigner, publicUrlOf } from '../src/urls';
import { FakeS3 } from './fakeS3';
import { fixedClock, memoryOptions } from './helpers';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const cloudfront = { baseUrl: 'https://private.cdn.test/', keyPairId: 'K123', privateKey };
const fromCloudFront = (value: string): Buffer =>
  Buffer.from(value.replace(/-/g, '+').replace(/_/g, '=').replace(/~/g, '/'), 'base64');

describe('publicUrlOf', () => {
  it('joins and encodes per segment, rejecting bad keys', () => {
    expect(publicUrlOf('https://cdn.test', 'a/b.jpg')).toBe('https://cdn.test/a/b.jpg');
    expect(() => publicUrlOf('https://cdn.test', '../x')).toThrow(
      expect.objectContaining({ code: ERROR_CODES.KEY_INVALID }) as Error,
    );
  });
});

describe('createCloudFrontSigner', () => {
  it('signs a canned policy that verifies with the public key', () => {
    const clock = fixedClock();
    const sign = createCloudFrontSigner(cloudfront, clock.now);
    const url = new URL(sign('docs/license.pdf', 600));
    const expires = Math.floor(Date.parse('2026-10-18T10:00:00.000Z') / 1000) + 600;
    expect(`${url.origin}${url.pathname}`).toBe('https://private.cdn.test/docs/license.pdf');
    expect(url.searchParams.get('Expires')).toBe(String(expires));
    expect(url.searchParams.get('Key-Pair-Id')).toBe('K123');
    const signature = url.searchParams.get('Signature') ?? '';
    expect(signature).not.toMatch(/[+=/]/);
    const policy = JSON.stringify({
      Statement: [
        {
          Resource: 'https://private.cdn.test/docs/license.pdf',
          Condition: { DateLessThan: { 'AWS:EpochTime': expires } },
        },
      ],
    });
    expect(
      createVerify('RSA-SHA1').update(policy).verify(publicKey, fromCloudFront(signature)),
    ).toBe(true);
  });
  it('rejects bad keys and uses the real clock by default', () => {
    const sign = createCloudFrontSigner(cloudfront);
    expect(() => sign('..', 60)).toThrow();
    const expires = Number(new URL(sign('a/b', 60)).searchParams.get('Expires'));
    expect(expires).toBeGreaterThan(Date.now() / 1000);
  });
});

describe('S3Storage in cloudfront mode', () => {
  const settings = {
    cdnBaseUrl: 'https://cdn.test',
    cloudFront: cloudfront,
    uploadMaxTtlSec: 300,
    signedUrlMaxTtlSec: 600,
    readMaxBytes: 100,
    timeoutMs: 100,
    retry: DEFAULT_RETRY,
    publicCacheControl: 'x',
    logger: noopLogger,
    s3: { region: 'r', publicBucket: 'a', privateBucket: 'b', forcePathStyle: false },
  };
  it('signs with CloudFront without loading the AWS SDK or calling S3', async () => {
    const s3 = new FakeS3();
    const loadDeps = jest.fn(() => Promise.resolve(s3.deps()));
    const store = new S3Storage(settings, { loadDeps });
    const url = await store.getSignedUrl({ key: 'docs/l.pdf', expiresInSec: 60 });
    expect(url).toContain('https://private.cdn.test/docs/l.pdf?Expires=');
    expect(loadDeps).not.toHaveBeenCalled();
    await expect(
      store.getSignedUrl({ key: 'docs/l.pdf', expiresInSec: 601 }),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
  });
});

describe('options for signed URLs', () => {
  const s3 = { region: 'r', publicBucket: 'a', privateBucket: 'b' };
  const fieldsOf = (options: Parameters<typeof resolveConfig>[0]): string[] => {
    try {
      resolveConfig(options);
    } catch (error) {
      return (error as { details: { fields: string[] } }).details.fields;
    }
    return [];
  };
  it('accepts the s3 mode and a full cloudfront setup', () => {
    expect(
      resolveConfig(memoryOptions({ provider: 's3', s3, signedUrl: { mode: 's3' } })).cloudFront,
    ).toBeUndefined();
    const config = resolveConfig(
      memoryOptions({
        provider: 's3',
        s3,
        signedUrl: {
          mode: 'cloudfront',
          cloudfront: { ...cloudfront, baseUrl: 'https://p.cdn.test' },
        },
      }),
    );
    expect(config.cloudFront?.keyPairId).toBe('K123');
  });
  it('rejects incomplete or unsafe cloudfront setups', () => {
    expect(
      fieldsOf(memoryOptions({ provider: 's3', s3, signedUrl: { mode: 'cloudfront' } })),
    ).toContain('signedUrl.cloudfront');
    expect(fieldsOf(memoryOptions({ signedUrl: { mode: 'cloudfront', cloudfront } }))).toContain(
      'signedUrl.mode',
    );
    expect(
      fieldsOf({
        environment: 'prod',
        provider: 's3',
        s3,
        cdn: { baseUrl: 'https://cdn.test' },
        signedUrl: {
          mode: 'cloudfront',
          cloudfront: { ...cloudfront, baseUrl: 'http://p.cdn.test' },
        },
      }),
    ).toContain('signedUrl.cloudfront.baseUrl');
    expect(
      fieldsOf(memoryOptions({ provider: 's3', s3, signedUrl: { mode: 'ftp' as never } })),
    ).toContain('signedUrl.mode');
  });
  it('redacts the private key in logs', () => {
    expect(redact({ privateKey: 'pem', cloudfront: { privateKey: 'pem' } })).toEqual({
      privateKey: '[redacted]',
      cloudfront: { privateKey: '[redacted]' },
    });
  });
});
