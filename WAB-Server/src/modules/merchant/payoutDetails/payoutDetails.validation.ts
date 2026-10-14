import { z } from 'zod';
import { ACCOUNT_HOLDER_MAX_LENGTH, BANK_NAME_MAX_LENGTH } from '../../../constants/payoutDetails';
import { AUDIT_REASON_MAX_LENGTH } from '../../../constants/audit';
import { isValidIban } from '../../../utils/iban';

const details = {
  bankName: z.string().trim().min(1).max(BANK_NAME_MAX_LENGTH),
  accountHolderName: z.string().trim().min(1).max(ACCOUNT_HOLDER_MAX_LENGTH),
  iban: z.string().refine(isValidIban, 'IBAN'),
};
/** The owner proves their phone with a Firebase ID token (purpose BANK_DETAILS) to change the details. */
export const ownerPayoutDetailsBody = z.object({ ...details, idToken: z.string().min(1) });
export const adminPayoutDetailsBody = z.object({
  ...details,
  reason: z.string().trim().min(1).max(AUDIT_REASON_MAX_LENGTH),
});
