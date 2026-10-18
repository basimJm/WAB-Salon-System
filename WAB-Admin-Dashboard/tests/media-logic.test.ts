import { describe, expect, it } from 'vitest';
import { ZOOM_MAX, ZOOM_MIN } from '@/constants/media';
import { formatBytes, validateFile } from '@/domain/shared/upload';
import {
  clampZoom,
  rotateLeft,
  rotateRight,
  zoomIn,
  zoomOut,
} from '@/presentation/utils/mediaMath';
import { isPrivateFileUrl } from '@/presentation/utils/safeHref';

const rules = { accept: ['image/png', 'image/jpeg'], maxBytes: 1000 };

describe('validateFile', () => {
  it.each([
    [{ type: 'image/png', size: 1000 }, null],
    [{ type: 'image/jpeg', size: 1 }, null],
    [{ type: 'image/png', size: 1001 }, 'size'],
    [{ type: 'image/gif', size: 10 }, 'type'],
    [{ type: '', size: 10 }, 'type'],
    [{ type: 'image/png', size: 0 }, 'empty'],
    [{ type: 'image/gif', size: 0 }, 'empty'],
  ])('%j -> %s', (file, expected) => expect(validateFile(file, rules)).toBe(expected));
});

describe('formatBytes', () => {
  const units = { kb: 'KB', mb: 'MB' };
  it.each([
    [1, 'en', '1 KB'],
    [340 * 1024, 'en', '340 KB'],
    [1024 * 1024, 'en', '1 MB'],
    [Math.round(4.25 * 1024 * 1024), 'en', '4.3 MB'],
    [5 * 1024 * 1024, 'ar', '٥ MB'],
  ] as const)('%s bytes (%s) -> %s', (bytes, language, expected) =>
    expect(formatBytes(bytes, language, units)).toBe(expected),
  );
});

describe('zoom and rotation', () => {
  it('zoom steps by a quarter and stays inside the limits', () => {
    expect(zoomIn(1)).toBe(1.25);
    expect(zoomOut(1)).toBe(0.75);
    expect(zoomIn(ZOOM_MAX)).toBe(ZOOM_MAX);
    expect(zoomOut(ZOOM_MIN)).toBe(ZOOM_MIN);
    expect(clampZoom(100)).toBe(ZOOM_MAX);
    expect(clampZoom(-1)).toBe(ZOOM_MIN);
  });

  it('rotation is a quarter turn that wraps and never goes negative', () => {
    expect(rotateRight(0)).toBe(90);
    expect(rotateRight(270)).toBe(0);
    expect(rotateLeft(0)).toBe(270);
    expect(rotateLeft(90)).toBe(0);
    expect([0, 90, 180, 270].every((a) => rotateLeft(rotateRight(a)) === a)).toBe(true);
  });
});

describe('isPrivateFileUrl', () => {
  it.each([
    ['https://cdn.example.com/license.pdf?sig=abc', true],
    ['blob:http://localhost/1234', true],
    ['http://cdn.example.com/a.png', false],
    ['javascript:alert(1)', false],
    ['data:image/png;base64,AAAA', false],
    ['mailto:a@b.co', false],
    ['not a url', false],
    ['', false],
  ])('%s -> %s', (url, expected) => expect(isPrivateFileUrl(url)).toBe(expected));
});
