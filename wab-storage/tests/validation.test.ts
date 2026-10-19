import { ERROR_CODES } from '../src/constants/codes';
import {
  assertConfirmRequest,
  assertKey,
  assertSignedRequest,
  assertTtl,
  assertUploadRequest,
  assertWriteRequest,
  encodeKey,
} from '../src/validation';

const upload = {
  key: 'salons/1/cover.jpg',
  visibility: 'PUBLIC' as const,
  contentType: 'image/jpeg',
  maxBytes: 10,
  expiresInSec: 60,
};
const codeOf = (fn: () => void): string => {
  try {
    fn();
  } catch (error) {
    return (error as { code: string }).code;
  }
  return 'NONE';
};

describe('assertKey', () => {
  it('accepts server-style keys', () => {
    expect(
      codeOf(() => {
        assertKey('a/b-c_d/e.f.jpg');
      }),
    ).toBe('NONE');
  });
  it.each([
    '',
    '/a',
    'a//b',
    'a/../b',
    '../a',
    'a/',
    'a b',
    'a/.hidden',
    '.a',
    'ä',
    'a'.repeat(1025),
  ])('rejects %j', (key) => {
    expect(
      codeOf(() => {
        assertKey(key);
      }),
    ).toBe(ERROR_CODES.KEY_INVALID);
  });
  it('rejects non-strings', () => {
    expect(
      codeOf(() => {
        assertKey(5 as never);
      }),
    ).toBe(ERROR_CODES.KEY_INVALID);
  });
});

describe('request validation', () => {
  it('accepts a valid upload request', () => {
    expect(
      codeOf(() => {
        assertUploadRequest(upload, 300);
      }),
    ).toBe('NONE');
  });
  it.each([
    [{ visibility: 'SECRET' }],
    [{ contentType: 'not a type' }],
    [{ contentType: 5 }],
    [{ maxBytes: 0 }],
    [{ maxBytes: 1.5 }],
    [{ expiresInSec: 0 }],
    [{ expiresInSec: 301 }],
  ])('rejects %j', (patch) => {
    expect(
      codeOf(() => {
        assertUploadRequest({ ...upload, ...patch } as never, 300);
      }),
    ).toBe(ERROR_CODES.VALIDATION_FAILED);
  });
  it('never allows more than the S3 presign limit even if configured higher', () => {
    expect(
      codeOf(() => {
        assertTtl(604_801, 1_000_000);
      }),
    ).toBe(ERROR_CODES.VALIDATION_FAILED);
    expect(
      codeOf(() => {
        assertTtl(604_800, 1_000_000);
      }),
    ).toBe('NONE');
  });
  it('validates confirm, signed and write requests', () => {
    const confirm = {
      key: upload.key,
      visibility: upload.visibility,
      contentType: upload.contentType,
      maxBytes: upload.maxBytes,
    };
    expect(
      codeOf(() => {
        assertConfirmRequest(confirm);
      }),
    ).toBe('NONE');
    expect(
      codeOf(() => {
        assertConfirmRequest({ ...confirm, key: '..' });
      }),
    ).toBe(ERROR_CODES.KEY_INVALID);
    expect(
      codeOf(() => {
        assertSignedRequest({ key: 'a/b', expiresInSec: 10 }, 20);
      }),
    ).toBe('NONE');
    expect(
      codeOf(() => {
        assertSignedRequest({ key: 'a/b', expiresInSec: 21 }, 20);
      }),
    ).toBe(ERROR_CODES.VALIDATION_FAILED);
    const write = {
      key: 'a/b',
      body: Buffer.from('x'),
      contentType: 'image/png',
      visibility: 'PRIVATE' as const,
    };
    expect(
      codeOf(() => {
        assertWriteRequest(write);
      }),
    ).toBe('NONE');
    expect(
      codeOf(() => {
        assertWriteRequest({ ...write, body: 'x' as never });
      }),
    ).toBe(ERROR_CODES.VALIDATION_FAILED);
  });
  it('encodes keys per segment', () => {
    expect(encodeKey('a/b c')).toBe('a/b%20c');
  });
});
