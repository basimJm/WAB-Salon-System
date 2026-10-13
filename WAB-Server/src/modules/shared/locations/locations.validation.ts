import { z } from 'zod';
import { COUNTRY_CODE_PATTERN } from '../../../constants/referenceData';
import { isObjectIdString } from '../../../utils/database/ids';

export const citiesQuerySchema = z.object({ countryCode: z.string().regex(COUNTRY_CODE_PATTERN) });
export const areasQuerySchema = z.object({ cityId: z.string().refine(isObjectIdString) });
