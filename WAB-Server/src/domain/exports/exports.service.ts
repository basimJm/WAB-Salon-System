import {
  EXPORT_AUDIT,
  EXPORT_JOB_NAME,
  EXPORT_KEY_PREFIX,
  EXPORT_STALE_RUNNING_MS,
  EXPORT_URL_TTL_SEC,
  type ExportFailureCode,
} from '../../constants/exports';
import { ERROR_CODES } from '../../constants/errorCodes';
import type { ExportRaw } from '../../models/export.model';
import type { StorageProvider } from '../../providers/storage';
import type { ExportsRepository } from '../../repositories/exports.repository';
import { toObjectId } from '../../utils/database/ids';
import type { Entity } from '../../utils/database/plain';
import { NotFoundError } from '../../utils/errors';
import type { Logger } from '../../utils/logger';
import type { PaginationParams } from '../../utils/pagination';
import { jobId, type JobScheduler } from '../../jobs/jobs';
import type { AuditWriter } from '../audit/audit.service';
import type { AdminActor } from '../auth/accountLifecycle.service';
import type { ExportRequest } from './exportRequest';
import { TooManyRowsError, type TableBuilders } from './tableBuilders';
import { renderTable } from './writers';

export interface ExportView {
  readonly id: string;
  readonly kind: ExportRaw['kind'];
  readonly format: ExportRaw['format'];
  readonly params: Record<string, unknown>;
  readonly status: ExportRaw['status'];
  readonly rowCount: number | null;
  readonly failure: ExportFailureCode | null;
  readonly createdAt: Date;
  readonly finishedAt: Date | null;
  /** Short-lived download link, only for a DONE export. */
  readonly downloadUrl: string | null;
}

export interface ExportsService {
  request(input: { request: ExportRequest; actor: AdminActor }): Promise<ExportView>;
  list(input: { params: PaginationParams }): Promise<{ items: ExportView[]; total: number }>;
  get(id: string): Promise<ExportView>;
  /** The background run of one export; never throws for a failed export (it is marked FAILED). */
  run(id: string): Promise<void>;
  /** Queues again whatever was left QUEUED or half-run (restart, lost job); resolves to the count. */
  reconcile(): Promise<number>;
}

export interface ExportsDeps {
  readonly exports: ExportsRepository;
  readonly builders: TableBuilders;
  readonly storage: Pick<StorageProvider, 'write' | 'getSignedUrl'>;
  readonly scheduler: Pick<JobScheduler, 'schedule'>;
  readonly audit: AuditWriter;
  readonly logger: Logger;
  readonly now?: () => Date;
}

export const createExportsService = (deps: ExportsDeps): ExportsService => {
  const { exports: store, builders, storage, scheduler, audit, logger } = deps;
  const now = deps.now ?? ((): Date => new Date());

  const view = async (e: Entity<ExportRaw>): Promise<ExportView> => ({
    id: e.id,
    kind: e.kind,
    format: e.format,
    params: e.params,
    status: e.status,
    rowCount: e.rowCount ?? null,
    failure: e.failure ?? null,
    createdAt: e.createdAt,
    finishedAt: e.finishedAt ?? null,
    downloadUrl:
      e.status === 'DONE' && e.fileKey !== undefined
        ? await storage.getSignedUrl({ key: e.fileKey, expiresInSec: EXPORT_URL_TTL_SEC })
        : null,
  });

  const queue = (id: string): Promise<boolean> =>
    scheduler.schedule({
      id: jobId('export', 'run', id),
      name: EXPORT_JOB_NAME,
      data: { exportId: id },
      runAt: now(),
    });

  const fail = async (id: string, failure: ExportFailureCode): Promise<void> => {
    await store.move(id, 'RUNNING', { status: 'FAILED', failure, finishedAt: now() });
  };

  return {
    async request({ request, actor }) {
      const created = await store.create({
        kind: request.kind,
        format: request.format,
        params: request.params,
        status: 'QUEUED',
        requestedBy: toObjectId(actor.adminId),
      });
      await audit.record({
        adminId: actor.adminId,
        action: EXPORT_AUDIT.action,
        entityType: EXPORT_AUDIT.entityType,
        entityId: created.id,
        after: { kind: request.kind, format: request.format, params: request.params },
        reason: EXPORT_AUDIT.reason,
        ip: actor.ip,
        userAgent: actor.userAgent,
      });
      await queue(created.id);
      return view(created);
    },

    async list({ params }) {
      const page = await store.findPage({}, params, { createdAt: -1 });
      return { items: await Promise.all(page.items.map(view)), total: page.meta.total };
    },

    async get(id) {
      const found = await store.findById(id);
      if (found === null) throw new NotFoundError({ code: ERROR_CODES.NOT_FOUND });
      return view(found);
    },

    async run(id) {
      const claimed = await store.move(id, 'QUEUED', { status: 'RUNNING' });
      if (claimed === null) return; // somebody else runs it, or it is done
      try {
        const builder = builders[claimed.kind];
        const table = await builder(claimed.params);
        const file = await renderTable(table, claimed.format);
        const key = `${EXPORT_KEY_PREFIX}/${id}.${file.extension}`;
        await storage.write({
          key,
          body: file.body,
          contentType: file.contentType,
          visibility: 'PRIVATE',
        });
        await store.move(id, 'RUNNING', {
          status: 'DONE',
          fileKey: key,
          rowCount: table.rows.length,
          finishedAt: now(),
        });
      } catch (error) {
        if (error instanceof TooManyRowsError) {
          await fail(id, 'TOO_MANY_ROWS');
          return;
        }
        logger.error({ err: error, exportId: id }, 'export failed');
        await fail(id, 'GENERATION_FAILED');
      }
    },

    async reconcile() {
      const stale = new Date(now().getTime() - EXPORT_STALE_RUNNING_MS);
      const open = await store.unfinished(stale);
      for (const e of open) {
        if (e.status === 'RUNNING') await store.move(e.id, 'RUNNING', { status: 'QUEUED' });
        await queue(e.id);
      }
      return open.length;
    },
  };
};
