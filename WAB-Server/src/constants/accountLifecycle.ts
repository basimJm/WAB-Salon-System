/** Account blocking, deletion and purge (SRV-032, BUSINESS_DOMAIN.md §5.15). */

/** Customers anonymized per database round trip by the purge job. */
export const PURGE_BATCH_SIZE = 100;

/** What an anonymized customer looks like in old bookings and transactions. */
export const ANONYMIZED_FIRST_NAME = 'Deleted';
export const ANONYMIZED_LAST_NAME = 'User';
/** `.invalid` is reserved (RFC 2606), so the address can never belong to anyone. */
export const ANONYMIZED_EMAIL_DOMAIN = 'deleted.invalid';
/** Anonymized phones keep the unique index satisfied without ever matching a real number. */
export const ANONYMIZED_PHONE_PREFIX = 'deleted';
export const ANONYMIZED_PHONE_NUMBER = 'deleted';

/** Audit actions of admin account changes (UPPER_SNAKE, BUSINESS_DOMAIN.md §3.7). */
export const ACCOUNT_AUDIT_ACTIONS = {
  customerBlock: 'CUSTOMER_BLOCK',
  customerUnblock: 'CUSTOMER_UNBLOCK',
  customerForceDelete: 'CUSTOMER_FORCE_DELETE',
} as const;
/** Statuses an admin may force-delete from (a deleted account has nothing left to delete). */
export const FORCE_DELETE_FROM = ['ACTIVE', 'BLOCKED', 'DELETION_PENDING'] as const;
export const CUSTOMER_AUDIT_ENTITY = 'customer';
