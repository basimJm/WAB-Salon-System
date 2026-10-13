import { ADMIN_CRUD_VERBS } from '../../constants/adminCrud';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { Page, Patch } from '../../repositories/base.repository';
import type { Entity } from '../../utils/database/plain';
import { NotFoundError } from '../../utils/errors';
import type { PaginationParams } from '../../utils/pagination';
import type { AdminActor } from '../auth/accountLifecycle.service';
import type { AuditWriter } from '../audit/audit.service';

export interface AdminCrudStore<TRaw extends object> {
  create(data: Partial<TRaw>): Promise<Entity<TRaw>>;
  findById(id: string): Promise<Entity<TRaw> | null>;
  updateById(id: string, patch: Patch<TRaw>): Promise<Entity<TRaw> | null>;
  findPage(filter: Record<string, unknown>, params: PaginationParams): Promise<Page<Entity<TRaw>>>;
}

export interface AdminCrudService<TRaw extends object> {
  list(filter: Record<string, unknown>, params: PaginationParams): Promise<Page<Entity<TRaw>>>;
  get(id: string): Promise<Entity<TRaw>>;
  create(input: { data: Partial<TRaw>; reason: string; actor: AdminActor }): Promise<Entity<TRaw>>;
  update(input: {
    id: string;
    patch: Patch<TRaw>;
    reason: string;
    actor: AdminActor;
  }): Promise<Entity<TRaw>>;
}

export interface AdminCrudDeps<TRaw extends object> {
  /** Upper-case name used in audit actions, e.g. `COUNTRY` -> `COUNTRY_CREATE`. */
  readonly name: string;
  readonly entityType: string;
  readonly store: AdminCrudStore<TRaw>;
  readonly audit: AuditWriter;
  /** Rejects data that points at something that does not exist (throws a typed error). */
  readonly checkReferences?: (data: Patch<TRaw>) => Promise<void>;
}

/**
 * Create / read / update for an admin-managed collection. Every write carries a reason and is
 * audited with before/after snapshots (CLAUDE.md §5.12). There is no delete: records are switched
 * off through their `active` flag.
 */
export const createAdminCrud = <TRaw extends object>({
  name,
  entityType,
  store,
  audit,
  checkReferences,
}: AdminCrudDeps<TRaw>): AdminCrudService<TRaw> => {
  const entry = (
    verb: string,
    entityId: string,
    reason: string,
    actor: AdminActor,
    before: unknown,
    after: unknown,
  ): Parameters<AuditWriter['record']>[0] => ({
    adminId: actor.adminId,
    action: `${name}_${verb}`,
    entityType,
    entityId,
    ...(before === undefined ? {} : { before }),
    after,
    reason,
    ip: actor.ip,
    userAgent: actor.userAgent,
  });

  const get = async (id: string): Promise<Entity<TRaw>> => {
    const found = await store.findById(id);
    if (found === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
    return found;
  };

  return {
    list: (filter, params) => store.findPage(filter, params),
    get,
    async create({ data, reason, actor }) {
      await checkReferences?.(data);
      const created = await store.create(data);
      await audit.record(
        entry(ADMIN_CRUD_VERBS.create, created.id, reason, actor, undefined, created),
      );
      return created;
    },
    async update({ id, patch, reason, actor }) {
      const before = await get(id);
      await checkReferences?.(patch);
      const after = await store.updateById(id, patch);
      if (after === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      await audit.record(entry(ADMIN_CRUD_VERBS.update, id, reason, actor, before, after));
      return after;
    },
  };
};
