import type { UploadRaw } from '../../models/upload.model';
import type { Entity } from '../../utils/database/plain';
import type { FileSlots, SlotTarget } from './fileSlots.service';

export interface SlotPatchInput {
  readonly target: SlotTarget;
  /** The reference the entity holds now. */
  readonly current: string | undefined;
  /** From the request: a key = replace, `null` = remove, `undefined` = leave as it is. */
  readonly value: string | null | undefined;
  readonly field: string;
  readonly accept: (upload: Entity<UploadRaw>) => boolean;
  /** Writes only this field of the entity (`null` unsets it). */
  readonly write: (ref: string | null) => Promise<void>;
}

/**
 * One single-image field of a PATCH through its file slot (SRV-181): replaced in place under the
 * slot lock, or removed with its objects queued for deletion. The other fields are the caller's.
 */
export const applySlotPatch = async (
  files: Pick<FileSlots, 'replace' | 'remove'>,
  input: SlotPatchInput,
): Promise<void> => {
  const { target, current, value, field, accept, write } = input;
  if (value === undefined) return;
  if (value === null) {
    await files.remove({ target, current, commit: () => write(null) });
    return;
  }
  await files.replace({ target, current, incoming: value, field, accept, commit: write });
};
