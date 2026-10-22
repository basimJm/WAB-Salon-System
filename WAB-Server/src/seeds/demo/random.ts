import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { DEMO_SEED_LABEL } from '../../constants/demoSeed';
import {
  REFERENCE_ALPHABET,
  REFERENCE_CODE_LENGTH,
  REFERENCE_PREFIX,
} from '../../constants/reference';

const OBJECT_ID_HEX_LENGTH = 24;
const UINT32_HEX_LENGTH = 8;
const HEX_RADIX = 16;
const UINT32_RANGE = 2 ** 32;
/** mulberry32 constants (public domain PRNG): small, fast and good enough for sample data. */
const MULBERRY_INCREMENT = 0x6d2b79f5;
const MULBERRY_SHIFTS = [15, 7, 14] as const;
const MULBERRY_OR = 61;

const digest = (label: string): string =>
  createHash('sha256').update(`${DEMO_SEED_LABEL}:${label}`).digest('hex');

/** The same label always gives the same id, so a second run finds what the first one inserted. */
export const demoId = (label: string): Types.ObjectId =>
  new Types.ObjectId(digest(label).slice(0, OBJECT_ID_HEX_LENGTH));

/** A booking reference (`WAB-XXXXXX`) derived from the booking label. */
export const demoReference = (label: string): string => {
  const hex = digest(`reference:${label}`);
  let code = '';
  for (let index = 0; index < REFERENCE_CODE_LENGTH; index += 1) {
    const byte = Number.parseInt(hex.slice(index * 2, index * 2 + 2), HEX_RADIX);
    code += REFERENCE_ALPHABET.charAt(byte % REFERENCE_ALPHABET.length);
  }
  return `${REFERENCE_PREFIX}${code}`;
};

export interface DemoRandom {
  /** Number in [0, 1). */
  next(): number;
  /** Integer in [min, max]. */
  int(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** `count` distinct items in a random order (fewer when the list is shorter). */
  sample<T>(items: readonly T[], count: number): T[];
  /** The key whose cumulative band contains a draw; the last key takes what is left. */
  band<K extends string>(bands: Readonly<Record<K, number>>): K;
}

export const createDemoRandom = (label: string): DemoRandom => {
  let state = Number.parseInt(digest(`random:${label}`).slice(0, UINT32_HEX_LENGTH), HEX_RADIX);
  const [a, b, c] = MULBERRY_SHIFTS;
  const next = (): number => {
    state = (state + MULBERRY_INCREMENT) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> a), t | 1);
    t ^= t + Math.imul(t ^ (t >>> b), t | MULBERRY_OR);
    return ((t ^ (t >>> c)) >>> 0) / UINT32_RANGE;
  };
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  const pick = <T>(items: readonly T[]): T => {
    const item = items[int(0, items.length - 1)];
    if (item === undefined) throw new RangeError('cannot pick from an empty list');
    return item;
  };
  return {
    next,
    int,
    chance: (probability) => next() < probability,
    pick,
    sample: (items, count) => {
      const pool = [...items];
      const out: (typeof pool)[number][] = [];
      while (out.length < count && pool.length > 0) {
        const [item] = pool.splice(int(0, pool.length - 1), 1);
        if (item !== undefined) out.push(item);
      }
      return out;
    },
    band: (bands) => {
      const keys = Object.keys(bands) as (keyof typeof bands)[];
      const draw = next();
      let edge = 0;
      for (const key of keys) {
        edge += bands[key];
        if (draw < edge) return key;
      }
      const last = keys[keys.length - 1];
      if (last === undefined) throw new RangeError('no bands');
      return last;
    },
  };
};
