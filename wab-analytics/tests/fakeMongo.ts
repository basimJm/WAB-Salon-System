import type {
  MongoCollectionLike,
  MongoCursorLike,
  MongoDoc,
  MongoFindCursorLike,
} from '../src/adapters/mongo/types';
import { dayKey } from '../src/time';

type Operators = Record<string, unknown>;

const rejectWith = (failure: unknown): Promise<never> =>
  Promise.reject(failure instanceof Error ? failure : new Error(String(failure)));

const same = (a: unknown, b: unknown): boolean =>
  a instanceof Date && b instanceof Date
    ? a.getTime() === b.getTime()
    : JSON.stringify(a) === JSON.stringify(b);

const matchesField = (value: unknown, condition: unknown): boolean => {
  const isOperators =
    typeof condition === 'object' &&
    condition !== null &&
    !(condition instanceof Date) &&
    Object.keys(condition).some((key) => key.startsWith('$'));
  if (isOperators) {
    const ops = condition as Operators;
    if ('$gte' in ops && !((value as Date) >= (ops.$gte as Date))) return false;
    if ('$lt' in ops && !((value as Date) < (ops.$lt as Date))) return false;
    if ('$in' in ops && !(ops.$in as unknown[]).some((item) => same(item, value))) return false;
    if ('$exists' in ops && (value !== undefined) !== ops.$exists) return false;
    return true;
  }
  return same(value, condition);
};

const matches = (doc: MongoDoc, filter: MongoDoc): boolean =>
  Object.entries(filter).every(([key, condition]) => {
    if (key === '$or') {
      return (condition as MongoDoc[]).some((branch) => matches(doc, branch));
    }
    return matchesField(doc[key], condition);
  });

const keyOf = (doc: MongoDoc, expression: unknown): unknown => {
  if (typeof expression === 'string') return doc[expression.slice(1)];
  const spec = expression as { $dateToString?: { date: string; timezone: string } };
  if (spec.$dateToString !== undefined) {
    return dayKey(doc.ts as Date, spec.$dateToString.timezone);
  }
  const object: Record<string, unknown> = {};
  for (const [name, inner] of Object.entries(expression as MongoDoc)) {
    object[name] = keyOf(doc, inner);
  }
  return JSON.stringify(object);
};

export class FakeCursor implements MongoFindCursorLike {
  private order: 1 | -1 | undefined;
  private max: number | undefined;
  constructor(
    private readonly docs: MongoDoc[],
    private readonly fail?: unknown,
  ) {}
  sort(spec: Record<string, 1 | -1>): this {
    this.order = spec.ts;
    return this;
  }
  limit(count: number): this {
    this.max = count;
    return this;
  }
  toArray(): Promise<MongoDoc[]> {
    if (this.fail !== undefined) return rejectWith(this.fail);
    const sorted = [...this.docs];
    if (this.order !== undefined) {
      const direction = this.order;
      sorted.sort((a, b) => ((a.ts as Date).getTime() - (b.ts as Date).getTime()) * direction);
    }
    return Promise.resolve(this.max === undefined ? sorted : sorted.slice(0, this.max));
  }
}

/** In-memory stand-in for a MongoDB collection: just the shapes the adapter issues. */
export class FakeCollection implements MongoCollectionLike {
  readonly docs: MongoDoc[] = [];
  readonly indexes: { spec: Record<string, 1 | -1>; options?: MongoDoc | undefined }[] = [];
  readonly calls: { method: string; args: unknown[] }[] = [];
  failure: unknown;

  insertOne(doc: MongoDoc): Promise<unknown> {
    this.calls.push({ method: 'insertOne', args: [doc] });
    if (this.failure !== undefined) return rejectWith(this.failure);
    this.docs.push(doc);
    return Promise.resolve({});
  }

  find(filter: MongoDoc, options?: MongoDoc): FakeCursor {
    this.calls.push({ method: 'find', args: [filter, options] });
    return new FakeCursor(
      this.docs.filter((doc) => matches(doc, filter)),
      this.failure,
    );
  }

  aggregate(pipeline: MongoDoc[], options?: MongoDoc): MongoCursorLike {
    this.calls.push({ method: 'aggregate', args: [pipeline, options] });
    const failure = this.failure;
    return {
      toArray: (): Promise<MongoDoc[]> => {
        if (failure !== undefined) return rejectWith(failure);
        return Promise.resolve(this.runPipeline(pipeline));
      },
    };
  }

  private runPipeline(pipeline: MongoDoc[]): MongoDoc[] {
    let rows: MongoDoc[] = this.docs;
    for (const stage of pipeline) {
      if ('$match' in stage) {
        rows = rows.filter((doc) => matches(doc, stage.$match as MongoDoc));
      } else if ('$group' in stage) {
        const group = stage.$group as { _id: unknown; count?: unknown };
        const buckets = new Map<string, MongoDoc>();
        for (const doc of rows) {
          const id = keyOf(doc, group._id);
          const key = String(id);
          const bucket = buckets.get(key) ?? { _id: id, count: 0 };
          bucket.count = (bucket.count as number) + 1;
          buckets.set(key, bucket);
        }
        rows = [...buckets.values()];
      } else if ('$sort' in stage) {
        rows = [...rows].sort((a, b) => String(a._id).localeCompare(String(b._id)));
      } else if ('$count' in stage) {
        rows = rows.length === 0 ? [] : [{ [stage.$count as string]: rows.length }];
      }
    }
    return rows;
  }

  updateOne(filter: MongoDoc, update: MongoDoc, options?: MongoDoc): Promise<unknown> {
    this.calls.push({ method: 'updateOne', args: [filter, update, options] });
    if (this.failure !== undefined) return rejectWith(this.failure);
    if (!this.docs.some((doc) => matches(doc, filter))) {
      this.docs.push({ ...filter, ...((update.$setOnInsert as MongoDoc | undefined) ?? {}) });
    }
    return Promise.resolve({});
  }

  createIndex(spec: Record<string, 1 | -1>, options?: MongoDoc): Promise<unknown> {
    if (this.failure !== undefined) return rejectWith(this.failure);
    this.indexes.push({ spec, options });
    return Promise.resolve('ok');
  }
}
