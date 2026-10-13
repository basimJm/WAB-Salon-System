import { VERSION_SEPARATOR } from '../constants/appConfig';

const parts = (version: string): number[] => version.split(VERSION_SEPARATOR).map(Number);

/**
 * Compares dotted numeric versions part by part (`1.10` is newer than `1.9`, a missing part is 0, so
 * `1.2` equals `1.2.0`). Negative, 0 or positive like `a - b`. Inputs must match `APP_VERSION_PATTERN`.
 */
export const compareVersions = (a: string, b: string): number => {
  const left = parts(a);
  const right = parts(b);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
};
