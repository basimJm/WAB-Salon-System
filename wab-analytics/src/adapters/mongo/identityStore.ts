import { MONGO_RULES } from '../../constants/defaults';
import { malformedError } from '../../errors';
import type { IdentityStore } from '../../ports';
import type { ActorRef, IdentityLink } from '../../types';
import { isDuplicateKey, mapMongoError } from './errors';
import type { MongoCollectionLike, MongoDoc } from './types';

export interface MongoIdentityStoreOptions {
  readonly collection: MongoCollectionLike;
  readonly maxTimeMs: number;
  readonly ensureIndexes: boolean;
  readonly now?: () => Date;
}

const toLink = (doc: MongoDoc): IdentityLink => {
  const { installationId, actorType, actorId } = doc;
  if (
    typeof installationId !== 'string' ||
    typeof actorType !== 'string' ||
    typeof actorId !== 'string'
  ) {
    throw malformedError('stored identity link has an unexpected shape');
  }
  return { installationId, actorType, actorId };
};

/** Installation ↔ account links in their own collection (ids are plain strings). */
export class MongoIdentityStore implements IdentityStore {
  private readonly now: () => Date;

  constructor(private readonly options: MongoIdentityStoreOptions) {
    this.now = options.now ?? ((): Date => new Date());
  }

  async init(): Promise<void> {
    if (!this.options.ensureIndexes) return;
    try {
      await this.options.collection.createIndex(
        { installationId: 1, actorType: 1, actorId: 1 },
        { unique: true },
      );
      await this.options.collection.createIndex({ actorType: 1, actorId: 1 });
    } catch (error) {
      throw mapMongoError(error);
    }
  }

  async link(link: IdentityLink): Promise<void> {
    try {
      await this.options.collection.updateOne(
        { installationId: link.installationId, actorType: link.actorType, actorId: link.actorId },
        { $setOnInsert: { linkedAt: this.now() } },
        { upsert: true },
      );
    } catch (error) {
      // Two instances linking the same triple at once: the other one won, the link exists.
      if (!isDuplicateKey(error)) throw mapMongoError(error);
    }
  }

  private async read(filter: MongoDoc): Promise<IdentityLink[]> {
    try {
      const docs = await this.options.collection
        .find(filter, { maxTimeMS: this.options.maxTimeMs })
        .limit(MONGO_RULES.maxLinks)
        .toArray();
      return docs.map(toLink);
    } catch (error) {
      throw mapMongoError(error);
    }
  }

  linksOfActor(actor: ActorRef): Promise<IdentityLink[]> {
    return this.read({ actorType: actor.actorType, actorId: actor.actorId });
  }

  linksOfInstallations(installationIds: readonly string[]): Promise<IdentityLink[]> {
    if (installationIds.length === 0) return Promise.resolve([]);
    return this.read({ installationId: { $in: [...installationIds] } });
  }
}
