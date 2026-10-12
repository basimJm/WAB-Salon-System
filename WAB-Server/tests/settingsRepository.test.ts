import type { Model } from 'mongoose';
import { SETTINGS_COLLECTION } from '../src/constants/settings';
import { SettingModel, type SettingRaw } from '../src/models/setting.model';
import { SettingsRepository } from '../src/repositories/settings.repository';
import { ConflictError } from '../src/utils/errors';
import { isDuplicateKeyError } from '../src/utils/database/errors';
import { normalizeError } from '../src/utils/errors/normalize';
import { createFakeModel } from './helpers/fakeModel';

const duplicateKey = (): Error =>
  Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });

describe('setting model', () => {
  it('lives in the settings collection with timestamps and a unique key', () => {
    expect(SETTINGS_COLLECTION).toBe('settings');
    expect(SettingModel.collection.name).toBe('settings');
    expect(SettingModel.schema.get('timestamps')).toBe(true);
    expect(SettingModel.schema.indexes()).toEqual([
      [{ key: 1 }, expect.objectContaining({ unique: true })],
    ]);
  });

  /** Names of the fields that fail validation (empty when the document is valid). */
  const failingFields = async (data: object): Promise<string[]> => {
    try {
      await new SettingModel(data).validate();
      return [];
    } catch (error) {
      return Object.keys((error as { errors?: Record<string, unknown> }).errors ?? {}).sort();
    }
  };

  it('requires a key and a value', async () => {
    expect(await failingFields({})).toEqual(['key', 'value']);
    expect(await failingFields({ key: 'a' })).toEqual(['value']);
    expect(await failingFields({ value: 1 })).toEqual(['key']);
  });

  it.each([0, false, 'text', [], [60, 15], {}, { count: 5 }])(
    'accepts the value %j',
    async (value) => {
      expect(await failingFields({ key: 'a.b', value })).toEqual([]);
    },
  );
});

describe('settings repository', () => {
  it('has no settings until one is saved', async () => {
    const repository = new SettingsRepository(
      createFakeModel().model as unknown as Model<SettingRaw>,
    );
    expect(await repository.findAllEntries()).toEqual([]);
  });

  it('creates a key on first use and updates the same document afterwards', async () => {
    const fake = createFakeModel();
    const repository = new SettingsRepository(fake.model as unknown as Model<SettingRaw>);

    const created = await repository.upsert('booking.slotMinutes', 30);
    expect(created).toMatchObject({ key: 'booking.slotMinutes', value: 30 });
    expect(created.id).toEqual(expect.any(String));
    expect(fake.docs).toHaveLength(1);

    const updated = await repository.upsert('booking.slotMinutes', 20);
    expect(updated).toMatchObject({ id: created.id, key: 'booking.slotMinutes', value: 20 });
    expect(updated.createdAt).toEqual(created.createdAt);
    expect(fake.docs).toHaveLength(1);

    await repository.upsert('otp.length', 8);
    const all = await repository.findAllEntries();
    expect(all.map(({ key, value }) => [key, value]).sort()).toEqual([
      ['booking.slotMinutes', 20],
      ['otp.length', 8],
    ]);
  });

  it.each([0, false, '', [], [60, 15], { count: 5, nested: { ok: true } }])(
    'stores the value %j as it is',
    async (value) => {
      const repository = new SettingsRepository(
        createFakeModel().model as unknown as Model<SettingRaw>,
      );
      await repository.upsert('some.key', value);
      expect((await repository.findAllEntries())[0]?.value).toEqual(value);
    },
  );

  describe('when two first-time saves of one key race', () => {
    const stub = (
      outcomes: (Error | object)[],
    ): { model: Model<SettingRaw>; calls: unknown[][] } => {
      const calls: unknown[][] = [];
      const model = {
        findOneAndUpdate: (...args: unknown[]) => {
          calls.push(args);
          const outcome = outcomes.shift();
          return {
            lean: () => ({
              exec: () =>
                outcome instanceof Error ? Promise.reject(outcome) : Promise.resolve(outcome),
            }),
          };
        },
      };
      return { model: model as unknown as Model<SettingRaw>, calls };
    };
    const stored = { _id: '64b7f0f2a1b2c3d4e5f60718', key: 'a', value: 2 };

    it('retries once as a plain update when the unique index refuses the insert', async () => {
      const { model, calls } = stub([duplicateKey(), stored]);
      const result = await new SettingsRepository(model).upsert('a', 2);
      expect(result).toMatchObject({ id: stored._id, key: 'a', value: 2 });
      expect(calls).toHaveLength(2);
      expect(calls[0]).toEqual([
        { key: 'a' },
        { $set: { value: 2 } },
        { upsert: true, new: true, runValidators: true },
      ]);
    });

    it('gives up after the second refusal, as a 409 conflict', async () => {
      const { model, calls } = stub([duplicateKey(), duplicateKey()]);
      const failure = await new SettingsRepository(model)
        .upsert('a', 2)
        .catch((error: unknown) => error);
      expect(calls).toHaveLength(2);
      expect(normalizeError(failure)).toBeInstanceOf(ConflictError);
    });

    it('does not retry any other failure', async () => {
      const boom = new Error('connection lost');
      const { model, calls } = stub([boom]);
      await expect(new SettingsRepository(model).upsert('a', 2)).rejects.toBe(boom);
      expect(calls).toHaveLength(1);
    });
  });
});

describe('isDuplicateKeyError', () => {
  it('recognises MongoDB error 11000 and nothing else', () => {
    expect(isDuplicateKeyError(duplicateKey())).toBe(true);
    expect(isDuplicateKeyError({ code: 11_000 })).toBe(true);
    for (const other of [
      { code: 11_001 },
      { code: '11000' },
      {},
      new Error('x'),
      null,
      undefined,
      'x',
      11_000,
    ]) {
      expect(isDuplicateKeyError(other)).toBe(false);
    }
  });
});
