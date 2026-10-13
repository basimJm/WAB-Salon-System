import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';

export const createBookingBody = z.object({ draftId: z.string().regex(OBJECT_ID_PATTERN) });
