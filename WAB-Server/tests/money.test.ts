import { FILS_PER_JOD, FULL_PERCENT, JOD_DECIMAL_PLACES } from '../src/constants/money';
import { ValidationError } from '../src/utils/errors';
import {
  assertFils,
  formatJod,
  isFils,
  isJodString,
  mulDivRound,
  parseJod,
  percentOf,
  sumFils,
} from '../src/utils/money';

const MAX_SAFE = Number.MAX_SAFE_INTEGER;

describe('money constants', () => {
  it('describe JOD: 3 decimals, 1000 fils, 100 %', () => {
    expect(JOD_DECIMAL_PLACES).toBe(3);
    expect(10 ** JOD_DECIMAL_PLACES).toBe(FILS_PER_JOD);
    expect(FULL_PERCENT).toBe(100);
  });
});

describe('isFils / assertFils', () => {
  it.each([0, 1, -1, 12_500, -12_500, MAX_SAFE, -MAX_SAFE])('accepts %p', (value) => {
    expect(isFils(value)).toBe(true);
    expect(() => {
      assertFils(value);
    }).not.toThrow();
  });

  it.each([1.5, 0.1 + 0.2, NaN, Infinity, -Infinity, 2 ** 53, '1000', null, undefined, 1n, {}])(
    'rejects %p',
    (value) => {
      expect(isFils(value)).toBe(false);
      expect(() => {
        assertFils(value);
      }).toThrow(TypeError);
    },
  );

  it('names the offending value in the error', () => {
    expect(() => {
      assertFils(1.5, 'price');
    }).toThrow('price must be an integer number of fils');
  });
});

describe('formatJod', () => {
  it.each([
    [0, '0.000'],
    [1, '0.001'],
    [9, '0.009'],
    [10, '0.010'],
    [100, '0.100'],
    [999, '0.999'],
    [1_000, '1.000'],
    [1_001, '1.001'],
    [12_500, '12.500'],
    [45_000, '45.000'],
    [1_234_567, '1234.567'],
    [-1, '-0.001'],
    [-500, '-0.500'],
    [-1_000, '-1.000'],
    [-12_345, '-12.345'],
    [MAX_SAFE, '9007199254740.991'],
    [-MAX_SAFE, '-9007199254740.991'],
  ])('formats %p fils as %p', (fils, text) => {
    expect(formatJod(fils)).toBe(text);
  });

  it('never prints a negative zero', () => {
    expect(formatJod(-0)).toBe('0.000');
  });

  it.each([1.5, NaN, Infinity, 2 ** 53, '1000'])('refuses %p (money is never a float)', (value) => {
    expect(() => formatJod(value as number)).toThrow(TypeError);
  });
});

