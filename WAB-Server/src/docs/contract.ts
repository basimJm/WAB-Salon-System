import { createHash } from 'node:crypto';

/** The contract's content without its version (the version is derived from it, not part of it). */
export const contractFingerprint = (document: unknown): string => {
  const copy = JSON.parse(JSON.stringify(document)) as { info?: Record<string, unknown> };
  if (copy.info !== undefined) Reflect.deleteProperty(copy.info, 'version');
  return createHash('sha256').update(JSON.stringify(copy)).digest('hex');
};

/** `1.4.2` → `1.5.0`: every contract change is a minor bump (changes are additive by rule). */
export const nextMinor = (version: string): string => {
  const [major = '1', minor = '0'] = version.split('.');
  return `${major}.${String(Number(minor) + 1)}.0`;
};
