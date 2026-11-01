import {
  createFileSlots,
  type SlotLock,
  type SlotTarget,
} from '../src/domain/files/fileSlots.service';
import { createStorageCleanup } from '../src/domain/files/storageCleanup.service';
import { createUploadsService } from '../src/domain/uploads/uploads.service';
import { SLOT_KEYS } from '../src/constants/uploads';
import { FakeStorageProvider } from '../src/providers/storage';
import { formatFileRef, parseFileRef } from '../src/providers/storage/fileRef';
import { StorageCleanupsRepository } from '../src/repositories/storageCleanups.repository';
import { UploadsRepository } from '../src/repositories/uploads.repository';
import { ExternalServiceError, ValidationError } from '../src/utils/errors';
import { createLogger } from '../src/utils/logger';
import { createFakeModel } from './helpers/fakeModel';

const logger = createLogger({ level: 'silent' });
const CUSTOMER = '64b000000000000000000001';
const OTHER = '64b000000000000000000002';
const AT = new Date('2026-11-01T10:00:00.000Z');
const LATER = new Date('2026-11-02T10:00:00.000Z');
const target: SlotTarget = {
  purpose: 'CUSTOMER_AVATAR',
  key: SLOT_KEYS.customerAvatar(CUSTOMER),
  ownerType: 'CUSTOMER',
  ownerId: CUSTOMER,
};