describe('parseJod / isJodString', () => {
  it.each([
    ['0', 0],
    ['0.0', 0],
    ['0.000', 0],
    ['1', 1_000],
    ['12', 12_000],
    ['12.5', 12_500],
    ['12.50', 12_500],
    ['12.500', 12_500],
    ['0.001', 1],
    ['0.01', 10],
    ['0.1', 100],
    ['45.000', 45_000],
    ['9007199254740.991', MAX_SAFE],
  ])('parses %p as %p fils', (text, fils) => {
    expect(parseJod(text)).toBe(fils);
    expect(isJodString(text)).toBe(true);
  });

  it.each([
    '',
    ' ',
    ' 1',
    '1 ',
    '\n1',
    '1\n',
    '1.',
    '.5',
    '1.5000',
    '1,000.000',
    '1 000',
    '1_000',
    '1e3',
    '1E3',
    '+1',
    '-1',
    '-0',
    '--1',
    '01',
    '00.5',
    'abc',
    'NaN',
    'Infinity',
    '0x10',
    '1.2.3',
    '12.5 JOD',
    '٣.٠٠٠',
    '١٢',
    '１２',
    '9007199254740.992',
    '9999999999999.999',
    '99999999999999',
    '1'.repeat(10_000),
  ])('rejects %j', (text) => {
    expect(isJodString(text)).toBe(false);
    expect(() => parseJod(text)).toThrow(ValidationError);
  });

  it('reports a client error (400 VALIDATION_ERROR)', () => {
    try {
      parseJod('1.5000');
      throw new Error('expected parseJod to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toMatchObject({ httpStatus: 400, code: 'VALIDATION_ERROR' });
    }
  });

  it.each([12.5, null, undefined, {}, [], true])('treats the non-string %p as invalid', (value) => {
    expect(isJodString(value)).toBe(false);
    expect(() => parseJod(value as string)).toThrow(ValidationError);
  });

  it('accepts a sign only when allowed (signed ledger adjustments)', () => {
    const signed = { allowNegative: true };
    expect(parseJod('-1', signed)).toBe(-1_000);
    expect(parseJod('-0.5', signed)).toBe(-500);
    expect(parseJod('-12.345', signed)).toBe(-12_345);
    expect(parseJod('-9007199254740.991', signed)).toBe(-MAX_SAFE);
    expect(parseJod('12.5', signed)).toBe(12_500);
    expect(isJodString('-1', signed)).toBe(true);
    expect(isJodString('-1')).toBe(false);
    for (const text of ['--1', '-', '-.5', '+1', '- 1', '-01', '-9007199254740.992']) {
      expect(isJodString(text, signed)).toBe(false);
    }
  });

  it('turns "-0.000" into a plain zero', () => {
    const zero = parseJod('-0.000', { allowNegative: true });
    expect(Object.is(zero, 0)).toBe(true);
  });
});

describe('percentOf (deposit = round_half_up(total × percent / 100), BUSINESS_DOMAIN §5.5)', () => {
  it('matches the merchant PRD example: 20 % of a 50 JOD booking is 10 JOD', () => {
    expect(formatJod(percentOf(50_000, 20))).toBe('10.000');
  });

  it.each([
    [10_005, 50, 5_003], // 5002.5 → up
    [1, 50, 1], // 0.5 → up
    [3, 50, 2], // 1.5 → up
    [5, 10, 1], // 0.5 → up
    [4, 10, 0], // 0.4 → down
    [14, 10, 1], // 1.4 → down
    [15, 10, 2], // 1.5 → up
    [33_333, 33, 11_000], // 10999.89 → 11000
    [45_000, 30, 13_500], // exact
    [12_345, 1, 123], // 123.45 → down
    [12_350, 1, 124], // 123.5 → up
    [0, 40, 0],
  ])('percentOf(%p, %p) = %p', (amount, percent, expected) => {
    expect(percentOf(amount, percent)).toBe(expected);
  });

  it('is 0 at 0 % and the whole amount at 100 %', () => {
    for (const amount of [0, 1, 7, 999, 12_345, 1_000_000_007, MAX_SAFE]) {
      expect(percentOf(amount, 0)).toBe(0);
      expect(percentOf(amount, FULL_PERCENT)).toBe(amount);
    }
  });

  it('rounds a negative amount like its positive twin (ties away from zero)', () => {
    expect(percentOf(-5, 50)).toBe(-3);
    expect(percentOf(-10_005, 50)).toBe(-5_003);
    expect(Object.is(percentOf(-4, 10), 0)).toBe(true);
  });

  it('is exact for amounts whose product with the percentage exceeds 2^53', () => {
    // 9007199254740991 × 99 / 100 = 8917127262193581.09 — a float calculation cannot get this right.
    expect(percentOf(MAX_SAFE, 99)).toBe(8_917_127_262_193_581);
  });

  it('shows why the other part must be a subtraction, not a second percentage', () => {
    const total = 101;
    const deposit = percentOf(total, 50);
    expect(deposit).toBe(51);
    expect(deposit + percentOf(total, 50)).toBe(102); // two rounded halves over-collect 1 fils
    expect(deposit + (total - deposit)).toBe(total);
  });

  it.each([-1, 101, 12.5, NaN, Infinity, '50'])('rejects the percentage %p', (percent) => {
    expect(() => percentOf(1_000, percent as number)).toThrow(RangeError);
    expect(() => percentOf(1_000, percent as number)).toThrow('percent must be a whole number');
  });

  it('rejects a non-integer amount', () => {
    expect(() => percentOf(10.5, 50)).toThrow(TypeError);
  });
});

describe('mulDivRound', () => {
  it.each([
    [10, 1, 3, 3], // 3.33
    [10, 2, 3, 7], // 6.67
    [5, 1, 2, 3], // 2.5 → up
    [7, 1, 2, 4], // 3.5 → up
    [-5, 1, 2, -3], // -2.5 → away from zero
    [-7, 1, 2, -4],
    [0, 5, 7, 0],
    [5, 0, 7, 0],
    [MAX_SAFE, 1, 1, MAX_SAFE],
    [MAX_SAFE, 100, 100, MAX_SAFE], // product 9e17 is beyond 2^53: needs exact arithmetic
    [-MAX_SAFE, 100, 100, -MAX_SAFE],
  ])('mulDivRound(%p, %p, %p) = %p', (amount, numerator, denominator, expected) => {
    expect(mulDivRound(amount, numerator, denominator)).toBe(expected);
  });

  it('rejects a result that does not fit a safe integer', () => {
    expect(() => mulDivRound(MAX_SAFE, 2, 1)).toThrow(RangeError);
    expect(() => mulDivRound(MAX_SAFE, 2, 1)).toThrow('outside the safe range');
  });

  it.each([
    [1.5, 1, 1],
    [NaN, 1, 1],
    ['10', 1, 1],
  ])('rejects the amount %p', (amount, numerator, denominator) => {
    expect(() => mulDivRound(amount as number, numerator, denominator)).toThrow(TypeError);
  });

  it.each([
    [10, -1, 1, 'numerator'],
    [10, 1.5, 1, 'numerator'],
    [10, NaN, 1, 'numerator'],
    [10, 1, 0, 'denominator'],
    [10, 1, -1, 'denominator'],
    [10, 1, 1.5, 'denominator'],
    [10, 1, NaN, 'denominator'],
  ])('rejects mulDivRound(%p, %p, %p) (%s)', (amount, numerator, denominator, which) => {
    expect(() => mulDivRound(amount, numerator, denominator)).toThrow(RangeError);
    expect(() => mulDivRound(amount, numerator, denominator)).toThrow(which);
  });
});

describe('sumFils', () => {
  it('adds fils, including signed ledger entries', () => {
    expect(sumFils([])).toBe(0);
    expect(sumFils([1, 2, 3])).toBe(6);
    expect(sumFils([5_000, -2_000])).toBe(3_000);
    expect(sumFils([MAX_SAFE, 0])).toBe(MAX_SAFE);
    expect(sumFils([MAX_SAFE, -MAX_SAFE])).toBe(0);
  });

  it('refuses anything that is not an integer number of fils', () => {
    for (const bad of [[1.5], [NaN], [1, Infinity], [undefined], ['3'], [null]]) {
      expect(() => sumFils(bad as number[])).toThrow(TypeError);
    }
  });

  it('refuses a total that leaves the safe range', () => {
    expect(() => sumFils([MAX_SAFE, 1])).toThrow(RangeError);
    expect(() => sumFils([-MAX_SAFE, -1])).toThrow(RangeError);
  });

  it('does not change its input', () => {
    const values = Object.freeze([1_000, 2_000]);
    expect(sumFils(values)).toBe(3_000);
    expect(values).toEqual([1_000, 2_000]);
  });
});

// ---------------------------------------------------------------------------------------------
// Property-style tests. A seeded generator (no dependency) makes every run identical; the oracles
// below compute the expected value a different way than the implementation (digit strings and
// exact distance comparison on BigInt), so they would catch a wrong rounding rule or a float slip.
// ---------------------------------------------------------------------------------------------

/** mulberry32: small, fast, good enough for test data. */
const createRandom = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
};

