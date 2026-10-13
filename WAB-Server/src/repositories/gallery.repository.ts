import type { Model } from 'mongoose';
import { GalleryItemModel, type GalleryItemRaw } from '../models/galleryItem.model';
import { isObjectIdString } from '../utils/database/ids';
import type { Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class GalleryRepository extends BaseRepository<GalleryItemRaw> {
  constructor(model: Model<GalleryItemRaw> = GalleryItemModel) {
    super(model);
  }

  /** A salon's items in display order. */
  forSalon(salonId: string): Promise<Entity<GalleryItemRaw>[]> {
    return this.findMany({ salonId }, { order: 1 });
  }

  /** Removes an item of this salon; `false` when it is not there. Gallery items are really deleted. */
  async remove(salonId: string, id: string): Promise<boolean> {
    if (!isObjectIdString(id) || !isObjectIdString(salonId)) return false;
    const result = await this.model.deleteOne({ _id: id, salonId }).exec();
    return result.deletedCount > 0;
  }
}
