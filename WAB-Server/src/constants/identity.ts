/** Identity and session collections (SRV-024, BUSINESS_DOMAIN.md §3.1, §3.4). */
export const CUSTOMERS_COLLECTION = 'customers';
/** Admin search index on names and phone. */
export const CUSTOMER_TEXT_INDEX_NAME = 'customer_search_text';
/**
 * A field no customer document has. Without it MongoDB reads the customer's `language` (ar/en) as
 * the text-search language of the row and refuses `ar`, so the insert itself fails.
 */
export const CUSTOMER_TEXT_LANGUAGE_OVERRIDE = 'textSearchLanguage';
export const MEMBERS_COLLECTION = 'members';
export const INSTALLATIONS_COLLECTION = 'installations';
export const REFRESH_TOKENS_COLLECTION = 'refreshTokens';
export const ADMINS_COLLECTION = 'admins';

export const PERSON_NAME_MIN_LENGTH = 1;
export const PERSON_NAME_MAX_LENGTH = 50;
export const EMAIL_MAX_LENGTH = 254;
export const PHONE_NUMBER_PATTERN = /^[0-9]{4,15}$/;
export const APP_VERSION_MAX_LENGTH = 32;
export const DEVICE_TEXT_MAX_LENGTH = 100;
export const FCM_TOKEN_MAX_LENGTH = 4_096;
/** SHA-256 in hex: the only form in which a refresh token is stored. */
export const TOKEN_HASH_PATTERN = /^[a-f0-9]{64}$/;
export const SUBJECT_ID_FAMILY_MAX_LENGTH = 64;
export const REVOKED_REASON_MAX_LENGTH = 100;
export const PASSWORD_HASH_MAX_LENGTH = 100;
export const STAFF_BIO_MAX_LENGTH = 1_000;
export const STAFF_MAX_YEARS_OF_EXPERIENCE = 80;
export const RATING_MAX = 5;
