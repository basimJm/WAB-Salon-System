import type { RejectionReason } from './constants/codes';

/**
 * Ready-made uploads for consumers' tests: what `confirmUpload` must accept and what it must
 * reject (and delete) for each reason. The bytes only need a valid header, not a full file.
 */
export interface UploadFixture {
  readonly name: string;
  /** `null` = the client never uploaded anything. */
  readonly body: Buffer | null;
  readonly declaredType: string;
  readonly maxBytes: number;
  /** `undefined` = must be confirmed. */
  readonly expected: RejectionReason | undefined;
}

const MAX_BYTES = 1_024;
const header = (bytes: readonly number[], size = 64): Buffer =>
  Buffer.concat([Buffer.from(bytes), Buffer.alloc(size - bytes.length, 1)]);

const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0];
const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PDF_HEAD = [0x25, 0x50, 0x44, 0x46, 0x2d];
const WINDOWS_EXE_HEAD = [0x4d, 0x5a];

export const SAMPLE_FILES = {
  jpeg: header(JPEG_HEAD),
  png: header(PNG_HEAD),
  pdf: header(PDF_HEAD),
} as const;

export const UPLOAD_FIXTURES: readonly UploadFixture[] = [
  {
    name: 'valid jpeg',
    body: SAMPLE_FILES.jpeg,
    declaredType: 'image/jpeg',
    maxBytes: MAX_BYTES,
    expected: undefined,
  },
  {
    name: 'valid pdf',
    body: SAMPLE_FILES.pdf,
    declaredType: 'application/pdf',
    maxBytes: MAX_BYTES,
    expected: undefined,
  },
  {
    name: 'nothing uploaded',
    body: null,
    declaredType: 'image/jpeg',
    maxBytes: MAX_BYTES,
    expected: 'NOT_FOUND',
  },
  {
    name: 'png claiming to be jpeg',
    body: SAMPLE_FILES.png,
    declaredType: 'image/jpeg',
    maxBytes: MAX_BYTES,
    expected: 'TYPE_MISMATCH',
  },
  {
    name: 'text claiming to be jpeg',
    body: Buffer.from('<script>alert(1)</script>'),
    declaredType: 'image/jpeg',
    maxBytes: MAX_BYTES,
    expected: 'TYPE_MISMATCH',
  },
  {
    name: 'executable claiming to be pdf',
    body: header(WINDOWS_EXE_HEAD),
    declaredType: 'application/pdf',
    maxBytes: MAX_BYTES,
    expected: 'TYPE_MISMATCH',
  },
  {
    name: 'empty file',
    body: Buffer.alloc(0),
    declaredType: 'image/jpeg',
    maxBytes: MAX_BYTES,
    expected: 'EMPTY',
  },
  {
    name: 'file above the limit',
    body: header(JPEG_HEAD, MAX_BYTES + 1),
    declaredType: 'image/jpeg',
    maxBytes: MAX_BYTES,
    expected: 'TOO_LARGE',
  },
];