type Random = () => number;
const SAMPLES = 4_000;
const SEED = 20_261_012;
const SCALES = [10, 1_000, 100_000, 10_000_000, 1_000_000_000_000, MAX_SAFE];

/** Integer in [0, max], using 53 random bits so large maxima are covered. */
const randomUpTo = (rand: Random, max: number): number => {
  const high = Math.floor(rand() * 2 ** 21);
  const low = Math.floor(rand() * 2 ** 32);
  return (high * 2 ** 32 + low) % (max + 1);
};

/** A non-negative amount at a random order of magnitude, so small tie-prone values are common. */
const randomAmount = (rand: Random): number =>
  randomUpTo(rand, SCALES[Math.floor(rand() * SCALES.length)] ?? 10);

/** Digit-string oracle for `round_half_up(amount × percent / 100)`: look at the two dropped digits. */
const percentOracle = (amount: number, percent: number): bigint => {
  const digits = (BigInt(amount) * BigInt(percent)).toString().padStart(3, '0');
  const cut = digits.length - 2;
  const kept = BigInt(digits.slice(0, cut));
  return Number(digits.slice(cut)) >= 50 ? kept + 1n : kept;
};

/** Exact-distance oracle for `n / d` rounded to nearest, a tie going up (n ≥ 0, d ≥ 1). */
const nearestOracle = (n: bigint, d: bigint): bigint => {
  const down = n / d;
  const toDown = n - down * d;
  const toUp = (down + 1n) * d - n;
  return toUp <= toDown ? down + 1n : down;
};

