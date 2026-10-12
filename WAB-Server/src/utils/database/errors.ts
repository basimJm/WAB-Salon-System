import { MONGO_DUPLICATE_KEY_CODE } from '../../constants/errorMapping';

/** Did MongoDB refuse a write because a unique index already holds that value (error 11000)? */
export const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { readonly code?: unknown }).code === MONGO_DUPLICATE_KEY_CODE;
