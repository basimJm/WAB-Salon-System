import { z } from 'zod';
import { OBJECT_ID_PATTERN } from '../../../constants/database';
import { AUDIENCES, BUSINESS_TYPES } from '../../../constants/enums';
import { PERSON_NAME_MAX_LENGTH, PERSON_NAME_MIN_LENGTH } from '../../../constants/identity';
import {
  LICENSE_DOCUMENTS_MAX,
  LICENSE_DOCUMENTS_MIN,
  SALON_DESCRIPTION_MAX_LENGTH,
  SALON_NAME_MAX_LENGTH,
  SALON_NAME_MIN_LENGTH,
  STORAGE_KEY_MAX_LENGTH,
  STORAGE_KEY_PATTERN,
} from '../../../constants/salon';
import {
  otpTokenSchema as otpToken,
  installationSchema as installation,
  phoneSchema as phone,
} from '../../shared/auth/auth.schemas';

const person = z.string().trim().min(PERSON_NAME_MIN_LENGTH).max(PERSON_NAME_MAX_LENGTH);
const salonName = z.string().trim().min(SALON_NAME_MIN_LENGTH).max(SALON_NAME_MAX_LENGTH);
const description = z.string().trim().max(SALON_DESCRIPTION_MAX_LENGTH);
const objectId = z.string().regex(OBJECT_ID_PATTERN);
const documentKeys = z
  .array(z.string().max(STORAGE_KEY_MAX_LENGTH).regex(STORAGE_KEY_PATTERN))
  .min(LICENSE_DOCUMENTS_MIN)
  .max(LICENSE_DOCUMENTS_MAX)
  .refine((keys) => new Set(keys).size === keys.length);

export const applySchema = z.object({
  phone,
  otpToken,
  firstName: person,
  lastName: person,
  salon: z
    .object({
      name: salonName,
      /** SALON or CLINIC (§5.19); never changes after the application. */
      businessType: z.enum(BUSINESS_TYPES),
      /** Who a SALON serves (MALE, FEMALE or BOTH; required for a SALON); a CLINIC is always BOTH. */
      audience: z.enum(AUDIENCES).optional(),
      description: description.optional(),
      cityId: objectId.optional(),
      areaId: objectId.optional(),
    })
    .refine((salon) => salon.businessType !== 'SALON' || salon.audience !== undefined, {
      path: ['audience'],
      message: 'required for a SALON',
    }),
  documentKeys,
  /** A CLINIC's medical license documents (§5.19; required for clinics, MEDICAL_LICENSE uploads). */
  medicalLicenseKeys: documentKeys.optional(),
  installation,
});

export const resubmitSchema = z
  .object({
    name: salonName.optional(),
    /** A SALON's audience (ignored for a CLINIC, always BOTH). */
    audience: z.enum(AUDIENCES).optional(),
    description: description.optional(),
    documentKeys: documentKeys.optional(),
    medicalLicenseKeys: documentKeys.optional(),
  })
  .default({});
