/** Real file type from the first bytes (never from the extension or the client's claim). */

interface Signature {
  readonly type: string;
  readonly offset: number;
  readonly bytes: readonly number[];
}

const ascii = (text: string): number[] => Array.from(text, (c) => c.charCodeAt(0));

const SIGNATURES: readonly Signature[] = [
  { type: 'image/jpeg', offset: 0, bytes: [0xff, 0xd8, 0xff] },
  { type: 'image/png', offset: 0, bytes: [0x89, ...ascii('PNG'), 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: 'image/gif', offset: 0, bytes: ascii('GIF8') },
  { type: 'application/pdf', offset: 0, bytes: ascii('%PDF-') },
];

const BOX_TYPE_OFFSET = 4;
const BRAND_OFFSET = 8;
const BRAND_LENGTH = 4;
const HEIC_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'];
const QUICKTIME_BRAND = 'qt  ';
const RIFF_FORMAT_OFFSET = 8;

const startsWith = (data: Uint8Array, bytes: readonly number[], offset: number): boolean =>
  data.length >= offset + bytes.length && bytes.every((byte, i) => data[offset + i] === byte);

const textAt = (data: Uint8Array, offset: number, length: number): string =>
  Buffer.from(data.subarray(offset, offset + length)).toString('latin1');

/** Detected media type, or `undefined` when the content is not a supported type. */
export const detectContentType = (data: Uint8Array): string | undefined => {
  const known = SIGNATURES.find((s) => startsWith(data, s.bytes, s.offset));
  if (known) return known.type;
  if (startsWith(data, ascii('RIFF'), 0) && startsWith(data, ascii('WEBP'), RIFF_FORMAT_OFFSET))
    return 'image/webp';
  if (startsWith(data, ascii('ftyp'), BOX_TYPE_OFFSET)) {
    const brand = textAt(data, BRAND_OFFSET, BRAND_LENGTH);
    if (HEIC_BRANDS.includes(brand)) return 'image/heic';
    return brand === QUICKTIME_BRAND ? 'video/quicktime' : 'video/mp4';
  }
  return undefined;
};

const ALIASES: Readonly<Record<string, string>> = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
  'image/heif': 'image/heic',
  'video/mov': 'video/quicktime',
};

export const normalizeContentType = (type: string): string => {
  const base = (type.split(';')[0] ?? '').trim().toLowerCase();
  return ALIASES[base] ?? base;
};

/** Does the real content match what the client declared? */
export const contentMatches = (data: Uint8Array, declared: string): boolean => {
  const detected = detectContentType(data);
  return detected !== undefined && detected === normalizeContentType(declared);
};
