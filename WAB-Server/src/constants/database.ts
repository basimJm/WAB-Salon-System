/** MongoDB connection and repository constants (SRV-012). */
export const MONGO_SERVER_SELECTION_TIMEOUT_MS = 5_000;
export const MONGO_CONNECT_TIMEOUT_MS = 10_000;
export const MONGO_SOCKET_TIMEOUT_MS = 45_000;
export const MONGO_MAX_POOL_SIZE = 20;
export const MONGO_MIN_POOL_SIZE = 2;

/** No regex flags: the OpenAPI generator copies `toString()`, so a flag would leak into `pattern` (SRV-151). */
export const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;
export const MONGO_READINESS_CHECK_NAME = 'mongodb';

export const SORT_ASCENDING = 1;
export const SORT_DESCENDING = -1;
export const DEFAULT_SORT = { createdAt: SORT_DESCENDING } as const;

/**
 * Indexes a schema no longer declares and that must go before the new ones can be created (one
 * text index per collection), by model name. Dropping is idempotent and runs at every start.
 */
export const RETIRED_INDEXES: Readonly<Record<string, readonly string[]>> = {
  // Read each customer's `language` (ar/en) as a text-search language: inserting `ar` failed.
  Customer: ['firstName_text_lastName_text_phone.e164_text'],
  // One service per catalog entry per salon: replaced by one per branch (salons have branches).
  SalonService: ['salonId_1_catalogServiceId_1'],
  // Single-gender indexes replaced by business type + audience (§5.19).
  Salon: ['state_1_gender_1'],
  CatalogService: ['gender_1_active_1_sortOrder_1'],
  RecommendedPlacement: ['gender_1_startAt_1_endAt_1'],
};
/** Server codes for "nothing to drop": the index or the whole collection does not exist yet. */
export const MONGO_INDEX_NOT_FOUND_CODES: readonly number[] = [26, 27];
