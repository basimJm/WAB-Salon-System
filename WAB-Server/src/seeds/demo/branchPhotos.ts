import type { Types } from 'mongoose';
import { MemberModel } from '../../models/member.model';
import { emptyDataset, type DemoDataset } from './types';
import { writeDemoDataset, type DemoModel, type DemoWriteCount } from './writer';

/** One branch staff member and the photo key the demo gives them. */
export interface DemoStaffPhoto {
  readonly id: Types.ObjectId;
  readonly photoKey: string;
}

/** Where the photo keys of branch staff written before SRV-173 are filled in. */
export interface DemoStaffPhotoStore {
  /** Sets the photo key of each stored member that has none; returns how many were changed. */
  setMissingPhotoKeys(rows: readonly DemoStaffPhoto[]): Promise<number>;
}

export const createMongoDemoStaffPhotoStore = (): DemoStaffPhotoStore => ({
  async setMissingPhotoKeys(rows) {
    if (rows.length === 0) return 0;
    const result = await MemberModel.bulkWrite(
      rows.map((row) => ({
        updateOne: {
          filter: { _id: row.id, photoKey: { $exists: false } },
          update: { $set: { photoKey: row.photoKey } },
        },
      })),
      { ordered: false },
    );
    return result.modifiedCount;
  },
});

export interface DemoBranchPhotosResult {
  readonly uploads: DemoWriteCount;
  /** Stored branch staff that had no photo key and got one now. */
  readonly photoKeysSet: number;
}

/**
 * Branch staff carry a photo like the salon staff (SRV-173). Branches an earlier seed wrote
 * without photos get their photo key and upload record here; a fresh run only confirms them.
 * Insert-only for upload records, and a photo key is set only where the member has none, so an
 * edited profile photo is never replaced. `structure` is `buildDemoBranches(...)`.
 */
export const ensureDemoBranchStaffPhotos = async (
  structure: DemoDataset,
  models: ReadonlyMap<string, DemoModel>,
  store: DemoStaffPhotoStore,
): Promise<DemoBranchPhotosResult> => {
  const uploads = emptyDataset();
  uploads.Upload = structure.Upload;
  const written = await writeDemoDataset(uploads, models);
  const rows = structure.Member.flatMap((member) =>
    typeof member['photoKey'] === 'string'
      ? [{ id: member._id, photoKey: member['photoKey'] }]
      : [],
  );
  return { uploads: written.Upload, photoKeysSet: await store.setMissingPhotoKeys(rows) };
};
