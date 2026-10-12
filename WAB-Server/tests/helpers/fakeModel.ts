import { Types, type Model } from 'mongoose';

type Doc = Record<string, unknown>;
type Filter = Record<string, unknown>;

const isOperatorObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' &&
  value !== null &&
  !(value instanceof Date) &&
  !(value instanceof Types.ObjectId) &&
  Object.keys(value).some((key) => key.startsWith('$'));

const same = (a: unknown, b: unknown): boolean => String(a) === String(b);

const matchesCondition = (actual: unknown, condition: unknown): boolean => {
  if (!isOperatorObject(condition)) return same(actual, condition);
  return Object.entries(condition).every(([operator, expected]) => {
    switch (operator) {
      case '$ne':
        return !same(actual, expected);
      case '$in':
        return (expected as unknown[]).some((item) => same(actual, item));
      case '$nin':
        return !(expected as unknown[]).some((item) => same(actual, item));
      case '$gt':
        return (actual as number) > (expected as number);
      case '$gte':
        return (actual as number) >= (expected as number);
      case '$lt':
        return (actual as number) < (expected as number);
      case '$lte':
        return (actual as number) <= (expected as number);
      default:
        throw new Error(`fake model does not support ${operator}`);
    }
  });
};

/** Reads `a.b` from nested documents, like a MongoDB dotted path. */
const valueAt = (doc: Doc, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (value, part) =>
        typeof value === 'object' && value !== null ? (value as Doc)[part] : undefined,
      doc,
    );

export const matches = (doc: Doc, filter: Filter): boolean =>
  Object.entries(filter).every(([key, condition]) => {
    if (key === '$and') return (condition as Filter[]).every((part) => matches(doc, part));
    if (key === '$or') return (condition as Filter[]).some((part) => matches(doc, part));
    return matchesCondition(valueAt(doc, key), condition);
  });

class FakeQuery<T> implements PromiseLike<T> {
  private sortSpec: Record<string, 1 | -1> = {};
  private skipCount = 0;
  private limitCount = Infinity;

  constructor(private readonly run: (query: FakeQuery<T>) => T) {}

  sort(spec: Record<string, 1 | -1>): this {
    this.sortSpec = spec;
    return this;
  }
  skip(count: number): this {
    this.skipCount = count;
    return this;
  }
  limit(count: number): this {
    this.limitCount = count;
    return this;
  }
  lean(): this {
    return this;
  }
  exec(): Promise<T> {
    return Promise.resolve(this.run(this));
  }
  then<R1 = T, R2 = never>(
    onfulfilled?: ((value: T) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return this.exec().then(onfulfilled, onrejected);
  }

  /** Applies sort, skip and limit to matching documents. */
  window(docs: Doc[]): Doc[] {
    const keys = Object.entries(this.sortSpec);
    const sorted = [...docs].sort((a, b) => {
      for (const [key, direction] of keys) {
        const left = String(a[key] instanceof Date ? a[key].getTime() : a[key]);
        const right = String(b[key] instanceof Date ? b[key].getTime() : b[key]);
        const numeric = typeof a[key] === 'number' || a[key] instanceof Date;
        const order = numeric
          ? Number(left) - Number(right)
          : left < right
            ? -1
            : left > right
              ? 1
              : 0;
        if (order !== 0) return order * direction;
      }
      return 0;
    });
    return sorted.slice(this.skipCount, this.skipCount + this.limitCount);
  }
}

export interface FakeModel {
  /** Cast for use where a Mongoose model is expected. */
  readonly model: Model<never>;
  readonly docs: Doc[];
  readonly calls: { filter: Filter }[];
}

/** In-memory stand-in for the subset of a Mongoose model that `BaseRepository` uses. */
export const createFakeModel = (initial: Doc[] = []): FakeModel => {
  const docs: Doc[] = initial.map((doc) => ({ _id: new Types.ObjectId(), __v: 0, ...doc }));
  const calls: { filter: Filter }[] = [];
  const select = (filter: Filter): Doc[] => {
    calls.push({ filter });
    return docs.filter((doc) => matches(doc, filter));
  };
  const model = {
    create: (data: Doc) => {
      const doc: Doc = {
        _id: new Types.ObjectId(),
        __v: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      docs.push(doc);
      return Promise.resolve({ toObject: () => ({ ...doc }) });
    },
    findOne: (filter: Filter) => new FakeQuery((q) => q.window(select(filter))[0] ?? null),
    find: (filter: Filter) => new FakeQuery((q) => q.window(select(filter))),
    countDocuments: (filter: Filter) => new FakeQuery(() => select(filter).length),
    exists: (filter: Filter) =>
      new FakeQuery(() => (select(filter)[0] ? { _id: select(filter)[0]?._id } : null)),
    findOneAndUpdate: (filter: Filter, update: { $set: Doc }, options: { upsert?: boolean } = {}) =>
      new FakeQuery(() => {
        let doc = select(filter)[0];
        if (!doc) {
          if (options.upsert !== true) return null;
          // Like MongoDB: a new document starts from the equality conditions of the filter.
          doc = {
            _id: new Types.ObjectId(),
            __v: 0,
            createdAt: new Date(),
            ...Object.fromEntries(
              Object.entries(filter).filter(
                ([key, condition]) => !key.startsWith('$') && !isOperatorObject(condition),
              ),
            ),
          };
          docs.push(doc);
        }
        Object.assign(doc, update.$set, { updatedAt: new Date() });
        return { ...doc };
      }),
  };
  return { model: model as unknown as Model<never>, docs, calls };
};
