import { z } from 'zod';

/**
 * A Mongo id (24 hex characters). The server's OpenAPI writes the pattern as "^[a-f0-9]{24}$/i", which no real id
 * matches, so request bodies that carry ids override those fields with this schema (open item for the server owner).
 */
export const OBJECT_ID = z.string().regex(/^[a-f0-9]{24}$/i);
