import type { Types } from 'mongoose';
import { OBJECT_KEY_PATTERN } from '../../constants/providers';
import { MemberModel } from '../../models/member.model';
import type { DemoDataset } from './types';

/** One demo business member and the photo key the demo gives them now. */
export interface DemoBusinessPhoto {
  readonly id: Types.ObjectId;
  readonly photoKey: string;
}

/** Where demo business staff written with an invalid photo key get the valid one (SRV-179). */
export interface DemoBusinessPhotoStore {
  /** Replaces each stored member's photo key only when it is not a valid object key; returns the count. */
  replaceInvalidPhotoKeys(rows: readonly DemoBusinessPhoto[]): Promise<number>;
}

/** Mongo filter: this member, with a stored photo key that no storage provider accepts. */
export const invalidPhotoKeyFilter = (id: Types.ObjectId): Record<string, unknown> => ({
  _id: id,
  photoKey: { $exists: true, $not: OBJECT_KEY_PATTERN },
});

export const createMongoDemoBusinessPhotoStore = (): DemoBusinessPhotoStore => ({
  async replaceInvalidPhotoKeys(rows) {
    if (rows.length === 0) return 0;
    const result = await MemberModel.bulkWrite(
      rows.map((row) => ({
        updateOne: {
          filter: invalidPhotoKeyFilter(row.id),
          update: { $set: { photoKey: row.photoKey } },
        },
      })),
      { ordered: false },
    );
    return result.modifiedCount;
  },
});

/**
 * Clinics and the salon for everyone were first seeded with staff photo keys holding ':' (SRV-174),
 * which made every customer page listing that staff fail. The seed is insert-only, so databases
 * seeded then keep the bad keys: this sets the valid key on those members. A valid key (including
 * a photo the merchant changed) is never touched. `data` is `buildDemoBusinesses(...)`.
 */
export const repairDemoBusinessPhotoKeys = (
  data: DemoDataset,
  store: DemoBusinessPhotoStore,
): Promise<number> =>
  store.replaceInvalidPhotoKeys(
    data.Member.flatMap((member) =>
      typeof member['photoKey'] === 'string'
        ? [{ id: member._id, photoKey: member['photoKey'] }]
        : [],
    ),
  );
