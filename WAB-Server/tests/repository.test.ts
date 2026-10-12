import { Types, type QueryFilter } from 'mongoose';
import { BaseRepository, isValidId } from '../src/repositories/base.repository';
import { toEntity } from '../src/utils/database/plain';
import { createFakeModel, type FakeModel } from './helpers/fakeModel';

interface Salon {
  name: string;
  status: 'LIVE' | 'DELETED';
  ownerId: Types.ObjectId;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

class SalonRepository extends BaseRepository<Salon> {
  constructor(
    fake: FakeModel,
    private readonly hideDeleted = false,
  ) {
    super(fake.model as never);
  }
  protected override baseFilter(): QueryFilter<Salon> {
    return this.hideDeleted ? { status: { $ne: 'DELETED' } } : {};
  }
}

const owner = new Types.ObjectId();
const seed = (names: string[], status: Salon['status'] = 'LIVE'): Record<string, unknown>[] =>
  names.map((name, index) => ({
    name,
    status,
    ownerId: owner,
    rating: index,
    createdAt: new Date(2026, 0, index + 1),
  }));

describe('toEntity', () => {
  it('replaces _id with a string id, drops __v and converts nested ObjectIds', () => {
    const id = new Types.ObjectId();
    const ref = new Types.ObjectId();
    const at = new Date();
    const entity = toEntity<{
      ref: Types.ObjectId;
      list: Types.ObjectId[];
      nested: { ref: Types.ObjectId };
      at: Date;
    }>({
      _id: id,
      __v: 3,
      ref,
      list: [ref],
      nested: { ref },
      at,
    });
    expect(entity).toEqual({
      id: id.toHexString(),
      ref: ref.toHexString(),
      list: [ref.toHexString()],
      nested: { ref: ref.toHexString() },
      at,
    });
    expect(entity.at).toBe(at);
    expect('__v' in entity).toBe(false);
    expect('_id' in entity).toBe(false);
  });
});

describe('isValidId', () => {
  it.each([
    [new Types.ObjectId().toHexString(), true],
    ['AAAAAAAAAAAAAAAAAAAAAAAA', true],
    ['123', false],
    ['not-an-object-id-xxxxxx', false],
    ['aaaaaaaaaaaa', false],
    ['', false],
    ['{"$ne":null}', false],
  ])('%s → %s', (value, expected) => {
    expect(isValidId(value)).toBe(expected);
  });
});

describe('BaseRepository', () => {
  it('creates and returns a plain entity with a string id and timestamps', async () => {
    const repo = new SalonRepository(createFakeModel());
    const created = await repo.create({ name: 'Rana', status: 'LIVE', ownerId: owner });
    expect(typeof created.id).toBe('string');
    expect(created.ownerId).toBe(owner.toHexString());
    expect(created.createdAt).toBeInstanceOf(Date);
    expect('_id' in created).toBe(false);
  });

  it('finds by id, returns null when missing, and never queries for malformed ids', async () => {
    const fake = createFakeModel(seed(['A']));
    const repo = new SalonRepository(fake);
    const stored = fake.docs[0]?._id as Types.ObjectId;
    expect((await repo.findById(stored.toHexString()))?.name).toBe('A');
    expect(await repo.findById(new Types.ObjectId().toHexString())).toBeNull();
    const before = fake.calls.length;
    expect(await repo.findById('not-an-id')).toBeNull();
    expect(await repo.findById('{"$ne":null}')).toBeNull();
    expect(fake.calls.length).toBe(before);
  });

  it('finds one and many with filters and a stable default order (newest first)', async () => {
    const repo = new SalonRepository(createFakeModel(seed(['A', 'B', 'C'])));
    expect((await repo.findOne({ name: 'B' }))?.name).toBe('B');
    expect(await repo.findOne({ name: 'Z' })).toBeNull();
    expect((await repo.findMany()).map((s) => s.name)).toEqual(['C', 'B', 'A']);
    expect((await repo.findMany({ rating: { $gte: 1 } })).map((s) => s.name)).toEqual(['C', 'B']);
    expect((await repo.findMany({}, { name: 1 })).map((s) => s.name)).toEqual(['A', 'B', 'C']);
  });

  it('applies the base filter to every read and write', async () => {
    const fake = createFakeModel([...seed(['Live']), ...seed(['Gone'], 'DELETED')]);
    const repo = new SalonRepository(fake, true);
    const hidden = fake.docs.find((d) => d['name'] === 'Gone')?._id as Types.ObjectId;
    expect((await repo.findMany()).map((s) => s.name)).toEqual(['Live']);
    expect(await repo.findById(hidden.toHexString())).toBeNull();
    expect(await repo.findOne({ name: 'Gone' })).toBeNull();
    expect(await repo.count()).toBe(1);
    expect(await repo.exists({ name: 'Gone' })).toBe(false);
    expect((await repo.findPage({}, { page: 1, pageSize: 10 })).meta.total).toBe(1);
    expect(await repo.updateById(hidden.toHexString(), { name: 'Revived' })).toBeNull();
    expect(fake.docs.find((d) => d['_id'] === hidden)?.['name']).toBe('Gone');
  });

  it('paginates with skip/limit, total and a deterministic order', async () => {
    const repo = new SalonRepository(createFakeModel(seed(['A', 'B', 'C', 'D', 'E'])));
    const first = await repo.findPage({}, { page: 1, pageSize: 2 }, { name: 1 });
    const second = await repo.findPage({}, { page: 2, pageSize: 2 }, { name: 1 });
    const third = await repo.findPage({}, { page: 3, pageSize: 2 }, { name: 1 });
    const beyond = await repo.findPage({}, { page: 9, pageSize: 2 }, { name: 1 });
    expect(first.items.map((s) => s.name)).toEqual(['A', 'B']);
    expect(second.items.map((s) => s.name)).toEqual(['C', 'D']);
    expect(third.items.map((s) => s.name)).toEqual(['E']);
    expect(first.meta).toEqual({ page: 1, pageSize: 2, total: 5 });
    expect(beyond.items).toEqual([]);
    expect(beyond.meta.total).toBe(5);
  });

  it('counts and checks existence', async () => {
    const repo = new SalonRepository(createFakeModel(seed(['A', 'B'])));
    expect(await repo.count()).toBe(2);
    expect(await repo.count({ name: 'A' })).toBe(1);
    expect(await repo.exists({ name: 'B' })).toBe(true);
    expect(await repo.exists({ name: 'Z' })).toBe(false);
  });

  it('updates only the given fields, ignores undefined, and returns the new entity', async () => {
    const fake = createFakeModel(seed(['A']));
    const repo = new SalonRepository(fake);
    const id = (fake.docs[0]?._id as Types.ObjectId).toHexString();
    const updated = await repo.updateById(id, { name: 'Renamed', rating: undefined });
    expect(updated?.name).toBe('Renamed');
    expect(updated?.rating).toBe(0);
    expect(updated?.id).toBe(id);
  });

  it('returns null when updating a missing or malformed id', async () => {
    const repo = new SalonRepository(createFakeModel(seed(['A'])));
    expect(await repo.updateById(new Types.ObjectId().toHexString(), { name: 'x' })).toBeNull();
    expect(await repo.updateById('bad', { name: 'x' })).toBeNull();
  });
});
