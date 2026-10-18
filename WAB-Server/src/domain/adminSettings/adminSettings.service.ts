import { SETTING_AUDIT } from '../../constants/adminSettings';
import { SETTING_DEFAULTS } from '../../constants/settings';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { AuditLogRaw } from '../../models/auditLog.model';
import type { AuditLogsRepository } from '../../repositories/auditLogs.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import { NotFoundError } from '../../utils/errors';
import type { PaginationParams } from '../../utils/pagination';
import type { AuditWriter } from '../audit/audit.service';
import type { AdminActor } from '../auth/accountLifecycle.service';
import { isSettingKey, SETTING_KEYS, type SettingsService } from '../settings';

export interface SettingRow {
  readonly key: string;
  readonly value: unknown;
  readonly default: unknown;
  readonly isDefault: boolean;
}

export interface AuditLogFilter {
  readonly adminId?: string | undefined;
  readonly action?: string | undefined;
  readonly entityType?: string | undefined;
  readonly entityId?: string | undefined;
  readonly from?: Date | undefined;
  readonly to?: Date | undefined;
}

export interface AdminSettingsService {
  list(): Promise<SettingRow[]>;
  /** Validates, saves everywhere at once and audits the change with before and after. */
  update(input: {
    key: string;
    value: unknown;
    reason: string;
    actor: AdminActor;
  }): Promise<SettingRow>;
  auditLogs(input: {
    filter: AuditLogFilter;
    params: PaginationParams;
  }): Promise<{ items: Entity<AuditLogRaw>[]; total: number }>;
  auditLog(id: string): Promise<Entity<AuditLogRaw>>;
}

export const createAdminSettingsService = (deps: {
  readonly settings: Pick<SettingsService, 'snapshot' | 'get' | 'set'>;
  readonly auditLogs: Pick<AuditLogsRepository, 'findPage' | 'findById'>;
  readonly audit: AuditWriter;
}): AdminSettingsService => {
  const { settings, auditLogs, audit } = deps;
  const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
  const rowOf = (key: keyof typeof SETTING_DEFAULTS, value: unknown): SettingRow => ({
    key,
    value,
    default: SETTING_DEFAULTS[key],
    isDefault: same(value, SETTING_DEFAULTS[key]),
  });

  return {
    async list() {
      const snapshot = await settings.snapshot();
      return SETTING_KEYS.map((key) => rowOf(key, snapshot[key]));
    },

    async update({ key, value, reason, actor }) {
      if (!isSettingKey(key)) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      const before = await settings.get(key);
      const after = await settings.set(key, value);
      await audit.record({
        adminId: actor.adminId,
        action: SETTING_AUDIT.action,
        entityType: SETTING_AUDIT.entityType,
        entityId: key,
        before: { value: before },
        after: { value: after },
        reason,
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
      return rowOf(key, after);
    },

    async auditLogs({ filter, params }) {
      const created =
        filter.from === undefined && filter.to === undefined
          ? {}
          : {
              createdAt: {
                ...(filter.from === undefined ? {} : { $gte: filter.from }),
                ...(filter.to === undefined ? {} : { $lte: filter.to }),
              },
            };
      const page = await auditLogs.findPage(
        {
          ...(filter.adminId === undefined ? {} : { adminId: toObjectId(filter.adminId) }),
          ...(filter.action === undefined ? {} : { action: filter.action }),
          ...(filter.entityType === undefined ? {} : { entityType: filter.entityType }),
          ...(filter.entityId === undefined ? {} : { entityId: filter.entityId }),
          ...created,
        },
        params,
        { createdAt: -1 },
      );
      return { items: page.items, total: page.meta.total };
    },

    async auditLog(id) {
      const found = await auditLogs.findById(id);
      if (found === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      return found;
    },
  };
};