/** Serialises tasks per key, like the Redis lock in the server. */
const memoryLock = (): SlotLock => {
  const tails = new Map<string, Promise<unknown>>();
  return <T>(key: string, task: () => Promise<T>): Promise<T> => {
    const previous = tails.get(key) ?? Promise.resolve();
    const run = previous.then(task, task);
    tails.set(
      key,
      run.catch(() => undefined),
    );
    return run;
  };
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- test rig, inferred shape
const setup = (clock: { now: Date } = { now: AT }) => {
  const uploadsModel = createFakeModel();
  const cleanupsModel = createFakeModel();
  const uploadsRepo = new UploadsRepository(uploadsModel.model as never);
  const cleanups = new StorageCleanupsRepository(cleanupsModel.model as never);
  const storage = new FakeStorageProvider({ now: () => clock.now });
  const verifier = createUploadsService({
    uploads: uploadsRepo,
    storage,
    settings: { get: () => Promise.resolve(10) as never },
  });
  const cleanup = createStorageCleanup({
    cleanups,
    uploads: uploadsRepo,
    storage,
    logger,
    now: () => clock.now,
  });
  const generated: string[] = [];
  const slots = createFileSlots({
    uploads: uploadsRepo,
    verifier,
    storage,
    cleanup,
    lock: memoryLock(),
    logger,
    variants: {
      generate: (key) => {
        generated.push(key);
        return Promise.resolve({ created: [] });
      },
    },
    now: () => clock.now,
  });
  /** A confirmed temporary upload of `owner` with the given bytes (presign + PUT + confirm). */
  const tempUpload = async (key: string, body: string, owner = CUSTOMER): Promise<string> => {
    await uploadsRepo.create({
      key,
      purpose: 'CUSTOMER_AVATAR',
      ownerType: 'CUSTOMER',
      ownerId: owner,
      contentType: 'image/jpeg',
      maxBytes: 1_000,
      status: 'CONFIRMED',
      expiresAt: LATER,
    });
    await storage.write({
      key,
      body: Buffer.from(body),
      contentType: 'image/jpeg',
      visibility: 'PUBLIC',
    });
    return key;
  };
  /** The entity field the slot writes into (a customer's avatarKey). */
  const entity: { avatarKey?: string } = {};
  const commit = (ref: string): Promise<void> => {
    entity.avatarKey = ref;
    return Promise.resolve();
  };
  const replace = (incoming: string, owner = CUSTOMER): Promise<string> =>
    slots.replace({
      target,
      current: entity.avatarKey,
      incoming,
      field: 'body.key',
      accept: (upload) => upload.ownerType === 'CUSTOMER' && upload.ownerId === owner,
      commit,
    });
  const slotRows = (): Record<string, unknown>[] =>
    uploadsModel.docs.filter((doc) => doc['key'] === target.key);
  return {
    uploadsModel,
    cleanupsModel,
    uploadsRepo,
    storage,
    cleanup,
    slots,
    tempUpload,
    entity,
    replace,
    slotRows,
    generated,
  };
};

describe('file slots (SRV-181): create, read, replace by the same file id and key', () => {
  it('first upload: copies onto the slot key, version 1, one file record, temp consumed and queued', async () => {
    const t = setup();
    const temp = await t.tempUpload('customers/c/tmp1.jpg', 'first');
    const ref = await t.replace(temp);
    expect(ref).toBe(formatFileRef(target.key, 1));
    expect(t.entity.avatarKey).toBe(ref);
    await expect(t.storage.read(target.key)).resolves.toEqual(Buffer.from('first'));
    expect(t.slotRows()).toHaveLength(1);
    expect(t.slotRows()[0]).toMatchObject({ slot: true, version: 1, status: 'CONFIRMED', size: 5 });
    expect(t.uploadsModel.docs.find((d) => d['key'] === temp)?.['status']).toBe('CONSUMED');
    expect(t.cleanupsModel.docs.map((d) => d['key'])).toEqual(
      expect.arrayContaining([temp, 'customers/c/tmp1_thumb.webp', 'customers/c/tmp1_medium.webp']),
    );
    expect(t.generated).toEqual([target.key]);
    // READ: the public URL is the slot key with its version, so caches refresh on replacement.
    expect(t.storage.getPublicUrl(ref)).toMatch(/customers\/64b0+1\/profile\/avatar\?v=1$/);
  });

  it('replacement keeps the file id and key, bumps the version, replaces the content, no duplicate', async () => {
    const t = setup();
    await t.replace(await t.tempUpload('customers/c/tmp1.jpg', 'first'));
    const fileId = String(t.slotRows()[0]?.['_id']);
    const ref = await t.replace(await t.tempUpload('customers/c/tmp2.jpg', 'second!'));
    expect(parseFileRef(ref)).toEqual({ key: target.key, version: 2 });
    expect(t.slotRows()).toHaveLength(1);
    expect(String(t.slotRows()[0]?.['_id'])).toBe(fileId);
    expect(t.slotRows()[0]).toMatchObject({ version: 2, size: 7 });
    await expect(t.storage.read(target.key)).resolves.toEqual(Buffer.from('second!'));
    // Both temporary uploads leave storage once the queue drains: no second file stays behind.
    await t.cleanup.drain();
    expect(t.storage.has('customers/c/tmp1.jpg')).toBe(false);
    expect(t.storage.has('customers/c/tmp2.jpg')).toBe(false);
    expect(t.storage.has(target.key)).toBe(true);
  });

  it('sending the current reference (or an older version of the slot) changes nothing', async () => {
    const t = setup();
    const ref = await t.replace(await t.tempUpload('customers/c/tmp1.jpg', 'first'));
    const copies = t.storage.copies;
    await expect(t.replace(ref)).resolves.toBe(ref);
    await expect(t.replace(formatFileRef(target.key, 9))).resolves.toBe(ref);
    expect(t.storage.copies).toBe(copies);
  });

  it('a legacy plain key (from before slots) is queued with its variants after the switch', async () => {
    const t = setup();
    t.entity.avatarKey = 'customers/c/old.jpg';
    await t.storage.write({
      key: 'customers/c/old.jpg',
      body: Buffer.from('old'),
      contentType: 'image/jpeg',
      visibility: 'PUBLIC',
    });
    await t.replace(await t.tempUpload('customers/c/tmp1.jpg', 'first'));
    expect(t.cleanupsModel.docs.map((d) => d['key'])).toEqual(
      expect.arrayContaining(['customers/c/old.jpg', 'customers/c/old_thumb.webp']),
    );
    await t.cleanup.drain();
    expect(t.storage.has('customers/c/old.jpg')).toBe(false);
  });
});

describe('file slots: delete', () => {
  it('unsets the entity first, then deletes the record and the object (idempotent)', async () => {
    const t = setup();
    await t.replace(await t.tempUpload('customers/c/tmp1.jpg', 'first'));
    const order: string[] = [];
    await t.slots.remove({
      target,
      current: t.entity.avatarKey,
      commit: () => {
        order.push(
          t.storage.has(target.key) ? 'commit-while-object-exists' : 'commit-after-delete',
        );
        delete t.entity.avatarKey;
        return Promise.resolve();
      },
    });
    expect(order).toEqual(['commit-while-object-exists']);
    expect(t.slotRows()).toHaveLength(0);
    await expect(t.cleanup.drain()).resolves.toMatchObject({ failed: 0 });
    expect(t.storage.has(target.key)).toBe(false);
    // Already deleted: removing again and draining again are harmless.
    await t.slots.remove({ target, current: undefined, commit: () => Promise.resolve() });
    await t.cleanup.enqueue([target.key], 'SLOT_REMOVED');
    await expect(t.cleanup.drain()).resolves.toEqual({ deleted: 1, kept: 0, failed: 0 });
  });

  it('a slot set again before the queue drains is kept (no deletion of live content)', async () => {
    const t = setup();
    await t.replace(await t.tempUpload('customers/c/tmp1.jpg', 'first'));
    await t.slots.remove({ target, current: t.entity.avatarKey, commit: () => Promise.resolve() });
    delete t.entity.avatarKey;
    await t.replace(await t.tempUpload('customers/c/tmp2.jpg', 'again'));
    await t.cleanup.drain();
    await expect(t.storage.read(target.key)).resolves.toEqual(Buffer.from('again'));
  });

  it('demo files are never queued', async () => {
    const t = setup();
    await t.cleanup.enqueue(['demo/salons/lamar/cover.jpg', undefined, 'bad key!'], 'FILE_REMOVED');
    expect(t.cleanupsModel.docs).toHaveLength(0);
  });
});

describe('file slots: failures keep the previous file', () => {
  it('a temporary upload that vanished is refused and nothing changes', async () => {
    const t = setup();
    const ref = await t.replace(await t.tempUpload('customers/c/tmp1.jpg', 'first'));
    const temp = await t.tempUpload('customers/c/tmp2.jpg', 'second');
    await t.storage.delete([temp]);
    await expect(t.replace(temp)).rejects.toBeInstanceOf(ValidationError);
    expect(t.entity.avatarKey).toBe(ref);
    await expect(t.storage.read(target.key)).resolves.toEqual(Buffer.from('first'));
    expect(t.slotRows()[0]).toMatchObject({ version: 1 });
  });

  it('a provider failure during the copy leaves the previous file and reference', async () => {
    const t = setup();
    const ref = await t.replace(await t.tempUpload('customers/c/tmp1.jpg', 'first'));
    const temp = await t.tempUpload('customers/c/tmp2.jpg', 'second');
    jest
      .spyOn(t.storage, 'copy')
      .mockRejectedValueOnce(new ExternalServiceError({ unavailable: true }));
    await expect(t.replace(temp)).rejects.toBeInstanceOf(ExternalServiceError);
    expect(t.entity.avatarKey).toBe(ref);
    await expect(t.storage.read(target.key)).resolves.toEqual(Buffer.from('first'));
    // The client may retry with the same upload.
    await expect(t.replace(temp)).resolves.toBe(formatFileRef(target.key, 2));
  });

  it('a failed deletion stays queued with backoff and succeeds on a later run', async () => {
    const clock = { now: AT };
    const t = setup(clock);
    await t.cleanup.enqueue(['customers/c/x.jpg'], 'FILE_REMOVED');
    jest
      .spyOn(t.storage, 'delete')
      .mockRejectedValueOnce(new ExternalServiceError({ unavailable: true }));
    await expect(t.cleanup.drain()).resolves.toEqual({ deleted: 0, kept: 0, failed: 1 });
    expect(t.cleanupsModel.docs[0]).toMatchObject({
      attempts: 1,
      lastError: 'ExternalServiceError',
    });
    await expect(t.cleanup.drain()).resolves.toEqual({ deleted: 0, kept: 0, failed: 0 });
    clock.now = LATER;
    await expect(t.cleanup.drain()).resolves.toEqual({ deleted: 1, kept: 0, failed: 0 });
    expect(t.cleanupsModel.docs).toHaveLength(0);
  });
});

describe('file slots: tenancy and concurrency', () => {
  it("never accepts another customer's upload (nothing copied)", async () => {
    const t = setup();
    const foreign = await t.tempUpload('customers/o/tmp1.jpg', 'theirs', OTHER);
    await expect(t.replace(foreign)).rejects.toBeInstanceOf(ValidationError);
    expect(t.storage.copies).toBe(0);
    expect(t.entity.avatarKey).toBeUndefined();
  });

  it('concurrent replacements queue on the slot: distinct versions, last commit = stored content', async () => {
    const t = setup();
    const a = await t.tempUpload('customers/c/tmpA.jpg', 'AAAA');
    const b = await t.tempUpload('customers/c/tmpB.jpg', 'BBBBBB');
    const refs = await Promise.all([t.replace(a), t.replace(b)]);
    expect(refs.map((ref) => parseFileRef(ref).version).sort()).toEqual([1, 2]);
    expect(t.slotRows()).toHaveLength(1);
    const last = refs.find((ref) => parseFileRef(ref).version === 2);
    expect(t.entity.avatarKey).toBe(last);
    await expect(t.storage.read(target.key)).resolves.toEqual(Buffer.from('BBBBBB'));
  });
});
