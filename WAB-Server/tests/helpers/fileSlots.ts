import { createFileSlots, type FileSlots, type SlotLock } from '../../src/domain/files/fileSlots.service';
import { createStorageCleanup, type StorageCleanup } from '../../src/domain/files/storageCleanup.service';
import { createUploadsService, type UploadVerifier } from '../../src/domain/uploads/uploads.service';
import type { UploadOwnerType, UploadPurpose } from '../../src/constants/uploads';
import type { FakeStorageProvider } from '../../src/providers/storage';
import { StorageCleanupsRepository } from '../../src/repositories/storageCleanups.repository';
import { UploadsRepository } from '../../src/repositories/uploads.repository';
import { createLogger } from '../../src/utils/logger';
import { createFakeModel, type FakeModel } from './fakeModel';

/** Serialises tasks per key, like the Redis slot lock of the server. */
export const memorySlotLock = (): SlotLock => {
  const tails = new Map<string, Promise<unknown>>();
  return <T>(key: string, task: () => Promise<T>): Promise<T> => {
    const run = (tails.get(key) ?? Promise.resolve()).then(task, task);
    tails.set(
      key,
      run.catch(() => undefined),
    );
    return run;
  };
};

export interface FileSlotsKit {
  readonly slots: FileSlots;
  readonly cleanup: StorageCleanup;
  readonly verifier: UploadVerifier;
  readonly uploads: UploadsRepository;
  readonly uploadsModel: FakeModel;
  readonly cleanupsModel: FakeModel;
  /** A confirmed temporary upload (presign + PUT + confirm) with its object in storage. */
  confirmed(
    key: string,
    owner: { purpose: UploadPurpose; ownerType: UploadOwnerType; ownerId: string; salonId?: string },
    contentType?: string,
  ): Promise<string>;
  /** Object keys waiting in the cleanup outbox. */
  queued(): string[];
}

/** Real file slots + cleanup over fake Mongo models and the given fake storage (SRV-181). */
export const fileSlotsKit = (storage: FakeStorageProvider): FileSlotsKit => {
  const uploadsModel = createFakeModel();
  const cleanupsModel = createFakeModel();
  const uploads = new UploadsRepository(uploadsModel.model as never);
  const logger = createLogger({ level: 'silent' });
  const verifier = createUploadsService({
    uploads,
    storage,
    settings: { get: () => Promise.resolve(10) as never },
  });
  const cleanup = createStorageCleanup({
    cleanups: new StorageCleanupsRepository(cleanupsModel.model as never),
    uploads,
    storage,
    logger,
  });
  const slots = createFileSlots({
    uploads,
    verifier,
    storage,
    cleanup,
    lock: memorySlotLock(),
    logger,
  });
  return {
    slots,
    cleanup,
    verifier,
    uploads,
    uploadsModel,
    cleanupsModel,
    async confirmed(key, owner, contentType = 'image/jpeg') {
      await uploads.create({
        key,
        purpose: owner.purpose,
        ownerType: owner.ownerType,
        ownerId: owner.ownerId,
        ...(owner.salonId === undefined ? {} : { salonId: owner.salonId as never }),
        contentType,
        maxBytes: 1_000_000,
        status: 'CONFIRMED',
        expiresAt: new Date(Date.now() + 3_600_000),
      });
      await storage.write({
        key,
        body: Buffer.from(`content of ${key}`),
        contentType,
        visibility: owner.purpose === 'LICENSE_DOCUMENT' || owner.purpose === 'MEDICAL_LICENSE' ? 'PRIVATE' : 'PUBLIC',
      });
      return key;
    },
    queued: () => cleanupsModel.docs.map((doc) => String(doc['key'])),
  };
};
