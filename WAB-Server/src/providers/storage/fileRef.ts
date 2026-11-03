import { FILE_VERSION_SEPARATOR } from '../../constants/uploads';

/** A stored file reference: an object key, optionally with the slot version (`key?v=3`, SRV-181). */
export interface FileRef {
  readonly key: string;
  readonly version: number | null;
}

const VERSION_PATTERN = /^[1-9]\d{0,9}$/;

/**
 * Splits a reference into its object key and version. A malformed version is left in the key, so
 * the key check rejects it (`RangeError`) instead of a wrong object being addressed.
 */
export const parseFileRef = (ref: string): FileRef => {
  const at = ref.lastIndexOf(FILE_VERSION_SEPARATOR);
  if (at < 0) return { key: ref, version: null };
  const version = ref.slice(at + FILE_VERSION_SEPARATOR.length);
  if (!VERSION_PATTERN.test(version)) return { key: ref, version: null };
  return { key: ref.slice(0, at), version: Number(version) };
};

export const formatFileRef = (key: string, version: number): string =>
  `${key}${FILE_VERSION_SEPARATOR}${String(version)}`;

/** The object key of a reference (plain keys pass through). */
export const objectKeyOf = (ref: string): string => parseFileRef(ref).key;

/** Appends the reference's version to a URL built for its key. */
export const withVersion = (url: string, ref: FileRef): string =>
  ref.version === null ? url : `${url}${FILE_VERSION_SEPARATOR}${String(ref.version)}`;
