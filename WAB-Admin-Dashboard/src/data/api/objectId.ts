import { z } from 'zod';

/**
 * A Mongo id (24 hex characters). The server's OpenAPI writes the pattern as "^[a-f0-9]{24}$/i", which no real id
 * matches, so request bodies that carry ids override those fields with this schema (open item for the server owner).
 */
export const OBJECT_ID = z.string().regex(/^[a-f0-9]{24}$/i);

/** `?branchId=` of the branch-aware salon endpoints (hours, closures, services, members); left out = main branch (or the whole salon for members). */
export const branchQuerySchema = () => z.object({ branchId: OBJECT_ID.optional() }).optional();

/** `?salonId=&branchId=` of the finance views (reconciliation). */
export const salonBranchQuerySchema = () =>
  z.object({ salonId: OBJECT_ID.optional(), branchId: OBJECT_ID.optional() }).optional();
