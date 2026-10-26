import { IBAN_LAST_DIGITS } from '../../constants/iban';
import { ERROR_CODES } from '../../constants/errorCodes';
import { PAYOUT_DETAILS_AUDIT } from '../../constants/payoutDetails';
import type { PayoutDetails } from '../../models/salon.model';
import type { MembersRepository } from '../../repositories/identity.repository';
import type { SalonsRepository } from '../../repositories/salons.repository';
import type { FieldEncryption } from '../../utils/crypto/aesGcm';
import { ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors';
import { isValidIban, normalizeIban } from '../../utils/iban';
import type { AuditWriter } from '../audit/audit.service';
import type { AdminActor } from '../auth/accountLifecycle.service';
import { invalidField, type PhoneVerifier } from '../auth/phoneVerifier';
import type { OtpGate } from '../otp/otpGate.service';

/** What an owner sees: the IBAN is never sent back in full. */
export interface PayoutDetailsView {
  readonly bankName: string;
  readonly accountHolderName: string;
  readonly ibanLast4: string;
}

/** What an admin sees to make a transfer: the full IBAN (every reveal is audited). */
export interface PayoutDetailsFull extends PayoutDetailsView {
  readonly iban: string;
}

export interface PayoutDetailsInput {
  readonly bankName: string;
  readonly accountHolderName: string;
  readonly iban: string;
}

export interface PayoutDetailsService {
  /** Owner: the saved details (masked), or `null` when none were saved. */
  getForOwner(salonId: string): Promise<PayoutDetailsView | null>;
  /**
   * Owner only; changing the details needs a fresh OTP to the owner's phone (purpose BANK_DETAILS).
   * A malformed IBAN is 400; a wrong or expired proof is 401.
   */
  setByOwner(
    input: PayoutDetailsInput & { salonId: string; memberId: string; otpToken: string },
  ): Promise<PayoutDetailsView>;
  /** Admin: the full details, for a transfer. Audited on every call. */
  revealForAdmin(input: { salonId: string; actor: AdminActor }): Promise<PayoutDetailsFull | null>;
  /** Admin: replaces the details with a reason (Admin PRD A18). */
  setByAdmin(
    input: PayoutDetailsInput & { salonId: string; reason: string; actor: AdminActor },
  ): Promise<PayoutDetailsView>;
}

export const createPayoutDetailsService = (deps: {
  readonly salons: Pick<SalonsRepository, 'findById' | 'patch'>;
  readonly members: Pick<MembersRepository, 'findById'>;
  readonly phones: Pick<PhoneVerifier, 'verify'>;
  readonly otpGate: Pick<OtpGate, 'reset'>;
  readonly encryption: FieldEncryption;
  readonly audit: AuditWriter;
}): PayoutDetailsService => {
  const { salons, members, phones, otpGate, encryption, audit } = deps;

  const requireSalon = async (salonId: string): Promise<{ payoutDetails?: PayoutDetails }> => {
    const salon = await salons.findById(salonId);
    if (salon === null) throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    return salon;
  };

  const masked = (d: PayoutDetails): PayoutDetailsView => ({
    bankName: d.bankName,
    accountHolderName: d.accountHolderName,
    ibanLast4: d.ibanLast4,
  });

  const checked = (input: PayoutDetailsInput): { stored: PayoutDetails; iban: string } => {
    if (!isValidIban(input.iban)) {
      throw new ValidationError({ details: [invalidField('body.iban')] });
    }
    const iban = normalizeIban(input.iban);
    return {
      iban,
      stored: {
        bankName: input.bankName.trim(),
        accountHolderName: input.accountHolderName.trim(),
        ibanEncrypted: encryption.encrypt(iban),
        ibanLast4: iban.slice(-IBAN_LAST_DIGITS),
      },
    };
  };

  const save = async (salonId: string, stored: PayoutDetails): Promise<void> => {
    if ((await salons.patch(salonId, { set: { payoutDetails: stored } })) === null) {
      throw new NotFoundError({ code: ERROR_CODES.SALON_NOT_FOUND });
    }
  };

  return {
    async getForOwner(salonId) {
      const salon = await requireSalon(salonId);
      return salon.payoutDetails === undefined ? null : masked(salon.payoutDetails);
    },

    async setByOwner({ salonId, memberId, otpToken, ...input }) {
      const owner = await members.findById(memberId);
      if (owner?.salonId !== salonId || owner.role !== 'OWNER' || !owner.active) {
        throw new ForbiddenError({ code: ERROR_CODES.OWNER_REQUIRED });
      }
      // Validate the IBAN before spending the owner's one-time code on it.
      const { stored } = checked(input);
      await phones.verify(
        { countryCode: '', dialCode: '', number: '', e164: owner.phone },
        otpToken,
        'BANK_DETAILS',
      );
      await otpGate.reset(owner.phone);
      await save(salonId, stored);
      return masked(stored);
    },

    async revealForAdmin({ salonId, actor }) {
      const salon = await requireSalon(salonId);
      if (salon.payoutDetails === undefined) return null;
      await audit.record({
        adminId: actor.adminId,
        action: PAYOUT_DETAILS_AUDIT.view,
        entityType: PAYOUT_DETAILS_AUDIT.entityType,
        entityId: salonId,
        reason: PAYOUT_DETAILS_AUDIT.viewReason,
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
      return {
        ...masked(salon.payoutDetails),
        iban: encryption.decrypt(salon.payoutDetails.ibanEncrypted),
      };
    },

    async setByAdmin({ salonId, reason, actor, ...input }) {
      const salon = await requireSalon(salonId);
      const { stored } = checked(input);
      await save(salonId, stored);
      await audit.record({
        adminId: actor.adminId,
        action: PAYOUT_DETAILS_AUDIT.update,
        entityType: PAYOUT_DETAILS_AUDIT.entityType,
        entityId: salonId,
        // Never the IBAN itself, not even encrypted.
        before:
          salon.payoutDetails === undefined
            ? null
            : { bankName: salon.payoutDetails.bankName, ibanLast4: salon.payoutDetails.ibanLast4 },
        after: { bankName: stored.bankName, ibanLast4: stored.ibanLast4 },
        reason,
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
      return masked(stored);
    },
  };
};
