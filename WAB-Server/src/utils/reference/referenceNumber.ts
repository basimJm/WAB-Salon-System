import { randomBytes } from 'node:crypto';
import {
  BASE32_SYMBOL_MASK,
  REFERENCE_ALPHABET,
  REFERENCE_CODE_LENGTH,
  REFERENCE_FIELD,
  REFERENCE_LOOKALIKES,
  REFERENCE_MAX_ATTEMPTS,
  REFERENCE_PREFIX,
} from '../../constants/reference';
import { isDuplicateKeyError, duplicateKeyFields } from '../database/errors';
import { InternalError } from '../errors';

/** Source of random bytes; injectable so tests are deterministic. */
export type RandomBytes = (size: number) => Uint8Array;

/**
 * `WAB-` + 6 random base32 symbols. Each byte is masked to 5 bits, which maps evenly onto the
 * 32-symbol alphabet (no modulo bias). Uniqueness is guaranteed by the database index, not here.
 */
export const generateReferenceNumber = (random: RandomBytes = randomBytes): string => {
  const bytes = random(REFERENCE_CODE_LENGTH);
  let code = '';
  for (let index = 0; index < REFERENCE_CODE_LENGTH; index += 1) {
    code += REFERENCE_ALPHABET.charAt((bytes[index] ?? 0) & BASE32_SYMBOL_MASK);
  }
  return `${REFERENCE_PREFIX}${code}`;
};

const LOOKALIKE_PATTERN = new RegExp(`[${Object.keys(REFERENCE_LOOKALIKES).join('')}]`, 'g');

const CANONICAL = new RegExp(
  `^${REFERENCE_PREFIX}[${REFERENCE_ALPHABET}]{${String(REFERENCE_CODE_LENGTH)}}$`,
);

/** Is `value` exactly a canonical reference number (upper case, valid symbols)? */
export const isReferenceNumber = (value: unknown): value is string =>
  typeof value === 'string' && CANONICAL.test(value);

/**
 * Turns what a person typed into the canonical number, or `null`: ignores case, spaces and a
 * missing dash, and maps the look-alikes `O`/`I`/`L` to `0`/`1`.
 */
export const normalizeReferenceNumber = (text: unknown): string | null => {
  if (typeof text !== 'string') return null;
  const squeezed = text.replace(/[\s-]/g, '').toUpperCase();
  const bare = REFERENCE_PREFIX.replace('-', '');
  if (!squeezed.startsWith(bare)) return null;
  const code = squeezed
    .slice(bare.length)
    .replace(LOOKALIKE_PATTERN, (symbol) => REFERENCE_LOOKALIKES[symbol] ?? symbol);
  const candidate = `${REFERENCE_PREFIX}${code}`;
  return isReferenceNumber(candidate) ? candidate : null;
};

export interface UniqueReferenceOptions {
  readonly maxAttempts?: number;
  readonly generate?: () => string;
  /** Unique field whose duplicate-key error means "try another number". */
  readonly field?: string;
}

/**
 * Runs `create(reference)` with a fresh number, retrying only when the database says that number
 * is already taken (duplicate key on the reference field). Any other failure — including a
 * duplicate on a different unique index — is rethrown unchanged. After the attempts run out
 * the failure is a server fault.
 */
export const withUniqueReference = async <T>(
  create: (reference: string) => Promise<T>,
  {
    maxAttempts = REFERENCE_MAX_ATTEMPTS,
    generate = generateReferenceNumber,
    field = REFERENCE_FIELD,
  }: UniqueReferenceOptions = {},
): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await create(generate());
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      const fields = duplicateKeyFields(error);
      if (fields !== null && !fields.includes(field)) throw error;
      lastError = error;
    }
  }
  throw new InternalError({ cause: lastError });
};
