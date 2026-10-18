import { MONGO_RULES } from '../../constants/defaults';
import { malformedError, validationError } from '../../errors';
import type { EventStore, StoreCountQuery, StoreFindQuery } from '../../ports';
import type { CountRow, StoredEvent } from '../../types';
import { mapMongoError } from './errors';
import { identityCodec, type IdCodec, type MongoCollectionLike, type MongoDoc } from './types';

export interface MongoEventStoreOptions {
  readonly collection: MongoCollectionLike;
  readonly ids?: IdCodec;
  readonly maxTimeMs: number;
  readonly ensureIndexes: boolean;
}

const ID_FIELDS = ['actorId', 'salonId', 'bookingId'] as const;

/** Server events in a MongoDB collection (the layout WAB-Server already writes). */
export class MongoEventStore implements EventStore {
  private readonly collection: MongoCollectionLike;
  private readonly ids: IdCodec;
  private readonly maxTimeMs: number;
  private readonly ensureIndexes: boolean;

  constructor(options: MongoEventStoreOptions) {
    this.collection = options.collection;
    this.ids = options.ids ?? identityCodec;
    this.maxTimeMs = options.maxTimeMs;
    this.ensureIndexes = options.ensureIndexes;
  }

  async init(): Promise<void> {
    if (!this.ensureIndexes) return;
    try {
      await this.collection.createIndex({ ts: -1 });
      await this.collection.createIndex({ name: 1, ts: -1 });
      await this.collection.createIndex({ actorId: 1, ts: -1 });
      await this.collection.createIndex({ bookingId: 1, ts: -1 });
    } catch (error) {
      throw mapMongoError(error);
    }
  }

  async append(event: StoredEvent): Promise<void> {
    const doc: MongoDoc = { ts: event.ts, name: event.name, actorType: event.actorType };
    for (const key of ID_FIELDS) {
      const value = event[key];
      if (value !== undefined) doc[key] = this.ids.encode(value);
    }
    doc.params = event.params;
    if (event.platform !== undefined) doc.platform = event.platform;
    if (event.appVersion !== undefined) doc.appVersion = event.appVersion;
    try {
      await this.collection.insertOne(doc);
    } catch (error) {
      throw mapMongoError(error);
    }
  }

  private match(query: { names?: readonly string[] | undefined; from: Date; to: Date }): MongoDoc {
    const match: MongoDoc = { ts: { $gte: query.from, $lt: query.to } };
    if (query.names !== undefined && query.names.length > 0) match.name = { $in: [...query.names] };
    return match;
  }

  async count(query: StoreCountQuery): Promise<CountRow[]> {
    const key =
      query.groupBy === 'NAME'
        ? '$name'
        : {
            $dateToString: { format: MONGO_RULES.dayFormat, date: '$ts', timezone: query.timeZone },
          };
    try {
      const rows = await this.collection
        .aggregate(
          [
            { $match: this.match(query) },
            { $group: { _id: key, count: { $sum: 1 } } },
            { $sort: { _id: 1 } },
          ],
          { maxTimeMS: this.maxTimeMs },
        )
        .toArray();
      return rows.map((row) => ({ key: String(row._id), count: Number(row.count) }));
    } catch (error) {
      throw mapMongoError(error);
    }
  }

  async find(query: StoreFindQuery): Promise<StoredEvent[]> {
    const filter = this.match(query);
    if (query.actors !== undefined) {
      if (query.actors.length > MONGO_RULES.maxActorsPerFind) {
        throw validationError('too many actors', { max: MONGO_RULES.maxActorsPerFind });
      }
      if (query.actors.length === 0) return [];
      filter.$or = query.actors.map((actor) => ({
        actorType: actor.actorType,
        actorId: this.ids.encode(actor.actorId),
      }));
    }
    try {
      const docs = await this.collection
        .find(filter, { maxTimeMS: this.maxTimeMs })
        .sort({ ts: query.order === 'asc' ? 1 : -1 })
        .limit(query.limit)
        .toArray();
      return docs.map((doc) => this.toEvent(doc));
    } catch (error) {
      throw mapMongoError(error);
    }
  }

  async countActors(query: { names?: readonly string[]; from: Date; to: Date }): Promise<number> {
    try {
      const rows = await this.collection
        .aggregate(
          [
            { $match: { ...this.match(query), actorId: { $exists: true } } },
            { $group: { _id: { type: '$actorType', id: '$actorId' } } },
            { $count: 'actors' },
          ],
          { maxTimeMS: this.maxTimeMs },
        )
        .toArray();
      return Number(rows[0]?.actors ?? 0);
    } catch (error) {
      throw mapMongoError(error);
    }
  }

  private toEvent(doc: MongoDoc): StoredEvent {
    const { ts, name, actorType, params } = doc;
    if (!(ts instanceof Date) || typeof name !== 'string' || typeof actorType !== 'string') {
      throw malformedError('stored event has an unexpected shape');
    }
    const event: { -readonly [K in keyof StoredEvent]: StoredEvent[K] } = {
      ts,
      name,
      actorType,
      params: typeof params === 'object' && params !== null ? (params as MongoDoc) : {},
    };
    for (const key of ID_FIELDS) {
      const value = doc[key];
      if (value !== undefined && value !== null) event[key] = this.ids.decode(value);
    }
    if (typeof doc.platform === 'string') event.platform = doc.platform;
    if (typeof doc.appVersion === 'string') event.appVersion = doc.appVersion;
    return event;
  }
}
