import { Types } from 'mongoose';
import { REFERENCE_ALPHABET, REFERENCE_MAX_ATTEMPTS } from '../src/constants/reference';
import { duplicateKeyFields, isDuplicateKeyError } from '../src/utils/database/errors';
import { isObjectIdString, newId, toObjectId } from '../src/utils/database/ids';
import { InternalError, ValidationError } from '../src/utils/errors';
import { normalizeError } from '../src/utils/errors/normalize';
import {
  generateReferenceNumber,
  isReferenceNumber,
  normalizeReferenceNumber,
  withUniqueReference,
} from '../src/utils/reference';
import { createRandom } from './helpers/random';

const bytesOf =
  (...values: number[]) =>
  (): Uint8Array =>
    Uint8Array.from(values);

const duplicate = (keyPattern?: Record<string, number>): Error =>
  Object.assign(new Error('E11000 duplicate key error'), {
    code: 11000,
    ...(keyPattern === undefined ? {} : { keyPattern }),
  });

describe('reference alphabet', () => {
  it('has 32 distinct symbols and none of the letters I, L, O, U', () => {
    expect(REFERENCE_ALPHABET).toHaveLength(32);
    expect(new Set(REFERENCE_ALPHABET).size).toBe(32);
    for (const banned of 'ILOU') expect(REFERENCE_ALPHABET).not.toContain(banned);
    expect(REFERENCE_ALPHABET).toMatch(/^[0-9A-Z]+$/);
  });
});

describe('generateReferenceNumber', () => {
  it('maps each byte to a symbol with its low 5 bits', () => {
    // 0→0, 1→1, 2→2, 31→Z, 32→0 (wraps), 255→Z
    expect(generateReferenceNumber(bytesOf(0, 1, 2, 31, 32, 255))).toBe('WAB-012Z0Z');
    expect(generateReferenceNumber(bytesOf(10, 17, 18, 19, 20, 21))).toBe('WAB-AHJKMN');
  });

  it('asks for exactly six random bytes', () => {
    const random = jest.fn(() => Uint8Array.from([0, 0, 0, 0, 0, 0]));
    generateReferenceNumber(random);
    expect(random).toHaveBeenCalledWith(6);
  });

  it('always yields a canonical number and uses every symbol about equally', () => {
    const rand = createRandom(20261012);
    const random = (size: number): Uint8Array =>
      Uint8Array.from({ length: size }, () => Math.floor(rand() * 256));
    const counts = new Map<string, number>();
    const total = 20_000;
    for (let index = 0; index < total; index += 1) {
      const reference = generateReferenceNumber(random);
      expect(isReferenceNumber(reference)).toBe(true);
      for (const symbol of reference.slice(4)) counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
    }
    expect(counts.size).toBe(32);
    const expected = (total * 6) / 32;
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(expected * 0.9);
      expect(count).toBeLessThan(expected * 1.1);
    }
  });

  it('works with the real random source', () => {
    expect(isReferenceNumber(generateReferenceNumber())).toBe(true);
    expect(generateReferenceNumber()).not.toBe(generateReferenceNumber());
  });
});

describe('isReferenceNumber', () => {
  it.each(['WAB-012Z0Z', 'WAB-AHJKMN', 'WAB-000000', 'WAB-ZZZZZZ'])('accepts %s', (value) => {
    expect(isReferenceNumber(value)).toBe(true);
  });

  it.each([
    'wab-012z0z',
    'WAB012Z0Z',
    'WAB-12345',
    'WAB-1234567',
    'WAB-ABCDEU',
    'WAB-ABCDEI',
    'WAB-ABCDEO',
    'WAB-ABCDEL',
    'XAB-012Z0Z',
    ' WAB-012Z0Z',
    'WAB-012Z0Z\n',
    '',
    null,
    undefined,
    123456,
  ])('rejects %j', (value) => {
    expect(isReferenceNumber(value)).toBe(false);
  });
});

describe('normalizeReferenceNumber', () => {
  it.each([
    ['WAB-K7M2Q9', 'WAB-K7M2Q9'],
    ['wab-k7m2q9', 'WAB-K7M2Q9'],
    ['  wab k7m2q9 ', 'WAB-K7M2Q9'],
    ['wabk7m2q9', 'WAB-K7M2Q9'],
    ['WAB-O0I1L1', 'WAB-001111'],
    ['wab-oil0o1', 'WAB-011001'],
  ])('reads %j as %s', (input, expected) => {
    expect(normalizeReferenceNumber(input)).toBe(expected);
  });

  it.each(['WAB-K7M2Q', 'WAB-K7M2Q99', 'WAB-UUUUUU', 'ABC-K7M2Q9', 'K7M2Q9', '', 'WAB-', 42, null])(
    'cannot read %j',
    (input) => {
      expect(normalizeReferenceNumber(input)).toBeNull();
    },
  );

  it('is the identity on generated numbers', () => {
    const rand = createRandom(7);
    for (let index = 0; index < 500; index += 1) {
      const reference = generateReferenceNumber((size) =>
        Uint8Array.from({ length: size }, () => Math.floor(rand() * 256)),
      );
      expect(normalizeReferenceNumber(reference)).toBe(reference);
      expect(normalizeReferenceNumber(reference.toLowerCase())).toBe(reference);
    }
  });
});

