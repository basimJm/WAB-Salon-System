import { judgeUpload } from '../src/confirm';
import { contentMatches, detectContentType, normalizeContentType } from '../src/fileType';
import { FILES } from './helpers';

describe('detectContentType', () => {
  it.each([
    ['jpeg', 'image/jpeg'],
    ['png', 'image/png'],
    ['gif', 'image/gif'],
    ['pdf', 'application/pdf'],
    ['webp', 'image/webp'],
    ['heic', 'image/heic'],
    ['mp4', 'video/mp4'],
    ['mov', 'video/quicktime'],
  ] as const)('detects %s', (name, type) => {
    expect(detectContentType(FILES[name])).toBe(type);
  });
  it('returns undefined for unknown, short and empty content', () => {
    expect(detectContentType(FILES.text)).toBeUndefined();
    expect(detectContentType(Buffer.from([0xff, 0xd8]))).toBeUndefined();
    expect(detectContentType(Buffer.alloc(0))).toBeUndefined();
    expect(detectContentType(Buffer.from('RIFF....AVI '))).toBeUndefined();
  });
});

describe('normalizeContentType / contentMatches', () => {
  it('normalizes case, parameters and aliases', () => {
    expect(normalizeContentType('IMAGE/JPG')).toBe('image/jpeg');
    expect(normalizeContentType('image/heif')).toBe('image/heic');
    expect(normalizeContentType('video/mov')).toBe('video/quicktime');
    expect(normalizeContentType('image/png; charset=x')).toBe('image/png');
    expect(normalizeContentType('')).toBe('');
  });
  it('compares real content with the claim', () => {
    expect(contentMatches(FILES.jpeg, 'image/jpg')).toBe(true);
    expect(contentMatches(FILES.png, 'image/jpeg')).toBe(false);
    expect(contentMatches(FILES.text, 'text/plain')).toBe(false);
  });
});

describe('judgeUpload', () => {
  it('orders the checks: empty, too large, type', () => {
    expect(judgeUpload(0, Buffer.alloc(0), 'image/png', 10)).toBe('EMPTY');
    expect(judgeUpload(11, FILES.png, 'image/png', 10)).toBe('TOO_LARGE');
    expect(judgeUpload(10, FILES.png, 'image/jpeg', 10)).toBe('TYPE_MISMATCH');
    expect(judgeUpload(10, FILES.png, 'image/png', 10)).toBeUndefined();
  });
});
