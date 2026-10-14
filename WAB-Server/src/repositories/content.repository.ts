import type { Model } from 'mongoose';
import type { ContentKind } from '../constants/content';
import type { AppKind } from '../constants/enums';
import { ContentPageModel, type ContentPageRaw } from '../models/contentPage.model';
import { FaqModel, type FaqRaw } from '../models/faq.model';
import type { Entity } from '../utils/database/plain';
import { BaseRepository } from './base.repository';

export class ContentPagesRepository extends BaseRepository<ContentPageRaw> {
  constructor(model: Model<ContentPageRaw> = ContentPageModel) {
    super(model);
  }

  findFor(app: AppKind, kind: ContentKind): Promise<Entity<ContentPageRaw> | null> {
    return this.findOne({ app, kind });
  }
}

export class FaqsRepository extends BaseRepository<FaqRaw> {
  constructor(model: Model<FaqRaw> = FaqModel) {
    super(model);
  }
}
