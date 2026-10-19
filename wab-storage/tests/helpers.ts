import type { StorageOptions } from '../src/config/options';

const pad = (head: number[], length = 64): Buffer =>
  Buffer.concat([Buffer.from(head), Buffer.alloc(Math.max(0, length - head.length), 1)]);
const text = (value: string): number[] => Array.from(value, (c) => c.charCodeAt(0));

export const FILES = {
  jpeg: pad([0xff, 0xd8, 0xff, 0xe0]),
  png: pad([0x89, ...text('PNG'), 0x0d, 0x0a, 0x1a, 0x0a]),
  gif: pad(text('GIF89a')),
  pdf: pad(text('%PDF-1.7')),
  webp: pad([...text('RIFF'), 0, 0, 0, 0, ...text('WEBP')]),
  heic: pad([0, 0, 0, 24, ...text('ftypheic')]),
  mp4: pad([0, 0, 0, 24, ...text('ftypisom')]),
  mov: pad([0, 0, 0, 20, ...text('ftypqt  ')]),
  text: Buffer.from('just some text, not an image'),
} as const;

export const memoryOptions = (extra: Partial<StorageOptions> = {}): StorageOptions => ({
  environment: 'dev',
  provider: 'memory',
  cdn: { baseUrl: 'http://localhost:9000/cdn' },
  ...extra,
});

export const fixedClock = (
  start = '2026-10-18T10:00:00.000Z',
): { now: () => Date; advance: (ms: number) => void } => {
  let current = new Date(start).getTime();
  return {
    now: () => new Date(current),
    advance: (ms) => {
      current += ms;
    },
  };
};
