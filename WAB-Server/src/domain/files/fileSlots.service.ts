import { ERROR_CODES, errorMessageKey } from '../../constants/errorCodes';
import { UPLOAD_POLICIES, type SlotPurpose, type UploadOwnerType } from '../../constants/uploads';
import type { UploadRaw } from '../../models/upload.model';
import { formatFileRef, objectKeyOf } from '../../providers/storage/fileRef';
import type { StorageProvider } from '../../providers/storage/types';
import type { UploadsRepository } from '../../repositories/uploads.repository';
import type { Entity } from '../../utils/database/plain';
import { ValidationError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import type { UploadVerifier } from '../uploads/uploads.service';
import { variantKeys, type ImageVariants } from '../uploads/variants';
import type { StorageCleanup } from './storageCleanup.service';

/** The fixed home of one single-image field (BUSINESS_DOMAIN §3.7 file slots, SRV-181). */
export interface SlotTarget {
  readonly purpose: SlotPurpose;
  /** Server-built object key (`SLOT_KEYS`), never client text. */
  readonly key: string;
  readonly ownerType: UploadOwnerType;
  readonly ownerId: string;
  readonly salonId?: string;
}

export interface ReplaceSlotInput {
  readonly target: SlotTarget;
  /** The reference the entity holds now (a slot `key?v=n` or an older plain key), if any. */
  readonly current: string | undefined;
  /** What the client sent: a confirmed temporary upload key, or the current reference unchanged. */
  readonly incoming: string;
  /** Request field named in validation errors (e.g. `body.coverKey`). */
  readonly field: string;
  /** Ownership / tenant rule for the temporary upload. */
  readonly accept: (upload: Entity<UploadRaw>) => boolean;
  /** Writes the new reference into the entity (called once, under the slot lock). */
  readonly commit: (ref: string) => Promise<void>;
}

export interface RemoveSlotInput {
  readonly target: SlotTarget;
  readonly current: string | undefined;
  /** Removes the reference from the entity (before the object is queued for deletion). */
  readonly commit: () => Promise<void>;
}

/**
 * Same-key replacement: the file id and the object key of a slot never change; a new upload is
 * copied onto the slot key in one step, its version goes up, and every leftover object (the
 * temporary upload, an older plain key, their variants) is queued for deletion. If the copy fails,
 * nothing changed: the previous file stays.
 */
export interface FileSlots {
  /** Returns the reference now stored (`key?v=n`); the current one when nothing changed. */
  replace(input: ReplaceSlotInput): Promise<string>;
  remove(input: RemoveSlotInput): Promise<void>;
}

/** Serialises work on one slot (Redis lock in the server; an in-memory queue in tests). */
export type SlotLock = <T>(slotKey: string, task: () => Promise<T>) => Promise<T>;

export interface FileSlotsDeps {
  readonly uploads: Pick<
    UploadsRepository,
    'findByKey' | 'saveSlot' | 'transition' | 'deleteByKey'
  >;
  readonly verifier: UploadVerifier;
  readonly storage: Pick<StorageProvider, 'copy' | 'stat'>;
  readonly cleanup: StorageCleanup;
  readonly lock: SlotLock;
  readonly logger: Logger;
  readonly variants?: ImageVariants;
  readonly now?: () => Date;
}

const invalidUpload = (field: string): ValidationError =>
  new ValidationError({
    code: ERROR_CODES.UPLOAD_INVALID,
    details: [
      {
        field,
        code: ERROR_CODES.UPLOAD_INVALID,
        messageKey: errorMessageKey(ERROR_CODES.UPLOAD_INVALID),
      },
    ],
  });

/** An object and its image variants (keys only, no versions). */
const withVariants = (ref: string, isImage: boolean): string[] => {
  const key = objectKeyOf(ref);
  return isImage ? [key, ...variantKeys(key)] : [key];
};

export const createFileSlots = (deps: FileSlotsDeps): FileSlots => {
  const { uploads, verifier, storage, cleanup, lock, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());

  return {
    async replace({ target, current, incoming, field, accept, commit }) {
      if (incoming === current) return current;
      // The client sent back a reference of this very slot (perhaps an older version): no change.
      if (objectKeyOf(incoming) === target.key) {
        if (current === undefined) throw invalidUpload(field);
        return current;
      }
      const policy = UPLOAD_POLICIES[target.purpose];
      const isImage = policy.kind === 'image';
      return lock(target.key, async () => {
        await verifier.assertConfirmed({
          keys: [incoming],
          purpose: target.purpose,
          field,
          accept,
        });
        const upload = await uploads.findByKey(incoming);
        if (upload === null) throw invalidUpload(field);
        const copied = await storage.copy({
          fromKey: incoming,
          toKey: target.key,
          visibility: policy.visibility,
        });
        if (copied === 'SOURCE_MISSING') throw invalidUpload(field);
        // From here the slot holds the new content: a queued removal of the key must not run.
        await cleanup.cancel(target.key);
        const info = await storage.stat(target.key);
        const slot = await uploads.saveSlot({
          key: target.key,
          purpose: target.purpose,
          ownerType: target.ownerType,
          ownerId: target.ownerId,
          ...(target.salonId === undefined ? {} : { salonId: target.salonId }),
          contentType: info?.contentType ?? upload.contentType,
          size: info?.size ?? 0,
          at: now(),
        });
        if (isImage && policy.visibility === 'PUBLIC' && deps.variants !== undefined) {
          try {
            await deps.variants.generate(target.key);
          } catch (error) {
            // Clients fall back to the original; the next replacement regenerates them.
            logger.warn({ err: error, purpose: target.purpose }, 'slot variants not regenerated');
          }
        }
        const ref = formatFileRef(target.key, slot.version ?? 1);
        await commit(ref);
        await uploads.transition(incoming, 'CONFIRMED', 'CONSUMED');
        await cleanup.enqueue(withVariants(incoming, isImage), 'SLOT_REPLACED_TEMP');
        if (current !== undefined && objectKeyOf(current) !== target.key)
          await cleanup.enqueue(withVariants(current, isImage), 'SLOT_REPLACED_LEGACY');
        logger.info(
          { purpose: target.purpose, version: slot.version, fileId: slot.id },
          'file slot replaced',
        );
        return ref;
      });
    },

    async remove({ target, current, commit }) {
      if (current === undefined) return;
      const isImage = UPLOAD_POLICIES[target.purpose].kind === 'image';
      await lock(target.key, async () => {
        await commit();
        if (objectKeyOf(current) === target.key) {
          await uploads.deleteByKey(target.key);
          await cleanup.enqueue(withVariants(target.key, isImage), 'SLOT_REMOVED');
        } else {
          await cleanup.enqueue(withVariants(current, isImage), 'SLOT_REPLACED_LEGACY');
        }
      });
    },
  };
};