describe('properties of percentOf', () => {
  it('equals the digit-string oracle', () => {
    const rand = createRandom(SEED);
    for (let i = 0; i < SAMPLES; i += 1) {
      const amount = randomAmount(rand);
      const percent = randomUpTo(rand, FULL_PERCENT);
      expect(BigInt(percentOf(amount, percent))).toBe(percentOracle(amount, percent));
    }
  });

  it('is within half a fils of the exact value', () => {
    const rand = createRandom(SEED + 1);
    for (let i = 0; i < SAMPLES; i += 1) {
      const amount = randomAmount(rand);
      const percent = randomUpTo(rand, FULL_PERCENT);
      const exactTimes100 = BigInt(amount) * BigInt(percent);
      const roundedTimes100 = BigInt(percentOf(amount, percent)) * 100n;
      const gap = exactTimes100 - roundedTimes100;
      expect((gap < 0n ? -gap : gap) * 2n <= 100n).toBe(true);
    }
  });

  it('is odd-symmetric: the same magnitude whatever the sign', () => {
    const rand = createRandom(SEED + 2);
    for (let i = 0; i < SAMPLES; i += 1) {
      const amount = randomAmount(rand);
      const percent = randomUpTo(rand, FULL_PERCENT);
      expect(percentOf(-amount, percent) + percentOf(amount, percent)).toBe(0);
    }
  });

  it('never decreases when the amount grows, and never decreases with the percentage', () => {
    const rand = createRandom(SEED + 3);
    for (let round = 0; round < 40; round += 1) {
      const percent = randomUpTo(rand, FULL_PERCENT);
      const amounts = Array.from({ length: 200 }, () => randomAmount(rand)).sort((a, b) => a - b);
      const results = amounts.map((amount) => percentOf(amount, percent));
      expect(results).toEqual([...results].sort((a, b) => a - b));
      const amount = randomAmount(rand);
      const byPercent = Array.from({ length: FULL_PERCENT + 1 }, (_, p) => percentOf(amount, p));
      expect(byPercent).toEqual([...byPercent].sort((a, b) => a - b));
    }
  });

  it('never exceeds the amount and never goes negative for a non-negative amount', () => {
    const rand = createRandom(SEED + 4);
    for (let i = 0; i < SAMPLES; i += 1) {
      const amount = randomAmount(rand);
      const result = percentOf(amount, randomUpTo(rand, FULL_PERCENT));
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(amount);
    }
  });
});

