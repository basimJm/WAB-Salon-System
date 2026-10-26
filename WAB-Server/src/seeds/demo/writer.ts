import type { Types } from 'mongoose';
import { isDuplicateKeyError } from '../../utils/database/errors';
import { DEMO_COLLECTIONS, type DemoCollection, type DemoDataset, type DemoDoc } from './types';

/** Insert-only outcome per collection: existing rows (same id or same natural key) are left alone. */
export interface DemoWriteCount {
  readonly created: number;
  readonly existing: number;
}
export type DemoWriteResult = Record<DemoCollection, DemoWriteCount>;

/** The subset of a Mongoose model the writer needs (lets tests pass an in-memory stand-in). */
export interface DemoModel {
  readonly modelName: string;
  find(filter: object, projection: object): { lean(): Promise<{ _id: unknown }[]> };
  insertMany(docs: object[], options: { ordered: boolean }): Promise<unknown>;
  validateDoc(doc: object): Error | null;
}

/** The parts of a Mongoose model the adapter calls (every model in `ALL_MODELS` has them). */
interface MongooseModelLike {
  readonly modelName: string;
  find(filter: object, projection: object): { lean(): Promise<{ _id: unknown }[]> };
  insertMany(docs: object[], options: { ordered: boolean }): Promise<unknown>;
  new (doc: object): { validateSync(): Error | undefined | null };
}

/** Adapts a Mongoose model; validation runs before anything is written so a bad row fails loudly. */
export const toDemoModel = (model: unknown): DemoModel => {
  const typed = model as MongooseModelLike;
  return {
    modelName: typed.modelName,
    find: (filter, projection) => typed.find(filter, projection),
    insertMany: (docs, options) => typed.insertMany(docs, options),
    validateDoc: (doc) => new typed(doc).validateSync() ?? null,
  };
};

/** Ids among `ids` that are already stored. */
export const storedIds = async (
  model: DemoModel,
  ids: readonly Types.ObjectId[],
): Promise<Set<string>> => {
  if (ids.length === 0) return new Set();
  const stored = await model.find({ _id: { $in: ids } }, { _id: 1 }).lean();
  return new Set(stored.map((row) => String(row._id)));
};

const writtenCount = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) return undefined;
  const result = error as { insertedDocs?: unknown[]; result?: { insertedCount?: number } };
  return result.insertedDocs?.length ?? result.result?.insertedCount;
};

/** True when every failed row of a bulk insert collided on a unique key (nothing else went wrong). */
const onlyDuplicates = (error: unknown): boolean => {
  const writeErrors = (error as { writeErrors?: unknown[] } | null)?.writeErrors;
  return Array.isArray(writeErrors) && writeErrors.length > 0
    ? writeErrors.every(
        (item) => isDuplicateKeyError(item) || isDuplicateKeyError((item as { err?: unknown }).err),
      )
    : isDuplicateKeyError(error);
};

/**
 * Validates every row of every collection first, then inserts the rows whose id is not stored yet.
 * A duplicate natural key (an admin already created the same content page, say) counts as existing.
 */
export const writeDemoDataset = async (
  dataset: DemoDataset,
  models: ReadonlyMap<string, DemoModel>,
): Promise<DemoWriteResult> => {
  const problems: string[] = [];
  for (const collection of DEMO_COLLECTIONS) {
    const model = models.get(collection);
    if (model === undefined) {
      problems.push(`${collection}: no model`);
      continue;
    }
    for (const doc of dataset[collection]) {
      const error = model.validateDoc(doc);
      if (error !== null) problems.push(`${collection} ${doc._id.toString()}: ${error.message}`);
    }
  }
  if (problems.length > 0) throw new Error(`demo data is invalid:\n${problems.join('\n')}`);

  const result = {} as Record<DemoCollection, DemoWriteCount>;
  for (const collection of DEMO_COLLECTIONS) {
    const model = models.get(collection) as DemoModel;
    const docs: DemoDoc[] = dataset[collection];
    const known = await storedIds(
      model,
      docs.map((doc) => doc._id),
    );
    const fresh = docs.filter((doc) => !known.has(doc._id.toString()));
    let created = fresh.length;
    if (fresh.length > 0) {
      try {
        await model.insertMany(fresh, { ordered: false });
      } catch (error) {
        if (!onlyDuplicates(error)) throw error;
        created = writtenCount(error) ?? 0;
      }
    }
    result[collection] = { created, existing: docs.length - created };
  }
  return result;
};

/**
 * Writes the base demo data set unless an earlier run finished it (SRV-160). Collections are
 * written in `DEMO_COLLECTIONS` order, so a stored last upload means every row went in. The rows
 * depend on the day of the run (bookings around "now"): writing them again on another day would
 * add appointments that overlap the stored ones, so a finished base is never written again.
 */
export const writeDemoBaseOnce = async (
  dataset: DemoDataset,
  models: ReadonlyMap<string, DemoModel>,
): Promise<DemoWriteResult | 'already seeded'> => {
  const last = dataset.Upload[dataset.Upload.length - 1];
  const uploads = models.get('Upload');
  if (last !== undefined && uploads !== undefined) {
    const stored = await storedIds(uploads, [last._id]);
    if (stored.size > 0) return 'already seeded';
  }
  return writeDemoDataset(dataset, models);
};
