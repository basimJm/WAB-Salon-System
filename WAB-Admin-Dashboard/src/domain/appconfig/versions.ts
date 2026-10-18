const VERSION = /^[0-9]{1,6}(\.[0-9]{1,6}){0,3}$/;
const HTTPS_URL = /^https:\/\/\S+$/;
const MAX_URL = 500;

export const isVersion = (v: string): boolean => VERSION.test(v);
export const isStoreUrl = (v: string): boolean => HTTPS_URL.test(v) && v.length <= MAX_URL;

/** Compares dotted versions numerically ("1.10" > "1.9"); missing parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return Math.sign(diff);
  }
  return 0;
}

export type VersionError = 'latest' | 'minSupported' | 'order' | 'storeUrl';

/** Rules of the form: both versions well formed, minimum not above latest, https store link. */
export function validateVersionRow(v: {
  latest: string;
  minSupported: string;
  storeUrl: string;
}): VersionError[] {
  const errors: VersionError[] = [];
  if (!isVersion(v.latest)) errors.push('latest');
  if (!isVersion(v.minSupported)) errors.push('minSupported');
  if (errors.length === 0 && compareVersions(v.minSupported, v.latest) > 0) errors.push('order');
  if (!isStoreUrl(v.storeUrl)) errors.push('storeUrl');
  return errors;
}
