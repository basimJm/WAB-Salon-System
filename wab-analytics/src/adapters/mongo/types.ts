export type MongoDoc = Record<string, unknown>;

export interface MongoCursorLike {
  toArray(): Promise<MongoDoc[]>;
}

export interface MongoFindCursorLike extends MongoCursorLike {
  sort(spec: Record<string, 1 | -1>): MongoFindCursorLike;
  limit(count: number): MongoFindCursorLike;
}

/**
 * The few collection methods the adapter uses. The official `mongodb` driver collection (and
 * `mongoose.connection.collection(name)`) satisfies it; tests inject a fake.
 */
export interface MongoCollectionLike {
  insertOne(doc: MongoDoc): Promise<unknown>;
  find(filter: MongoDoc, options?: MongoDoc): MongoFindCursorLike;
  aggregate(pipeline: MongoDoc[], options?: MongoDoc): MongoCursorLike;
  updateOne(filter: MongoDoc, update: MongoDoc, options?: MongoDoc): Promise<unknown>;
  createIndex(spec: Record<string, 1 | -1>, options?: MongoDoc): Promise<unknown>;
}

/** Converts string ids to the stored type (e.g. ObjectId) and back. */
export interface IdCodec {
  encode(id: string): unknown;
  decode(value: unknown): string;
}

export const identityCodec: IdCodec = {
  encode: (id) => id,
  decode: (value) => String(value),
};
