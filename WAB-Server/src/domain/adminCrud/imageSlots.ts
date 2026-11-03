import type { SlotPurpose } from '../../constants/uploads';
import { newId, toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import type { Logger } from '../../utils/logger';
import type { FileSlots, SlotTarget } from '../files/fileSlots.service';
import type { AdminActor } from '../auth/accountLifecycle.service';
import type { AdminCrudService, AdminCrudStore } from './adminCrud.service';

type Patch<TRaw> = Parameters<AdminCrudStore<TRaw & object>['updateById']>[1];

/** One single-image field of an admin-managed record (catalog image, banner image per language). */
export interface AdminImageField<TRaw> {
  readonly purpose: SlotPurpose;
  readonly slotKey: (entityId: string) => string;
  /** Request field named in validation errors (e.g. `body.imageKey.ar`). */
  readonly field: string;
  /** Dotted path written in the store (e.g. `imageKey.ar`). */
  readonly path: string;
  /** The value in a request body or a stored record. */
  readonly read: (source: Partial<TRaw> | Patch<TRaw> | Entity<TRaw>) => string | undefined;
}

export interface AdminImageSlotsDeps<TRaw extends object> {
  readonly crud: AdminCrudService<TRaw>;
  readonly store: Pick<AdminCrudStore<TRaw>, 'updateById'>;
  readonly files: Pick<FileSlots, 'replace' | 'remove'>;
  readonly fields: readonly AdminImageField<TRaw>[];
  readonly logger: Logger;
}

/** Writes a value at a dotted path of a plain object (`imageKey.ar`). */
const setPath = (target: Record<string, unknown>, path: string, value: string): void => {
  const parts = path.split('.');
  let node = target;
  parts.slice(0, -1).forEach((part) => {
    const next = node[part];
    node[part] = typeof next === 'object' && next !== null ? { ...next } : {};
    node = node[part] as Record<string, unknown>;
  });
  node[parts[parts.length - 1] ?? path] = value;
};

/**
 * Admin images as file slots (SRV-182): the admin uploads (presign → confirm) and sends the key as
 * before; it is copied onto the record's slot (`catalog/{id}/image`, `banners/{id}/image-{lang}`)
 * and the stored value becomes `<slot>?v=<n>`. Rules run first, so a refused edit copies nothing;
 * the audit keeps the real before/after.
 */
export const withAdminImageSlots = <TRaw extends object>(
  deps: AdminImageSlotsDeps<TRaw>,
): AdminCrudService<TRaw> => {
  const { crud, store, files, fields, logger } = deps;
  const target = (field: AdminImageField<TRaw>, id: string, actor: AdminActor): SlotTarget => ({
    purpose: field.purpose,
    key: field.slotKey(id),
    ownerType: 'ADMIN',
    ownerId: actor.adminId,
  });
  const adminUpload = (upload: { ownerType: string }): boolean => upload.ownerType === 'ADMIN';

  return {
    ...crud,
    async create({ data, reason, actor }) {
      await crud.validate(data);
      const id = newId();
      const prepared: Record<string, unknown> = { ...data, _id: toObjectId(id) };
      const placed: { field: AdminImageField<TRaw>; ref: string }[] = [];
      try {
        for (const field of fields) {
          const value = field.read(data);
          if (value === undefined) continue;
          const ref = await files.replace({
            target: target(field, id, actor),
            current: undefined,
            incoming: value,
            field: field.field,
            accept: adminUpload,
            commit: (stored) => {
              setPath(prepared, field.path, stored);
              return Promise.resolve();
            },
          });
          placed.push({ field, ref });
        }
        return await crud.create({ data: prepared as Partial<TRaw>, reason, actor });
      } catch (error) {
        // The record was not created: its slots go too.
        for (const { field, ref } of placed) {
          await files
            .remove({
              target: target(field, id, actor),
              current: ref,
              commit: () => Promise.resolve(),
            })
            .catch((cause: unknown) => {
              logger.warn({ err: cause }, 'admin image slot of a refused record not removed');
            });
        }
        throw error;
      }
    },
    async update({ id, patch, reason, actor }) {
      const before = await crud.get(id);
      await crud.validate(patch, before);
      // The image fields were written through their slots; the rest goes through the audited update.
      const imageRoots = new Set(fields.map((field) => field.path.split('.')[0] ?? field.path));
      const rest = Object.fromEntries(
        Object.entries(patch as Record<string, unknown>).filter(([name]) => !imageRoots.has(name)),
      );
      for (const field of fields) {
        const value = field.read(patch);
        if (value === undefined) continue;
        await files.replace({
          target: target(field, id, actor),
          current: field.read(before),
          incoming: value,
          field: field.field,
          accept: adminUpload,
          commit: async (stored) => {
            await store.updateById(id, { [field.path]: stored } as Patch<TRaw>);
          },
        });
      }
      return crud.update({ id, patch: rest as Patch<TRaw>, reason, actor, before });
    },
  };
};
