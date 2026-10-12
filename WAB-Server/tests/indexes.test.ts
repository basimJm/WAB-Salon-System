import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_MODELS } from '../src/models';
import { SettingModel } from '../src/models/setting.model';
import { ensureIndexes, type IndexedModel } from '../src/utils/database/indexes';
import type { Logger } from '../src/utils/logger';

const logger = (): { logger: Logger; info: jest.Mock; error: jest.Mock } => {
  const info = jest.fn();
  const error = jest.fn();
  return { logger: { info, error } as unknown as Logger, info, error };
};

const fakeModel = (modelName: string, calls: string[], failure?: Error): IndexedModel => ({
  modelName,
  createIndexes: () => {
    calls.push(modelName);
    return failure === undefined ? Promise.resolve([]) : Promise.reject(failure);
  },
});

describe('model registry', () => {
  it('lists every *.model.ts file, so no model is left without its indexes', () => {
    const files = readdirSync(join(__dirname, '../src/models')).filter((f) =>
      f.endsWith('.model.ts'),
    );
    expect(ALL_MODELS).toHaveLength(files.length);
    expect(ALL_MODELS).toContain(SettingModel);
  });

  it('only holds models that can create indexes', () => {
    for (const model of ALL_MODELS) {
      expect(typeof model.createIndexes).toBe('function');
      expect(model.modelName).toEqual(expect.any(String));
    }
  });
});

describe('ensureIndexes', () => {
  it('creates the indexes of every model, one after the other, and logs each', async () => {
    const calls: string[] = [];
    const { logger: log, info } = logger();
    await ensureIndexes([fakeModel('A', calls), fakeModel('B', calls)], log);
    expect(calls).toEqual(['A', 'B']);
    expect(info).toHaveBeenCalledWith({ model: 'A' }, 'indexes ready');
    expect(info).toHaveBeenCalledWith({ model: 'B' }, 'indexes ready');
  });

  it('does nothing for an empty list', async () => {
    await expect(ensureIndexes([], logger().logger)).resolves.toBeUndefined();
  });

  it('stops at the first failure, names the model and rethrows the original error', async () => {
    const calls: string[] = [];
    const boom = new Error('not authorized');
    const { logger: log, error } = logger();
    await expect(
      ensureIndexes(
        [fakeModel('A', calls), fakeModel('B', calls, boom), fakeModel('C', calls)],
        log,
      ),
    ).rejects.toBe(boom);
    expect(calls).toEqual(['A', 'B']);
    expect(error).toHaveBeenCalledWith({ err: boom, model: 'B' }, 'creating indexes failed');
  });

  it('is safe to run twice (it only calls createIndexes)', async () => {
    const calls: string[] = [];
    const { logger: log } = logger();
    await ensureIndexes([fakeModel('A', calls)], log);
    await ensureIndexes([fakeModel('A', calls)], log);
    expect(calls).toEqual(['A', 'A']);
  });
});