describe('properties of mulDivRound', () => {
  it('equals the exact-distance oracle for random ratios', () => {
    const rand = createRandom(SEED + 5);
    for (let i = 0; i < SAMPLES; i += 1) {
      const amount = randomUpTo(rand, 1_000_000_000);
      const numerator = randomUpTo(rand, 1_000_000);
      const denominator = randomUpTo(rand, 1_000_000) + 1;
      const expected = nearestOracle(BigInt(amount) * BigInt(numerator), BigInt(denominator));
      expect(BigInt(mulDivRound(amount, numerator, denominator))).toBe(expected);
    }
  });

  it('always rounds an exact tie up', () => {
    const rand = createRandom(SEED + 6);
    for (let i = 0; i < SAMPLES; i += 1) {
      const half = randomUpTo(rand, 1_000_000) + 1;
      const denominator = half * 2;
      const whole = randomUpTo(rand, 1_000_000_000);
      expect(mulDivRound(whole * denominator + half, 1, denominator)).toBe(whole + 1);
      expect(mulDivRound(-(whole * denominator + half), 1, denominator)).toBe(-(whole + 1));
    }
  });

  it('keeps whole results untouched', () => {
    const rand = createRandom(SEED + 7);
    for (let i = 0; i < SAMPLES; i += 1) {
      const denominator = randomUpTo(rand, 1_000_000) + 1;
      const whole = randomUpTo(rand, 1_000_000_000);
      expect(mulDivRound(whole * denominator, 1, denominator)).toBe(whole);
    }
  });
});

describe('properties of the JOD string format', () => {
  it('formats with exactly 3 decimals, matching a BigInt rendering', () => {
    const rand = createRandom(SEED + 8);
    for (let i = 0; i < SAMPLES; i += 1) {
      const fils = randomAmount(rand);
      const big = BigInt(fils);
      const expected = `${String(big / 1000n)}.${String(big % 1000n).padStart(3, '0')}`;
      expect(formatJod(fils)).toBe(expected);
      expect(formatJod(fils)).toMatch(/^\d+\.\d{3}$/);
    }
  });

  it('round-trips: parseJod(formatJod(x)) === x, with signs when allowed', () => {
    const rand = createRandom(SEED + 9);
    for (let i = 0; i < SAMPLES; i += 1) {
      const fils = randomAmount(rand);
      expect(parseJod(formatJod(fils))).toBe(fils);
      expect(parseJod(formatJod(-fils), { allowNegative: true })).toBe(fils === 0 ? 0 : -fils);
    }
  });

  it('keeps ordering: a larger amount never formats to a smaller number', () => {
    const rand = createRandom(SEED + 10);
    const amounts = Array.from({ length: 500 }, () => randomAmount(rand)).sort((a, b) => a - b);
    const parsed = amounts.map((fils) => Number(formatJod(fils)));
    expect(parsed).toEqual([...parsed].sort((a, b) => a - b));
  });

  it('accepts a string exactly when it denotes a canonical amount (random strings)', () => {
    const rand = createRandom(SEED + 11);
    const alphabet = '0123456789..-+ eE,٣';
    let accepted = 0;
    for (let i = 0; i < 20_000; i += 1) {
      const length = randomUpTo(rand, 8);
      const text = Array.from(
        { length },
        () => alphabet[Math.floor(rand() * alphabet.length)] ?? '0',
      ).join('');
      const valid = isJodString(text, { allowNegative: true });
      if (!valid) {
        expect(() => parseJod(text, { allowNegative: true })).toThrow(ValidationError);
        continue;
      }
      accepted += 1;
      const fils = parseJod(text, { allowNegative: true });
      expect(isFils(fils)).toBe(true);
      expect(parseJod(formatJod(fils), { allowNegative: true })).toBe(fils);
    }
    expect(accepted).toBeGreaterThan(100);
  });
});

describe('properties of sumFils', () => {
  it('equals the exact BigInt sum', () => {
    const rand = createRandom(SEED + 12);
    for (let round = 0; round < 500; round += 1) {
      const values = Array.from({ length: randomUpTo(rand, 50) }, () => {
        const amount = randomUpTo(rand, 1_000_000_000);
        return rand() < 0.5 ? -amount : amount;
      });
      const expected = values.reduce((total, value) => total + BigInt(value), 0n);
      expect(BigInt(sumFils(values))).toBe(expected);
    }
  });

  it('is independent of the order of the items', () => {
    const rand = createRandom(SEED + 13);
    const values = Array.from({ length: 200 }, () => randomUpTo(rand, 1_000_000));
    expect(sumFils([...values].reverse())).toBe(sumFils(values));
  });
});
