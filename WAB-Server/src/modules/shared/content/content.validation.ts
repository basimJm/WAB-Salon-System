import { z } from 'zod';
import { CONTENT_KIND_SLUGS } from '../../../constants/content';

export const pageParamsSchema = z.object({
  slug: z.enum(Object.keys(CONTENT_KIND_SLUGS) as [keyof typeof CONTENT_KIND_SLUGS]),
});