describe('withUniqueReference', () => {
  const sequence = (...values: string[]) => {
    let index = 0;
    return (): string => values[index++] ?? 'WAB-OUTOFV';
  };

  it('returns the created record on the first try', async () => {
    const create = jest.fn((reference: string) => Promise.resolve({ reference }));
    const result = await withUniqueReference(create, { generate: sequence('WAB-AAAAAA') });
    expect(result).toEqual({ reference: 'WAB-AAAAAA' });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('uses a new number after the database says the number is taken', async () => {
    const seen: string[] = [];
    const result = await withUniqueReference(
      (reference) => {
        seen.push(reference);
        return seen.length < 3
          ? Promise.reject(duplicate({ referenceNumber: 1 }))
          : Promise.resolve(reference);
      },
      { generate: sequence('WAB-AAAAAA', 'WAB-BBBBBB', 'WAB-CCCCCC') },
    );
    expect(seen).toEqual(['WAB-AAAAAA', 'WAB-BBBBBB', 'WAB-CCCCCC']);
    expect(result).toBe('WAB-CCCCCC');
  });

  it('retries when the driver does not say which key collided', async () => {
    const create = jest
      .fn<Promise<string>, [string]>()
      .mockRejectedValueOnce(duplicate())
      .mockResolvedValueOnce('ok');
    await expect(withUniqueReference(create)).resolves.toBe('ok');
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('does not retry a duplicate on another unique index', async () => {
    const failure = duplicate({ idempotencyKey: 1 });
    const create = jest.fn().mockRejectedValue(failure);
    await expect(withUniqueReference(create)).rejects.toBe(failure);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('retries on a compound index that includes the reference field', async () => {
    const create = jest
      .fn<Promise<string>, [string]>()
      .mockRejectedValueOnce(duplicate({ salonId: 1, referenceNumber: 1 }))
      .mockResolvedValueOnce('ok');
    await expect(withUniqueReference(create)).resolves.toBe('ok');
  });

  it('does not retry any other failure', async () => {
    const failure = new Error('connection lost');
    const create = jest.fn().mockRejectedValue(failure);
    await expect(withUniqueReference(create)).rejects.toBe(failure);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('gives up after the attempts, as a server fault that keeps the cause', async () => {
    const create = jest.fn().mockRejectedValue(duplicate({ referenceNumber: 1 }));
    const failure = await withUniqueReference(create).catch((error: unknown) => error);
    expect(create).toHaveBeenCalledTimes(REFERENCE_MAX_ATTEMPTS);
    expect(failure).toBeInstanceOf(InternalError);
    expect((failure as InternalError).cause).toMatchObject({ code: 11000 });
    expect(normalizeError(failure).httpStatus).toBe(500);
  });

  it('honours a custom attempt limit and field', async () => {
    const create = jest.fn().mockRejectedValue(duplicate({ code: 1 }));
    await expect(
      withUniqueReference(create, { maxAttempts: 2, field: 'code' }),
    ).rejects.toBeInstanceOf(InternalError);
    expect(create).toHaveBeenCalledTimes(2);
  });
});

describe('duplicate key helpers', () => {
  it('lists the colliding fields only when the driver reports them', () => {
    expect(duplicateKeyFields(duplicate({ a: 1, b: 1 }))).toEqual(['a', 'b']);
    expect(duplicateKeyFields(duplicate())).toBeNull();
    expect(duplicateKeyFields(null)).toBeNull();
    expect(duplicateKeyFields('x')).toBeNull();
    expect(isDuplicateKeyError(duplicate())).toBe(true);
  });
});

describe('id utils', () => {
  it.each([
    [new Types.ObjectId().toHexString(), true],
    ['64B7F0F2A1B2C3D4E5F60718', true],
    ['64b7f0f2a1b2c3d4e5f6071', false],
    ['64b7f0f2a1b2c3d4e5f607189', false],
    ['zzb7f0f2a1b2c3d4e5f60718', false],
    ['', false],
    [null, false],
    [123, false],
  ])('isObjectIdString(%j) is %s', (value, expected) => {
    expect(isObjectIdString(value)).toBe(expected);
  });

  it('creates fresh valid ids', () => {
    const ids = new Set(Array.from({ length: 100 }, newId));
    expect(ids.size).toBe(100);
    for (const id of ids) expect(isObjectIdString(id)).toBe(true);
  });

  it('converts a valid id and rejects a malformed one with a 400', () => {
    const id = newId();
    expect(toObjectId(id)).toBeInstanceOf(Types.ObjectId);
    expect(toObjectId(id).toHexString()).toBe(id);
    expect(() => toObjectId('nope')).toThrow(ValidationError);
    expect(
      normalizeError(
        (() => {
          try {
            toObjectId('nope');
          } catch (error) {
            return error;
          }
        })(),
      ).httpStatus,
    ).toBe(400);
  });
});
