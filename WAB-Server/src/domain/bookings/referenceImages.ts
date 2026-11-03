import { REFERENCE_IMAGE_URL_TTL_SEC } from '../../constants/bookings';
import type { BusinessType } from '../../constants/enums';
import { ERROR_CODES } from '../../constants/errorCodes';
import { SLOT_KEYS } from '../../constants/uploads';
import type { BookingRaw } from '../../models/booking.model';
import type { UploadRaw } from '../../models/upload.model';
import type { StorageProvider } from '../../providers/storage/types';
import type { BookingsRepository } from '../../repositories/bookings.repository';
import type { Entity } from '../../utils/database/plain';
import { BusinessRuleError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import type { FileSlots } from '../files/fileSlots.service';
import type { UploadVerifier } from '../uploads/uploads.service';

/** The only business type whose bookings carry a design image per person (§5.23). */
export const REFERENCE_IMAGE_BUSINESS_TYPE: BusinessType = 'TATTOO';
/** Request field named when a design image is refused. */
export const REFERENCE_IMAGE_FIELD = 'body.persons';

/**
 * Checks the optional design images of a draft (§5.23): only a TATTOO business takes them
 * (`BUSINESS_TYPE_MISMATCH`), and each must be a confirmed `BOOKING_REFERENCE` upload the
 * accept rule allows (the customer's own).
 */
export const assertReferenceImages = async (input: {
  readonly businessType: BusinessType;
  readonly keys: readonly (string | undefined)[];
  readonly verifier: Pick<UploadVerifier, 'assertConfirmed'> | undefined;
  readonly accept: (upload: Entity<UploadRaw>) => boolean;
}): Promise<void> => {
  const keys = input.keys.filter((key): key is string => key !== undefined);
  if (keys.length === 0) return;
  if (input.businessType !== REFERENCE_IMAGE_BUSINESS_TYPE) {
    throw new BusinessRuleError({ code: ERROR_CODES.BUSINESS_TYPE_MISMATCH });
  }
  await input.verifier?.assertConfirmed({
    keys,
    purpose: 'BOOKING_REFERENCE',
    field: REFERENCE_IMAGE_FIELD,
    accept: input.accept,
  });
};

/** Moves the design images of a new booking into their file slots (after the booking exists). */
export interface ReferenceImageMover {
  move(booking: Entity<BookingRaw>): Promise<void>;
}

export const createReferenceImageMover = (deps: {
  readonly slots: Pick<FileSlots, 'replace'>;
  readonly bookings: Pick<BookingsRepository, 'setPersonReference'>;
  readonly logger: Logger;
}): ReferenceImageMover => ({
  async move(booking) {
    for (const [index, person] of booking.persons.entries()) {
      const incoming = person.referenceImageKey;
      if (incoming === undefined) continue;
      const key = SLOT_KEYS.bookingReference(booking.id, index);
      try {
        await deps.slots.replace({
          target: {
            purpose: 'BOOKING_REFERENCE',
            key,
            ownerType: 'CUSTOMER',
            ownerId: booking.customerId,
            salonId: booking.salonId,
          },
          current: undefined,
          incoming,
          field: REFERENCE_IMAGE_FIELD,
          accept: (upload) =>
            upload.ownerType === 'CUSTOMER' && upload.ownerId === booking.customerId,
          commit: async (ref) => {
            await deps.bookings.setPersonReference(booking.id, index, ref);
          },
        });
      } catch (error) {
        // The booking stands; the confirmed upload stays readable under its first key.
        deps.logger.warn({ err: error, bookingId: booking.id, index }, 'reference image not moved');
      }
    }
  },
});

/** Short-lived signed URL of a person's design image, or `null` when there is none. */
export const referenceImageUrl = async (
  storage: Pick<StorageProvider, 'getSignedUrl'>,
  key: string | undefined,
): Promise<string | null> =>
  key === undefined
    ? null
    : storage.getSignedUrl({ key, expiresInSec: REFERENCE_IMAGE_URL_TTL_SEC });
