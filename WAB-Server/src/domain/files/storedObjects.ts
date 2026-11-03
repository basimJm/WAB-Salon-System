import { objectKeyOf } from '../../providers/storage/fileRef';
import { variantKeys } from '../uploads/variants';

/**
 * Every stored object of these files: each key plus its image variants (SRV-182). Variant keys of a
 * video or a document do not exist; deleting a missing object is a no-op, so listing them is safe.
 */
export const storedObjectsOf = (refs: readonly string[]): string[] =>
  refs.flatMap((ref) => {
    const key = objectKeyOf(ref);
    return [key, ...variantKeys(key)];
  });

/** Keys present before and missing after (files a list field dropped). */
export const droppedKeys = (before: readonly string[], after: readonly string[]): string[] =>
  before.filter((key) => !after.includes(key));
