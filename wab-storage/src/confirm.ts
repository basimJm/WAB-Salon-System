import type { RejectionReason } from './constants/codes';
import { contentMatches } from './fileType';

/**
 * The single rule every adapter applies to an uploaded object (BRD STO-03, SNF-02):
 * empty, too large, or real content different from the declared type → rejected.
 * `head` is the first bytes of the object; `size` its full size.
 */
export const judgeUpload = (
  size: number,
  head: Uint8Array,
  declaredType: string,
  maxBytes: number,
): RejectionReason | undefined => {
  if (size === 0) return 'EMPTY';
  if (size > maxBytes) return 'TOO_LARGE';
  if (!contentMatches(head, declaredType)) return 'TYPE_MISMATCH';
  return undefined;
};
